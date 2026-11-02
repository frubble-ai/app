// Codegen plugin: typescript-react-apollo's hooks without its `useXSuspenseQuery` hooks. Against
// Apollo Client 4, their overload signatures don't match their implementation (TS2394, one per
// query, and a TS2769 on the `useSuspenseQuery` call); the plugin (5.0.0, `visitor.js`) emits them
// under one `// @ts-ignore`, which covers only the first overload. The app doesn't use them, and
// the plugin has no option to leave them out (`typings/config.d.ts`; it ships no README or
// CHANGELOG to cite an upstream issue from), so they're dropped here and the rest of the file
// stays type-checked.
const reactApollo = require("@graphql-codegen/typescript-react-apollo");

// One hook as the plugin writes it: its `@ts-ignore`, the overload signatures (one line each,
// ending in `;`) and the implementation, which ends at its closing brace alone on its (indented) line
const SUSPENSE_HOOK =
	/^\/\/ @ts-ignore\n(?:export function use\w+SuspenseQuery\([^\n]*;\n)*export function use\w+SuspenseQuery\([^\n]*\{\n[\s\S]*?\n\s*\}\n/gm;
// Its result type; the file's last line has no newline after it
const SUSPENSE_RESULT =
	/^export type \w+SuspenseQueryHookResult = [^\n]*(?:\n|$)/gm;
// The common-types import, which only the mutation option types use: with none of those generated
// (`withMutationOptionsType: false`) it is unused, and the repository's tsconfig refuses unused names
const UNUSED_COMMON_IMPORT =
	/^import (?:type )?\* as ApolloReactCommon from [^\n]*\n/m;

/** `content` without each suspense hook and its result type. */
function withoutSuspenseHooks(content) {
	return content.replace(SUSPENSE_HOOK, "").replace(SUSPENSE_RESULT, "");
}

/** The plugin's imports (`prepend`), without the common-types one when `content` doesn't use it. */
function usedImports(prepend, content) {
	return content.includes("ApolloReactCommon.")
		? prepend
		: prepend.filter((line) => !UNUSED_COMMON_IMPORT.test(`${line}\n`));
}

async function plugin(schema, documents, config, info) {
	const output = await reactApollo.plugin(schema, documents, config, info);
	const content = withoutSuspenseHooks(output.content);
	return {
		...output,
		prepend: usedImports(output.prepend ?? [], content),
		content,
	};
}

// Plain identifiers only: codegen imports this file as ESM, and Node finds a CommonJS module's
// named exports by parsing this object literal
module.exports = {
	plugin,
	validate: reactApollo.validate,
	withoutSuspenseHooks,
	usedImports,
};
