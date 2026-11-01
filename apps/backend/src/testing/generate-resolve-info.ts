import type { GraphQLResolveInfo } from "graphql";

/** The resolvers never read `info`; the codegen signature only asks for one. */
export function generateResolveInfo(): GraphQLResolveInfo {
	return {} as GraphQLResolveInfo;
}
