import { describe, expect, it } from "vitest";
import rule from "../src/rules/use-case-lib.ts";
import { createMockContext } from "./helpers/mock-context.ts";

function lint(filename: string, importSource: string) {
	const { context, reports } = createMockContext({ filename });
	const visitors = rule.create(context);
	(visitors.ImportDeclaration as ((node: unknown) => void) | undefined)?.({
		type: "ImportDeclaration",
		source: { value: importSource, type: "Literal" },
	});
	return reports;
}

const LIB = "/project/apps/backend/src/use-cases/lib/composio/github/index.ts";
const CASE = "/project/apps/backend/src/use-cases/cases/start.use-case.ts";

describe("@frubble/use-case-lib", () => {
	it("refuses the context module in use-cases/lib", () => {
		expect(lint(LIB, "@/use-cases")).toEqual([
			expect.objectContaining({ messageId: "context" }),
		]);
	});

	it("refuses the context module named by its index file", () => {
		for (const source of ["@/use-cases/index", "@/use-cases/index.ts"]) {
			expect(lint(LIB, source)).toEqual([
				expect.objectContaining({ messageId: "context" }),
			]);
		}
	});

	it("refuses a use case in use-cases/lib", () => {
		expect(lint(LIB, "@/use-cases/cases/sweep.use-case")).toEqual([
			expect.objectContaining({ messageId: "useCase" }),
		]);
	});

	it("allows lib importing lib, and a use case importing anything", () => {
		expect(lint(LIB, "@/use-cases/lib/composio/lib/execute-read")).toEqual([]);
		expect(lint(LIB, "@/composio")).toEqual([]);
		expect(lint(CASE, "@/use-cases")).toEqual([]);
		expect(lint(CASE, "@/use-cases/cases/sweep.use-case")).toEqual([]);
	});
});
