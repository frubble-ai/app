import type { Rule } from "eslint";

// Standard kebab-case: lowercase + digits + hyphens, starts with letter
const KEBAB = /^[a-z][a-z0-9-]*$/;

// Double-underscore conventions: __tests__, __mocks__, __generated__
const DUNDER = /^__[a-z0-9_]+__$/;

// Next.js private folders: _components, _utils
const PRIVATE = /^_[a-z][a-z0-9-]*$/;

// Next.js route groups: (protected), (public), (marketing)
const ROUTE_GROUP = /^\([a-z][a-z0-9-]*\)$/;

// Next.js dynamic segments: [id], [...slug], [[...catchAll]]
const DYNAMIC_SEGMENT = /^\[{1,2}(?:\.{3})?[a-z][a-z0-9-]*\]{1,2}$/;

function isAllowed(segment: string): boolean {
	return (
		KEBAB.test(segment) ||
		DUNDER.test(segment) ||
		PRIVATE.test(segment) ||
		ROUTE_GROUP.test(segment) ||
		DYNAMIC_SEGMENT.test(segment)
	);
}

function toKebab(str: string): string {
	return str
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();
}

/**
 * Enforces kebab-case folder naming under src/.
 * Exceptions for framework conventions: __tests__, __mocks__,
 * Next.js route groups, dynamic segments, and private folders.
 */
const rule: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description: "Folder names under src/ must be kebab-case",
		},
		messages: {
			nonKebab:
				"Folder '{{segment}}' is not kebab-case. Rename to '{{suggestion}}'.",
		},
	},

	create(context) {
		const filename = (context.filename ?? context.getFilename()).replaceAll(
			"\\",
			"/",
		);

		// Find the src/ segment and check all folders after it
		const srcIndex = filename.lastIndexOf("/src/");
		if (srcIndex === -1) return {};

		const afterSrc = filename.slice(srcIndex + 5); // after "/src/"
		const segments = afterSrc.split("/");
		// Drop the last segment (filename itself)
		segments.pop();

		return {
			Program() {
				for (const seg of segments) {
					if (!seg || seg === "." || seg === "") continue;
					if (isAllowed(seg)) continue;

					context.report({
						loc: { line: 1, column: 0 },
						messageId: "nonKebab",
						data: {
							segment: seg,
							suggestion: toKebab(seg),
						},
					});
				}
			},
		};
	},
};

export default rule;
