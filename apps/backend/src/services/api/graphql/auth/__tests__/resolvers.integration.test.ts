import { faker } from "@faker-js/faker";
import { UserRole } from "@frubble/gql/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthResolvers } from "@/services/api/graphql/auth";
import { generateAuthSignInResult } from "@/services/api/graphql/auth/__mocks__/generate-auth-sign-in-result";
import { generateSignInInput } from "@/services/api/graphql/auth/__mocks__/generate-sign-in-input";
import { generateSignUpInput } from "@/services/api/graphql/auth/__mocks__/generate-sign-up-input";
import { generateAuthenticatedUser } from "@/shared/__mocks__/generate-authenticated-user";
import { callResolver } from "@/testing/call-resolver";
import { expectGraphqlError } from "@/testing/expect-graphql-error";
import { generateContext } from "@/testing/generate-context";
import { generateResolveInfo } from "@/testing/generate-resolve-info";
import { changePasswordUseCase } from "@/use-cases/cases/change-password.use-case";
import { requestPasswordResetUseCase } from "@/use-cases/cases/request-password-reset.use-case";
import { requestSignUpCodeUseCase } from "@/use-cases/cases/request-sign-up-code.use-case";
import { resetPasswordUseCase } from "@/use-cases/cases/reset-password.use-case";
import { signInWithEmailPasswordUseCase } from "@/use-cases/cases/sign-in-with-email-password.use-case";
import { signOutUseCase } from "@/use-cases/cases/sign-out.use-case";
import {
	SIGN_UP_UNAVAILABLE_MESSAGE,
	signUpWithEmailUseCase,
} from "@/use-cases/cases/sign-up-with-email.use-case";
import {
	badInput,
	forbidden,
	tooManyRequests,
} from "@/use-cases/lib/shared/domain-errors";

vi.mock(
	"@/use-cases/cases/request-sign-up-code.use-case",
	async () =>
		import(
			"@/services/api/graphql/auth/__mocks__/mock-request-sign-up-code-use-case"
		),
);
vi.mock(
	"@/use-cases/cases/request-password-reset.use-case",
	async () =>
		import(
			"@/services/api/graphql/auth/__mocks__/mock-request-password-reset-use-case"
		),
);
vi.mock("@/use-cases/cases/reset-password.use-case", async () => {
	const actual = await vi.importActual<
		typeof import("@/use-cases/cases/reset-password.use-case")
	>("@/use-cases/cases/reset-password.use-case");
	const mock = await import(
		"@/services/api/graphql/auth/__mocks__/mock-reset-password-use-case"
	);
	return { ...actual, ...mock };
});
vi.mock(
	"@/use-cases/cases/change-password.use-case",
	async () =>
		import(
			"@/services/api/graphql/auth/__mocks__/mock-change-password-use-case"
		),
);
vi.mock(
	"@/use-cases/cases/sign-in-with-email-password.use-case",
	async () =>
		import(
			"@/services/api/graphql/auth/__mocks__/mock-sign-in-with-email-password-use-case"
		),
);
vi.mock(
	"@/use-cases/cases/sign-out.use-case",
	async () =>
		import("@/services/api/graphql/auth/__mocks__/mock-sign-out-use-case"),
);
vi.mock("@/use-cases/cases/sign-up-with-email.use-case", async () => {
	const actual = await vi.importActual<
		typeof import("@/use-cases/cases/sign-up-with-email.use-case")
	>("@/use-cases/cases/sign-up-with-email.use-case");
	const mock = await import(
		"@/services/api/graphql/auth/__mocks__/mock-sign-up-with-email-use-case"
	);
	return { ...actual, ...mock };
});

const resolvers = createAuthResolvers();
const info = generateResolveInfo();

beforeEach(() => {
	vi.clearAllMocks();
});

describe("Query.health", () => {
	it("the auth surface reports healthy", () => {
		const resolve = callResolver(resolvers.Query?.health);

		expect(resolve({}, {}, generateContext(), info)).toBe(true);
	});
});

describe("Query.me", () => {
	it("a signed-out caller sees no current user", () => {
		const resolve = callResolver(resolvers.Query?.me);

		expect(resolve({}, {}, generateContext({ user: null }), info)).toBeNull();
	});

	it("a signed-in user sees themself", () => {
		const user = generateAuthenticatedUser();
		const resolve = callResolver(resolvers.Query?.me);

		expect(resolve({}, {}, generateContext({ user }), info)).toEqual({
			id: user.id,
			name: user.name,
			email: user.email,
			role: UserRole.ApplicationUser,
		});
	});
});

