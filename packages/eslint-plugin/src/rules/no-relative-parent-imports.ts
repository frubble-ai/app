import type { Rule } from "eslint";

// Bans ../ imports in app source files. The @/ alias must be used for
// anything outside the current folder. This ensures the placement rule's
// path-based analysis catches all cross-boundary imports.
// Scope: only app source dirs - packages legitimately use relative imports.
const rule: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description: "Ban ../ imports in app source files — use @/ alias instead",
		},
		messages: {
			noParentImport: "Use @/ instead of relative parent import '{{source}}'.",
		},
	},

	create(context) {
		const filename = (context.filename ?? context.getFilename()).replaceAll(
			"\\",
			"/",
		);

		// Only applies to files inside apps/*/src/
		if (!/\/apps\/[^/]+\/src\//.test(filename)) return {};

		function checkSource(node: Rule.Node, source: string) {
			if (source.startsWith("../")) {
				context.report({
					node,
					messageId: "noParentImport",
					data: { source },
				});
			}
		}

		return {
			ImportDeclaration(node) {
				const source = node.source?.value;
				if (typeof source === "string") {
					checkSource(node, source);
				}
			},
			ExportNamedDeclaration(node) {
				const source = (node as unknown as { source?: { value?: string } })
					.source?.value;
				if (typeof source === "string") {
					checkSource(node, source);
				}
			},
			ExportAllDeclaration(node) {
				const source = (node as unknown as { source?: { value?: string } })
					.source?.value;
				if (typeof source === "string") {
					checkSource(node, source);
				}
			},
		};
	},
};

export default rule;
