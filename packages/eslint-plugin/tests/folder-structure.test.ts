import { describe, expect, it } from "vitest";
import rule from "../src/rules/folder-structure.ts";
import { createMockContext } from "./helpers/mock-context.ts";

function lint(filename: string): {
	messageId: string;
	data?: Record<string, string>;
}[] {
	const { context, reports } = createMockContext({ filename });
	const visitors = rule.create(context);

	if (visitors.Program) {
		(visitors.Program as (node: unknown) => void)({ type: "Program" });
	}

	return reports;
}

describe("@frubble/folder-structure", () => {
	describe("bare files in shared/components/", () => {
		it("reports bare .tsx file in shared/components/", () => {
			const reports = lint(
				"/project/apps/web/src/shared/components/AuthGuard.tsx",
			);
			expect(reports).toHaveLength(1);
			expect(reports[0]?.messageId).toBe("bareFileInShared");
			expect(reports[0]?.data?.suggestion).toBe("auth-guard");
		});

		it("reports bare .ts file in shared/hooks/", () => {
			const reports = lint("/project/apps/web/src/shared/hooks/useAuth.ts");
			expect(reports).toHaveLength(1);
			expect(reports[0]?.messageId).toBe("bareFileInShared");
			expect(reports[0]?.data?.suggestion).toBe("use-auth");
		});

		it("allows index.tsx in shared/components/", () => {
			// This would be unusual but shouldn't fire bareFileInShared
			const reports = lint("/project/apps/web/src/shared/components/index.tsx");
			expect(reports).toHaveLength(0);
		});

		it("allows properly nested component in shared/components/", () => {
			const reports = lint(
				"/project/apps/web/src/shared/components/auth-guard/index.tsx",
			);
			expect(reports).toHaveLength(0);
		});
	});

	describe("non-index files in component folders", () => {
		it("reports PascalCase file instead of index.tsx in component folder", () => {
			const reports = lint(
				"/project/apps/web/src/shared/components/auth-guard/AuthGuard.tsx",
			);
			expect(reports).toHaveLength(1);
			expect(reports[0]?.messageId).toBe("missingIndex");
			expect(reports[0]?.data?.folder).toBe("auth-guard");
			expect(reports[0]?.data?.filename).toBe("AuthGuard.tsx");
		});

		it("allows index.tsx in component folder", () => {
			const reports = lint(
				"/project/apps/web/src/shared/components/auth-guard/index.tsx",
			);
			expect(reports).toHaveLength(0);
		});

		it("allows styles.tsx in component folder", () => {
			const reports = lint(
				"/project/apps/web/src/shared/components/auth-guard/styles.tsx",
			);
			expect(reports).toHaveLength(0);
		});
	});

	describe("bare files in route-scoped components/", () => {
		it("reports bare file in route components/", () => {
			const reports = lint(
				"/project/apps/web/src/app/auth/sign-in/components/SignInContent.tsx",
			);
			expect(reports).toHaveLength(1);
			expect(reports[0]?.messageId).toBe("bareFileInComponents");
			expect(reports[0]?.data?.suggestion).toBe("sign-in-content");
		});

		it("allows properly nested component in route components/", () => {
			const reports = lint(
				"/project/apps/web/src/app/auth/sign-in/components/sign-in-content/index.tsx",
			);
			expect(reports).toHaveLength(0);
		});
	});

	describe("scope", () => {
		it("ignores files outside src/", () => {
			const reports = lint("/project/packages/eslint-plugin/src/index.ts");
			expect(reports).toHaveLength(0);
		});

		it("ignores test files", () => {
			const reports = lint(
				"/project/apps/web/src/shared/components/AuthGuard.test.tsx",
			);
			expect(reports).toHaveLength(0);
		});

		it("ignores non-ts/tsx files", () => {
			const reports = lint(
				"/project/apps/web/src/shared/components/styles.css",
			);
			expect(reports).toHaveLength(0);
		});
	});
});
