import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const { withoutSuspenseHooks, usedImports } = createRequire(import.meta.url)(
	"../react-apollo-hooks.cjs",
) as {
	withoutSuspenseHooks: (content: string) => string;
	usedImports: (prepend: string[], content: string) => string[];
};

// The shape typescript-react-apollo 5.0.0 writes for one query (`visitor.js`), around a hook it keeps
const GENERATED = `export function useMeQuery(baseOptions?: Apollo.QueryHookOptions<MeQuery, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
// @ts-ignore
export function useMeSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MeQuery, MeQueryVariables>): Apollo.UseSuspenseQueryResult<MeQuery, MeQueryVariables>;
export function useMeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeQuery, MeQueryVariables>): Apollo.UseSuspenseQueryResult<MeQuery | undefined, MeQueryVariables>;
export function useMeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeSuspenseQueryHookResult = ReturnType<typeof useMeSuspenseQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
`;

describe("withoutSuspenseHooks", () => {
	it("drops each suspense hook, its @ts-ignore and its result type, and keeps the rest", () => {
		const content = withoutSuspenseHooks(GENERATED);

		expect(content).not.toContain("SuspenseQuery");
		expect(content).not.toContain("@ts-ignore");
		expect(content).toContain("export function useMeQuery(");
		expect(content).toContain("export function useMeLazyQuery(");
		expect(content).toContain(
			"return Apollo.useLazyQuery<MeQuery, MeQueryVariables>",
		);
		expect(content).toContain(
			"export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;",
		);
		expect(content).toContain(
			"export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;",
		);
	});

	it("drops the last suspense result type when no newline follows it", () => {
		const content = withoutSuspenseHooks(
			"export type MeQueryHookResult = 1;\nexport type MeSuspenseQueryHookResult = 2;",
		);

		expect(content).toBe("export type MeQueryHookResult = 1;\n");
	});

	it("drops the common-types import when nothing uses it", () => {
		const prepend = [
			"import * as ApolloReactCommon from '@apollo/client/react';",
			"import * as ApolloReactHooks from '@apollo/client/react';",
		];

		expect(usedImports(prepend, "const a = 1;")).toEqual([prepend[1]]);
		expect(usedImports(prepend, "type T = ApolloReactCommon.X;")).toEqual(
			prepend,
		);
	});

	it("leaves content with no suspense hooks as it is", () => {
		const plain = "export function useMeQuery() {\n  return 1;\n}\n";

		expect(withoutSuspenseHooks(plain)).toBe(plain);
	});
});
