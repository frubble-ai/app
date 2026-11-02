import {
	ErrorCode,
	throwGraphQLError,
} from "@/services/api/graphql/lib/errors";

/** The signed-in user on the GraphQL context. */
export interface IAuthenticatedUser {
	id: string;
	name: string;
	email: string;
}

/** Gate a resolver on a session: UNAUTHENTICATED without one, else `context.user` is narrowed. */
export function requireAuth<
	TResult,
	TParent,
	TContext extends { user: IAuthenticatedUser | null },
	TArgs,
>(
	resolver: (
		parent: TParent,
		args: TArgs,
		context: TContext & { user: IAuthenticatedUser },
		info: unknown,
	) => TResult,
) {
	return (
		parent: TParent,
		args: TArgs,
		context: TContext,
		info: unknown,
	): TResult => {
		if (!context.user) {
			throwGraphQLError(ErrorCode.UNAUTHENTICATED, "Authentication required");
		}
		return resolver(
			parent,
			args,
			context as TContext & { user: IAuthenticatedUser },
			info,
		);
	};
}
