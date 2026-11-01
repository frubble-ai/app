import type { Resolver, ResolverFn } from "@/__generated__/resolvers-types";

/** Codegen types a resolver as `fn | { resolve: fn }`; this returns the callable. */
export function callResolver<TResult, TParent, TContext, TArgs>(
	resolver: Resolver<TResult, TParent, TContext, TArgs> | undefined,
): ResolverFn<TResult, TParent, TContext, TArgs> {
	if (resolver === undefined) {
		throw new Error("Resolver is undefined");
	}
	if (typeof resolver === "function") {
		return resolver;
	}
	return resolver.resolve;
}
