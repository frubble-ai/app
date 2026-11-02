// Codegen plugin: re-exports each typed document (`./documents`) under its operation name, the name
// typescript-react-apollo's external document mode imports it by, with the operation types.
module.exports = {
	plugin(_schema, documents) {
		const names = documents
			.flatMap(({ document }) => document?.definitions ?? [])
			.filter((definition) => definition.kind === "OperationDefinition")
			.map((definition) => definition.name.value);
		return [
			'export type * from "./documents";',
			...names.map(
				(name) => `export { ${name}Document as ${name} } from "./documents";`,
			),
			"",
		].join("\n");
	},
};
