import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeTypeDefs } from "@graphql-tools/merge";

export {
	dateTimeSchema,
	idSchema,
	userIdSchema,
} from "./lib/scalar-schemas";
export { dateTimeScalar, userIdScalar } from "./lib/scalars";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

export const schemaGlob = path.join(packageRoot, "schema", "**/*.graphql");

/** The API's schema, every `.graphql` file merged. */
export const schemaTypeDefs = mergeTypeDefs(
	loadFilesSync(schemaGlob, { ignoreIndex: true, recursive: true }),
);
