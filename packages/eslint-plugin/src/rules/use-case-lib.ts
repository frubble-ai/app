import type { Rule } from "eslint";

// A use case is the only code that receives the context. `use-cases/lib` holds functions that
// take the parts they need (`db`, the Composio client, a config value), so it may neither import
// the context module (`@/use-cases`: TUseCaseContext, defineUseCase) nor call a use case.
const rule: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"use-cases/lib takes parts of the context, never the context or a use case",
		},
		messages: {
			context:
				"use-cases/lib must not import '{{source}}': take the parts you need (db, composio, a config value) as arguments.",
			useCase:
				"use-cases/lib must not call a use case ('{{source}}'): the use case calls lib, not the other way round.",
		},
	},

	create(context) {
		const filename = (context.filename ?? context.getFilename()).replaceAll(
			"\\",
			"/",
		);
		if (!/\/src\/use-cases\/lib\//.test(filename)) return {};

		return {
			ImportDeclaration(node) {
				const source = node.source?.value;
				if (typeof source !== "string") return;
				if (source === "@/use-cases") {
					context.report({ node, messageId: "context", data: { source } });
				} else if (source.startsWith("@/use-cases/cases/")) {
					context.report({ node, messageId: "useCase", data: { source } });
				}
			},
		};
	},
};

export default rule;
