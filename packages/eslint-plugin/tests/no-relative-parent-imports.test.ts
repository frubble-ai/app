import { describe, expect, it } from "vitest";
import rule from "../src/rules/no-relative-parent-imports.ts";
import { createMockContext } from "./helpers/mock-context.ts";

function lint(
	filename: string,
	importSource: string,
): { messageId: string; data?: Record<string, string> }[] {
	const { context, reports } = createMockContext({ filename });
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

/** `import(source)`, where `source` is the specifier's AST node. */
function lintDynamic(
	filename: string,
	source: unknown,
): { messageId: string; data?: Record<string, string> }[] {
	const { context, reports } = createMockContext({ filename });
	const visitors = rule.create(context);
	(visitors.ImportExpression as ((node: unknown) => void) | undefined)?.({
		type: "ImportExpression",
		source,
	});
	return reports;
}

function literal(value: string) {
	return { type: "Literal", value };
}

function template(cooked: string, expressions: unknown[] = []) {
	return {
		type: "TemplateLiteral",
		quasis: [{ value: { cooked, raw: cooked } }],
		expressions,
	};
}

const BACKEND_FILE =
	"/project/apps/backend/src/use-cases/cases/probe.use-case.ts";

describe("@frubble/no-relative-parent-imports", () => {
	describe("violations in app source files", () => {
		it("reports ../ import in portal app", () => {
			const reports = lint(
				"/project/apps/web/src/app/auth/sign-in/page.tsx",
				"../../shared/components/auth-guard",
			);
			expect(reports).toHaveLength(1);
			expect(reports[0]?.messageId).toBe("noParentImport");
			expect(reports[0]?.data?.source).toBe(
				"../../shared/components/auth-guard",
			);
		});

		it("reports ../ import in native app", () => {
			const reports = lint(
				"/project/apps/mobile/src/screens/home/index.tsx",
				"../sign-in/utils",
			);
			expect(reports).toHaveLength(1);
		});

		it("reports ../ import in api app", () => {
			const reports = lint(
				"/project/apps/backend/src/graphql/auth/resolvers.ts",
				"../../__generated__/resolvers-types",
			);
			expect(reports).toHaveLength(1);
		});
	});

	describe("allowed imports", () => {
		it("allows ./ sibling imports", () => {
			const reports = lint(
				"/project/apps/web/src/app/auth/sign-in/page.tsx",
				"./components/sign-in-content",
			);
			expect(reports).toHaveLength(0);
		});

		it("allows @/ alias imports", () => {
			const reports = lint(
				"/project/apps/web/src/app/auth/sign-in/page.tsx",
				"@/shared/components/auth-guard",
			);
			expect(reports).toHaveLength(0);
		});

		it("allows package imports", () => {
			const reports = lint(
				"/project/apps/web/src/app/page.tsx",
				"@frubble/ui/button",
			);
			expect(reports).toHaveLength(0);
		});
	});

	describe("scope — only app source files", () => {
		it("ignores ../ in packages", () => {
			const reports = lint(
				"/project/packages/sdk/client/src/index.ts",
				"../server/something",
			);
			expect(reports).toHaveLength(0);
		});

		it("ignores files outside apps/", () => {
			const reports = lint("/project/eslint.config.js", "../some-dep");
			expect(reports).toHaveLength(0);
		});
	});
});

describe("@frubble/no-relative-parent-imports with import()", () => {
	it.each([
		["a string", literal("../../composio/lib/client")],
		["a template without expressions", template("../../composio/lib/client")],
	])("reports a ../ import() given as %s", (_, source) => {
		expect(lintDynamic(BACKEND_FILE, source)).toEqual([
			expect.objectContaining({
				messageId: "noParentImport",
				data: { source: "../../composio/lib/client" },
			}),
		]);
	});

	it.each([
		["a ./ string", literal("./lib/client")],
		["an @/ string", literal("@/composio")],
		[
			"a template with an expression",
			template("../", [{ type: "Identifier" }]),
		],
	])("allows %s", (_, source) => {
		expect(lintDynamic(BACKEND_FILE, source)).toEqual([]);
	});

	it("ignores a ../ import() in packages", () => {
		expect(
			lintDynamic("/project/packages/db/src/index.ts", literal("../env")),
		).toEqual([]);
	});
});
