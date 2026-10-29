import type { Rule } from "eslint";

const DEFAULT_GLOBAL_DIRS = ["shared", "testing", "config"];
const DEFAULT_MARKER_DIRS = ["components", "hooks", "__mocks__"];

interface PlacementOptions {
	globalDirs?: string[];
	markerDirs?: string[];
}

/**
 * Enforces the universal placement rule: colocated files can only be imported
 * from within their owning scope. Forces multi-consumer files into shared/.
 *
 * When a file imports via @/:
 * 1. Target in a global dir (shared/, i18n/, etc.) → ALLOW
 * 2. Target path has no marker dir → public API → ALLOW
 * 3. Target inside a marker dir (components/, hooks/, __mocks__/) →
 *    owner = dir above the marker → importer must be under owner
 */
const rule: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Enforce universal placement rule: colocated files can only be imported from their owning scope",
		},
		schema: [
			{
				type: "object",
				properties: {
					globalDirs: {
						type: "array",
						items: { type: "string" },
					},
					markerDirs: {
						type: "array",
						items: { type: "string" },
					},
				},
				additionalProperties: false,
			},
		],
		messages: {
			crossBoundary:
				"Importing from '{{owner}}/' internals. Move target to @/shared/ if it has multiple consumers, or keep this import within '{{owner}}/'.",
		},
	},

	create(context) {
		const filename = (context.filename ?? context.getFilename()).replaceAll(
			"\\",
			"/",
		);

		// Only applies to files inside apps/*/src/
		const appSrcMatch = filename.match(/\/apps\/[^/]+\/src\/(.*)/);
		if (!appSrcMatch) return {};

		const importerRelPath = appSrcMatch[1] ?? "";

		const options = (context.options[0] ?? {}) as PlacementOptions;
		const globalDirs = new Set(options.globalDirs ?? DEFAULT_GLOBAL_DIRS);
		const markerDirs = new Set(options.markerDirs ?? DEFAULT_MARKER_DIRS);

		function checkImport(node: Rule.Node, source: string) {
			// Only check @/ imports
			if (!source.startsWith("@/")) return;

			const targetPath = source.slice(2); // strip @/

			// 1. Global dirs are always accessible
			const firstSegment = targetPath.split("/")[0] ?? "";
			if (globalDirs.has(firstSegment)) return;

			// 2. Find the first marker dir in the target path
			const segments = targetPath.split("/");
			const ownerSegments: string[] = [];
			let foundMarker = false;

			for (const seg of segments) {
				if (markerDirs.has(seg)) {
					foundMarker = true;
					break;
				}
				ownerSegments.push(seg);
			}

			// No marker dir → public API, always allowed
			if (!foundMarker) return;

			// 3. Owner is the path before the marker dir
			const owner = ownerSegments.join("/");

			// Top-level marker (e.g. @/__mocks__/) has no parent → app-wide, always allowed
			if (!owner) return;

			// Importer must be under the owner directory
			if (
				importerRelPath.startsWith(`${owner}/`) ||
				importerRelPath === owner
			) {
				return;
			}

			context.report({
				node,
				messageId: "crossBoundary",
				data: { owner },
			});
		}

		return {
			ImportDeclaration(node) {
				const source = node.source?.value;
				if (typeof source === "string") {
					checkImport(node, source);
				}
			},
			ExportNamedDeclaration(node) {
				const source = (node as unknown as { source?: { value?: string } })
					.source?.value;
				if (typeof source === "string") {
					checkImport(node, source);
				}
			},
			ExportAllDeclaration(node) {
				const source = (node as unknown as { source?: { value?: string } })
					.source?.value;
				if (typeof source === "string") {
					checkImport(node, source);
				}
			},
		};
	},
};

export default rule;
