import { describe, expect, it } from "vitest";
import rule from "../src/rules/placement.ts";
import { createMockContext } from "./helpers/mock-context.ts";

function lint(
	filename: string,
	importSource: string,
	options?: unknown[],
): { messageId: string; data?: Record<string, string> }[] {
	const { context, reports } = createMockContext({
		filename,
		options,
	});

	const visitors = rule.create(context);
	const importNode = {
		type: "ImportDeclaration",
		source: { value: importSource, type: "Literal" },
	};

	if (visitors.ImportDeclaration) {
		(visitors.ImportDeclaration as (node: unknown) => void)(importNode);
	}

	return reports;
}

describe("@frubble/placement", () => {
	describe("global dirs — always allowed", () => {
		it("allows @/shared/ imports from anywhere", () => {
			const reports = lint(
				"/project/apps/web/src/app/auth/sign-in/page.tsx",
				"@/shared/components/auth-guard",
			);
			expect(reports).toHaveLength(0);
		});

		it("allows @/i18n/ imports from anywhere", () => {
			const reports = lint(
				"/project/apps/web/src/app/auth/sign-in/page.tsx",
				"@/i18n/resources/en/common.json",
			);
			expect(reports).toHaveLength(0);
		});

		it("allows @/testing/ imports from anywhere", () => {
			const reports = lint(
				"/project/apps/web/src/app/auth/sign-in/__tests__/test.tsx",
				"@/testing/testing",
			);
			expect(reports).toHaveLength(0);
		});

		it("allows @/config/ imports from anywhere", () => {
			const reports = lint(
				"/project/apps/mobile/src/app/index.tsx",
				"@/config/sdk",
			);
			expect(reports).toHaveLength(0);
		});
	});

	describe("top-level markers — app-wide, always allowed", () => {
		it("allows @/__mocks__/ from anywhere in the app", () => {
			const reports = lint(
				"/project/apps/mobile/src/app/__tests__/index.test.tsx",
				"@/__mocks__/generate-user",
			);
			expect(reports).toHaveLength(0);
		});

		it("allows @/hooks/ from anywhere in the app", () => {
			const reports = lint(
				"/project/apps/web/src/app/auth/sign-in/page.tsx",
				"@/hooks/use-something",
			);
			expect(reports).toHaveLength(0);
		});
	});

	describe("public API — no marker dir in path", () => {
		it("allows importing a top-level module", () => {
			const reports = lint(
				"/project/apps/web/src/app/layout.tsx",
				"@/app/providers",
			);
			expect(reports).toHaveLength(0);
		});

		it("allows importing screens (no marker)", () => {
			const reports = lint(
				"/project/apps/mobile/src/app/index.tsx",
				"@/screens/home",
			);
			expect(reports).toHaveLength(0);
		});
	});

	describe("same scope — allowed", () => {
		it("allows importing colocated components from within the same route", () => {
			const reports = lint(
				"/project/apps/web/src/app/auth/sign-in/page.tsx",
				"@/app/auth/sign-in/components/sign-in-content",
			);
			expect(reports).toHaveLength(0);
		});

		it("allows test files to import colocated mocks", () => {
			const reports = lint(
				"/project/apps/web/src/app/auth/sign-in/__tests__/test.tsx",
				"@/app/auth/sign-in/__mocks__/generate-sign-in-input",
			);
			expect(reports).toHaveLength(0);
		});

		it("allows importing parent-scope mocks from child routes", () => {
			const reports = lint(
				"/project/apps/web/src/app/auth/sign-in/__tests__/test.tsx",
				"@/app/__mocks__/mock-use-auth",
			);
			expect(reports).toHaveLength(0);
		});
	});

	describe("cross-boundary — violations", () => {
		it("reports importing colocated component from a different route", () => {
			const reports = lint(
				"/project/apps/web/src/app/(protected)/page.tsx",
				"@/app/auth/sign-in/components/sign-in-content",
			);
			expect(reports).toHaveLength(1);
			expect(reports[0]?.messageId).toBe("crossBoundary");
			expect(reports[0]?.data?.owner).toBe("app/auth/sign-in");
		});

		it("reports importing sign-up mocks from sign-in tests", () => {
			const reports = lint(
				"/project/apps/web/src/app/auth/sign-in/__tests__/test.tsx",
				"@/app/auth/sign-up/__mocks__/generate-sign-up-input",
			);
			expect(reports).toHaveLength(1);
			expect(reports[0]?.messageId).toBe("crossBoundary");
			expect(reports[0]?.data?.owner).toBe("app/auth/sign-up");
		});

		it("reports importing native screen internals from another screen", () => {
			const reports = lint(
				"/project/apps/mobile/src/screens/sign-in/index.tsx",
				"@/screens/home/hooks/use-home-data",
			);
			expect(reports).toHaveLength(1);
			expect(reports[0]?.messageId).toBe("crossBoundary");
			expect(reports[0]?.data?.owner).toBe("screens/home");
		});

		it("reports importing resolver internals from another domain", () => {
			const reports = lint(
				"/project/apps/backend/src/graphql/onboarding/resolvers.ts",
				"@/graphql/auth/hooks/use-auth-check",
			);
			expect(reports).toHaveLength(1);
			expect(reports[0]?.messageId).toBe("crossBoundary");
			expect(reports[0]?.data?.owner).toBe("graphql/auth");
		});
	});

	describe("scope — only applies to app source", () => {
		it("ignores files outside apps/*/src/", () => {
			const reports = lint(
				"/project/packages/sdk/src/client.ts",
				"@/something/components/foo",
			);
			expect(reports).toHaveLength(0);
		});

		it("ignores non-@/ imports", () => {
			const reports = lint(
				"/project/apps/web/src/app/page.tsx",
				"@frubble/ui/button",
			);
			expect(reports).toHaveLength(0);
		});
	});

	describe("custom config", () => {
		it("respects custom globalDirs", () => {
			const reports = lint(
				"/project/apps/mobile/src/app/index.tsx",
				"@/screens/home/components/helper",
				[{ globalDirs: ["shared", "i18n", "testing", "config", "screens"] }],
			);
			expect(reports).toHaveLength(0);
		});

		it("respects custom markerDirs", () => {
			const reports = lint(
				"/project/apps/backend/src/graphql/onboarding/resolvers.ts",
				"@/graphql/auth/utils/something",
				[{ markerDirs: ["components", "hooks", "__mocks__", "utils"] }],
			);
			expect(reports).toHaveLength(1);
			expect(reports[0]?.data?.owner).toBe("graphql/auth");
		});
	});
});
