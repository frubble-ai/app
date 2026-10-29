import { basename } from "node:path";
import type { Rule } from "eslint";

function toKebab(str: string): string {
	return str
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();
}

/**
 * Enforces structural conventions from the universal placement rule:
 *
 * a) No bare .tsx/.ts files directly in shared/components/ or shared/hooks/
 *    → must be in a kebab-case folder with index.tsx/index.ts
 *
 * b) Component/hook folders must use index.tsx/index.ts as the main export
 *    → not AuthGuard.tsx inside auth-guard/
 *
 * c) No bare .tsx/.ts files directly in route-scoped components/ or hooks/
 *    → same folder convention as shared
 */
const rule: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Enforce folder structure conventions: components/hooks in folders with index files",
		},
		messages: {
			bareFileInShared:
				"Bare file in shared/{{dir}}/. Wrap in a kebab-case folder: shared/{{dir}}/{{suggestion}}/index.{{ext}}",
			missingIndex:
				"Component folder '{{folder}}/' should use index.{{ext}} as its main export, not '{{filename}}'.",
			bareFileInComponents:
				"Bare file in {{marker}}/. Wrap in a kebab-case folder: {{marker}}/{{suggestion}}/index.{{ext}}",
		},
	},

	create(context) {
		const filename = (context.filename ?? context.getFilename()).replaceAll(
			"\\",
			"/",
		);

		// Only applies to .ts/.tsx source files
		if (!filename.endsWith(".ts") && !filename.endsWith(".tsx")) return {};

		// Skip test and story files
		if (filename.endsWith(".test.ts") || filename.endsWith(".test.tsx"))
			return {};
		if (filename.endsWith(".stories.tsx")) return {};

		// Only applies inside src/
		const srcIndex = filename.lastIndexOf("/src/");
		if (srcIndex === -1) return {};

		const afterSrc = filename.slice(srcIndex + 5); // after /src/
		const segments = afterSrc.split("/");
		const file = segments[segments.length - 1] ?? "";
		const fileBase = basename(file, file.endsWith(".tsx") ? ".tsx" : ".ts");
		const ext = file.endsWith(".tsx") ? "tsx" : "ts";
		const parentDir = segments[segments.length - 2] ?? "";
		const grandparentDir = segments[segments.length - 3] ?? "";

		return {
			Program() {
				// a) Bare files in shared/components/ or shared/hooks/
				if (
					segments.length === 3 &&
					segments[0] === "shared" &&
					(segments[1] === "components" || segments[1] === "hooks")
				) {
					// File is directly in shared/components/ or shared/hooks/ (not in a subfolder)
					if (fileBase !== "index") {
						context.report({
							loc: { line: 1, column: 0 },
							messageId: "bareFileInShared",
							data: {
								dir: segments[1],
								suggestion: toKebab(fileBase),
								ext,
							},
						});
					}
					return;
				}

				// b) Non-index files in component/hook folders
				// If parent is under components/ or hooks/ and file is not index
				if (
					(grandparentDir === "components" || grandparentDir === "hooks") &&
					fileBase !== "index" &&
					file !== "styles.tsx" &&
					file !== "styles.ts"
				) {
					// Check if this looks like the main export (PascalCase matching folder)
					const folderKebab = parentDir;
					const fileKebab = toKebab(fileBase);
					if (
						fileKebab === folderKebab ||
						fileBase.charAt(0) === fileBase.charAt(0).toUpperCase()
					) {
						context.report({
							loc: { line: 1, column: 0 },
							messageId: "missingIndex",
							data: {
								folder: parentDir,
								filename: file,
								ext,
							},
						});
					}
					return;
				}

				// c) Bare files directly in any components/ or hooks/ directory
				if (
					(parentDir === "components" || parentDir === "hooks") &&
					fileBase !== "index"
				) {
					context.report({
						loc: { line: 1, column: 0 },
						messageId: "bareFileInComponents",
						data: {
							marker: parentDir,
							suggestion: toKebab(fileBase),
							ext,
						},
					});
					return;
				}
			},
		};
	},
};

export default rule;
