import { dateTimeScalar, schemaTypeDefs, userIdScalar } from "@frubble/gql";
import { GraphQLError } from "graphql";
import { createSchema, createYoga } from "graphql-yoga";
import { ZodError, z } from "zod";
import { createAuthResolvers } from "@/services/api/graphql/auth";
import { ErrorCode, formatZodIssues } from "@/services/api/graphql/lib/errors";
import { createYogaLogger } from "@/services/api/graphql/lib/yoga-logger";
import type { IAuthenticatedUser } from "@/services/api/graphql/shared/lib/guards";
import { loadAuthenticatedUserFromRequestUseCase } from "@/use-cases/cases/load-authenticated-user-from-request.use-case";
import { clientIpFromHeaders } from "@/use-cases/lib/auth/rate-limit";
import { DOMAIN_ERROR_NAMES } from "@/use-cases/lib/shared/domain-errors";

export type TGraphqlContext = {
	user: IAuthenticatedUser | null;
	requestHeaders: Headers;
	/** For the per-IP rate limits; undefined when no proxy set X-Forwarded-For (local). */
	clientIp: string | undefined;
};

/** The GraphQL server. Resolvers only call use cases; the context carries the user and headers. */
export function buildYoga(args: { corsOrigin: string[] }) {
	return createYoga<TGraphqlContext>({
		graphqlEndpoint: "/graphql",
		maskedErrors: {
			maskError: domainErrorMask,
			// Never put the underlying error in a response, whatever NODE_ENV says.
			isDev: false,
		},
		schema: createSchema({
			typeDefs: schemaTypeDefs,
			resolvers: [
				{ DateTime: dateTimeScalar, UserId: userIdScalar },
				createAuthResolvers(),
			],
		}),
		logging: createYogaLogger(),
		cors: {
			origin: args.corsOrigin,
			methods: ["GET", "POST", "OPTIONS"],
			credentials: true,
			allowedHeaders: ["Content-Type", "Authorization"],
		},
		context: async ({ request }) => {
			try {
				const user = await loadAuthenticatedUserFromRequestUseCase({
					headers: request.headers,
				});
				return {
					user,
					requestHeaders: request.headers,
					clientIp: clientIpFromHeaders(request.headers),
				};
			} catch (err) {
				// Envelop replaces a non-GraphQL context error with a new one, losing the original.
				throw domainErrorMask(err, "Unexpected error.");
			}
		},
	});
}

const refusedRequestSchema = z.object({
	name: z.literal("GraphQLError"),
	message: z.string(),
	extensions: z.object({
		code: z.string().optional(),
		http: z.object({ status: z.number().int().min(400).max(499) }),
	}),
});

// The GraphQL error code each domain error (by name) answers with.
const DOMAIN_ERROR_CODES = new Map<string, ErrorCode>([
	[DOMAIN_ERROR_NAMES.BAD_INPUT, ErrorCode.BAD_USER_INPUT],
	[DOMAIN_ERROR_NAMES.NOT_FOUND, ErrorCode.NOT_FOUND],
	[DOMAIN_ERROR_NAMES.UNAUTHENTICATED, ErrorCode.UNAUTHENTICATED],
	[DOMAIN_ERROR_NAMES.FORBIDDEN, ErrorCode.FORBIDDEN],
	[DOMAIN_ERROR_NAMES.TOO_MANY_REQUESTS, ErrorCode.TOO_MANY_REQUESTS],
	[DOMAIN_ERROR_NAMES.INTERNAL, ErrorCode.INTERNAL_SERVER_ERROR],
]);

function unwrapOriginal(error: unknown): unknown {
	return error instanceof Error && "originalError" in error
		? ((error as { originalError?: unknown }).originalError ?? error)
		: error;
}

function domainErrorExtensions(error: Error): Record<string, unknown> {
	const details = (error as { details?: unknown }).details;
	return typeof details === "object" && details !== null
		? (details as Record<string, unknown>)
		: {};
}

/** Turns use-case domain errors into GraphQL error codes. Untagged errors become a redacted 500. */
export function domainErrorMask(error: unknown, message: string): GraphQLError {
	// A request Yoga refused before running it (malformed JSON, a bad content type) keeps its 4xx.
	// Matched by shape: Yoga may load another build of `graphql`, and then `instanceof` is false.
	const refused = refusedRequestSchema.safeParse(error);
	if (refused.success) {
		const { extensions } = refused.data;
		return new GraphQLError(refused.data.message, {
			extensions: {
				code: extensions.code,
				http: { status: extensions.http.status },
			},
		});
	}

	// graphql-js wraps every resolver throw in a located GraphQLError; pass it through only when it
	// does not wrap a domain error (a thrown GraphQLError already carries its own extensions).
	if (
		error instanceof GraphQLError &&
		(!error.originalError || error.originalError instanceof GraphQLError)
	) {
		return error;
	}

	const original = unwrapOriginal(error);
	const originalError = original instanceof Error ? original : undefined;

	if (original instanceof ZodError) {
		return new GraphQLError(formatZodIssues(original), {
			extensions: { code: ErrorCode.BAD_USER_INPUT },
			originalError,
		});
	}

	const code = originalError && DOMAIN_ERROR_CODES.get(originalError.name);
	if (originalError && code) {
		return new GraphQLError(originalError.message, {
			extensions: { ...domainErrorExtensions(originalError), code },
			originalError,
		});
	}

	return new GraphQLError(message, {
		extensions: { code: ErrorCode.INTERNAL_SERVER_ERROR },
		originalError,
	});
}