describe("Mutation.requestSignUpCode", () => {
	it("asks for a code for the address, with the caller's address for the rate limit", async () => {
		const email = faker.internet.email().toLowerCase();
		const context = generateContext();
		const resolve = callResolver(resolvers.Mutation?.requestSignUpCode);

		const result = await resolve({}, { input: { email } }, context, info);

		expect(requestSignUpCodeUseCase).toHaveBeenCalledWith({
			email,
			clientIp: context.clientIp,
		});
		expect(result).toEqual({ sent: true });
	});

	it("a registered address is refused as forbidden", async () => {
		vi.mocked(requestSignUpCodeUseCase).mockRejectedValue(
			forbidden(SIGN_UP_UNAVAILABLE_MESSAGE),
		);
		const resolve = callResolver(resolvers.Mutation?.requestSignUpCode);

		const error = await expectGraphqlError(
			() =>
				resolve(
					{},
					{ input: { email: faker.internet.email() } },
					generateContext(),
					info,
				),
			"FORBIDDEN",
		);
		expect(error.message).toBe(SIGN_UP_UNAVAILABLE_MESSAGE);
	});
});

describe("Mutation.signUp", () => {
	it("a valid sign-up answers the user and the session token", async () => {
		const signedIn = generateAuthSignInResult();
		vi.mocked(signUpWithEmailUseCase).mockResolvedValue(signedIn);
		const input = generateSignUpInput();
		const context = generateContext();
		const resolve = callResolver(resolvers.Mutation?.signUp);

		const result = await resolve({}, { input }, context, info);

		expect(signUpWithEmailUseCase).toHaveBeenCalledWith({
			...input,
			clientIp: context.clientIp,
		});
		expect(result).toEqual({
			user: { ...signedIn.user, role: UserRole.ApplicationUser },
			token: signedIn.sessionToken,
		});
	});

	it("input missing a field is refused before the use case runs", async () => {
		const resolve = callResolver(resolvers.Mutation?.signUp);

		await expectGraphqlError(
			() =>
				resolve({}, { input: { code: "x" } as never }, generateContext(), info),
			"BAD_USER_INPUT",
		);
		expect(signUpWithEmailUseCase).not.toHaveBeenCalled();
	});

	it("an invalid code reported by the use case is bad input", async () => {
		vi.mocked(signUpWithEmailUseCase).mockRejectedValue(
			badInput("Sign up code is invalid or has expired"),
		);
		const resolve = callResolver(resolvers.Mutation?.signUp);

		await expectGraphqlError(
			() =>
				resolve({}, { input: generateSignUpInput() }, generateContext(), info),
			"BAD_USER_INPUT",
		);
	});
});

describe("Mutation.signIn", () => {
	it("valid credentials answer the user and the session token", async () => {
		const signedIn = generateAuthSignInResult();
		vi.mocked(signInWithEmailPasswordUseCase).mockResolvedValue(signedIn);
		const input = generateSignInInput();
		const context = generateContext();
		const resolve = callResolver(resolvers.Mutation?.signIn);

		const result = await resolve({}, { input }, context, info);

		expect(signInWithEmailPasswordUseCase).toHaveBeenCalledWith({
			...input,
			clientIp: context.clientIp,
		});
		expect(result).toEqual({
			user: { ...signedIn.user, role: UserRole.ApplicationUser },
			token: signedIn.sessionToken,
		});
	});

	it("wrong credentials are bad input, with the use case's wording", async () => {
		vi.mocked(signInWithEmailPasswordUseCase).mockRejectedValue(
			badInput("Wrong email or password."),
		);
		const resolve = callResolver(resolvers.Mutation?.signIn);

		const error = await expectGraphqlError(
			() =>
				resolve({}, { input: generateSignInInput() }, generateContext(), info),
			"BAD_USER_INPUT",
		);
		expect(error.message).toBe("Wrong email or password.");
	});

	it("a rate-limited sign-in answers TOO_MANY_REQUESTS with the wait", async () => {
		vi.mocked(signInWithEmailPasswordUseCase).mockRejectedValue(
			tooManyRequests("Too many attempts.", 60),
		);
		const resolve = callResolver(resolvers.Mutation?.signIn);

		const error = await expectGraphqlError(
			() =>
				resolve({}, { input: generateSignInInput() }, generateContext(), info),
			"TOO_MANY_REQUESTS",
		);
		expect(error.extensions.retryAfterSeconds).toBe(60);
	});
});

