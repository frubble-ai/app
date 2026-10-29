import type { Rule } from "eslint";
import folderStructure from "./rules/folder-structure.ts";
import kebabCaseFolders from "./rules/kebab-case-folders.ts";
import noRelativeParentImports from "./rules/no-relative-parent-imports.ts";
import placement from "./rules/placement.ts";

interface FrubblePlugin {
	meta: { name: string; version: string };
	rules: Record<string, Rule.RuleModule>;
	configs: Record<string, unknown>;
}

const plugin: FrubblePlugin = {
	meta: {
		name: "@frubble/eslint-plugin",
		version: "0.0.0",
	},
	rules: {
		placement,
		"folder-structure": folderStructure,
		"kebab-case-folders": kebabCaseFolders,
		"no-relative-parent-imports": noRelativeParentImports,
	},
	configs: {},
};

plugin.configs.recommended = {
	plugins: { "@frubble": plugin },
	rules: {
		"@frubble/placement": "error",
		"@frubble/folder-structure": "error",
		"@frubble/kebab-case-folders": "error",
		"@frubble/no-relative-parent-imports": "error",
	},
};

export default plugin;
