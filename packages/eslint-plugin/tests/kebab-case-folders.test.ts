import { describe, expect, it } from "vitest";
import rule from "../src/rules/kebab-case-folders.ts";
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

describe("@frubble/kebab-case-folders", () => {
	describe("valid folder names", () => {
		it("allows kebab-case folders", () => {
			const reports = lint("/project/apps/web/src/app/auth/sign-in/page.tsx");
			expect(reports).toHaveLength(0);
		});

		it("allows single-word folders", () => {
			const reports = lint(
				"/project/apps/web/src/shared/components/button/index.tsx",
			);
			expect(reports).toHaveLength(0);
		});

		it("allows __tests__ folder", () => {
			const reports = lint(
				"/project/apps/web/src/app/auth/__tests__/auth.test.tsx",
			);
			expect(reports).toHaveLength(0);
		});

		it("allows __mocks__ folder", () => {
			const reports = lint("/project/apps/web/src/app/__mocks__/mock-auth.ts");
			expect(reports).toHaveLength(0);
		});

		it("allows __generated__ folder", () => {
			const reports = lint(
				"/project/apps/backend/src/__generated__/resolvers-types.ts",
			);
			expect(reports).toHaveLength(0);
		});

		it("allows Next.js route groups (parenthesized)", () => {
			const reports = lint("/project/apps/web/src/app/(protected)/page.tsx");
			expect(reports).toHaveLength(0);
		});

		it("allows Next.js dynamic segments [id]", () => {
			const reports = lint("/project/apps/web/src/app/users/[id]/page.tsx");
			expect(reports).toHaveLength(0);
		});

		it("allows Next.js catch-all segments [...slug]", () => {
			const reports = lint("/project/apps/web/src/app/docs/[...slug]/page.tsx");
			expect(reports).toHaveLength(0);
		});

		it("allows Next.js optional catch-all [[...slug]]", () => {
			const reports = lint(
				"/project/apps/web/src/app/docs/[[...slug]]/page.tsx",
			);
			expect(reports).toHaveLength(0);
		});

		it("allows Next.js private folders _components", () => {
			const reports = lint("/project/apps/web/src/app/_components/foo.tsx");
			expect(reports).toHaveLength(0);
		});
	});

	describe("invalid folder names", () => {
		it("reports PascalCase folder", () => {
			const reports = lint("/project/apps/web/src/app/auth/SignIn/page.tsx");
			expect(reports).toHaveLength(1);
			expect(reports[0]?.messageId).toBe("nonKebab");
			expect(reports[0]?.data?.segment).toBe("SignIn");
			expect(reports[0]?.data?.suggestion).toBe("sign-in");
		});

		it("reports camelCase folder", () => {
			const reports = lint(
				"/project/apps/web/src/shared/components/authGuard/index.tsx",
			);
			expect(reports).toHaveLength(1);
			expect(reports[0]?.data?.segment).toBe("authGuard");
			expect(reports[0]?.data?.suggestion).toBe("auth-guard");
		});

		it("reports multiple violations in one path", () => {
			const reports = lint(
				"/project/apps/web/src/app/MyRoute/MyComponent/index.tsx",
			);
			expect(reports).toHaveLength(2);
		});
	});

	describe("scope", () => {
		it("ignores files outside src/", () => {
			const reports = lint("/project/packages/eslint-plugin/README.md");
			expect(reports).toHaveLength(0);
		});
	});
});