describe("Mutation.signOut", () => {
	it("a signed-out caller is refused as unauthenticated", async () => {
		const resolve = callResolver(resolvers.Mutation?.signOut);

		await expectGraphqlError(
			() => resolve({}, {}, generateContext({ user: null }), info),
			"UNAUTHENTICATED",
		);
		expect(signOutUseCase).not.toHaveBeenCalled();
	});

	it("a signed-in caller signs out with their request headers", async () => {
		const user = generateAuthenticatedUser();
		const requestHeaders = new Headers({
			authorization: `Bearer ${faker.string.alphanumeric(24)}`,
		});
		const resolve = callResolver(resolvers.Mutation?.signOut);

		const result = await resolve(
			{},
			{},
			generateContext({ user, requestHeaders }),
			info,
		);

		expect(signOutUseCase).toHaveBeenCalledWith({
			headers: requestHeaders,
			userId: user.id,
		});
		expect(result).toEqual({ signedOut: true });
	});
});

describe("Mutation.requestPasswordReset", () => {
	it("always answers sent, whatever the address", async () => {
		const email = faker.internet.email();
		const context = generateContext();
		const resolve = callResolver(resolvers.Mutation?.requestPasswordReset);

		const result = await resolve({}, { input: { email } }, context, info);

		expect(requestPasswordResetUseCase).toHaveBeenCalledWith({
			email,
			clientIp: context.clientIp,
		});
		expect(result).toEqual({ sent: true });
	});
});

describe("Mutation.resetPassword", () => {
	it("a valid code resets the password", async () => {
		const input = {
			email: faker.internet.email(),
			code: faker.string.numeric(6),
			newPassword: faker.internet.password({ length: 12 }),
		};
		const context = generateContext();
		const resolve = callResolver(resolvers.Mutation?.resetPassword);

		const result = await resolve({}, { input }, context, info);

		expect(resetPasswordUseCase).toHaveBeenCalledWith({
			...input,
			clientIp: context.clientIp,
		});
		expect(result).toEqual({ reset: true });
	});

	it("an invalid code is bad input", async () => {
		vi.mocked(resetPasswordUseCase).mockRejectedValue(
			badInput("Reset code is invalid or has expired"),
		);
		const resolve = callResolver(resolvers.Mutation?.resetPassword);

		await expectGraphqlError(
			() =>
				resolve(
					{},
					{
						input: {
							email: faker.internet.email(),
							code: "000000",
							newPassword: "long-enough-password",
						},
					},
					generateContext(),
					info,
				),
			"BAD_USER_INPUT",
		);
	});
});

describe("Mutation.changePassword", () => {
	const input = {
		currentPassword: "current-password",
		newPassword: "brand-new-password",
	};

	it("a signed-out caller is refused as unauthenticated", async () => {
		const resolve = callResolver(resolvers.Mutation?.changePassword);

		await expectGraphqlError(
			() => resolve({}, { input }, generateContext({ user: null }), info),
			"UNAUTHENTICATED",
		);
		expect(changePasswordUseCase).not.toHaveBeenCalled();
	});

	it("a signed-in user changes their password and gets the replacement token", async () => {
		const user = generateAuthenticatedUser();
		const context = generateContext({ user });
		const token = faker.string.alphanumeric(32);
		vi.mocked(changePasswordUseCase).mockResolvedValue({ token });
		const resolve = callResolver(resolvers.Mutation?.changePassword);

		const result = await resolve({}, { input }, context, info);

		expect(changePasswordUseCase).toHaveBeenCalledWith({
			userId: user.id,
			headers: context.requestHeaders,
			...input,
		});
		expect(result).toEqual({ changed: true, token });
	});

	it("an unexpected failure is rethrown unchanged", async () => {
		const failure = new Error("boom");
		vi.mocked(changePasswordUseCase).mockRejectedValue(failure);
		const resolve = callResolver(resolvers.Mutation?.changePassword);

		await expect(
			resolve(
				{},
				{ input },
				generateContext({ user: generateAuthenticatedUser() }),
				info,
			),
		).rejects.toBe(failure);
	});
});
