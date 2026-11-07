import type { TSchemaPatch } from "../composio/lib/output-schema.ts";
import { typeTeams } from "../composio/linear/lib/output-patch.ts";

// What codegen/composio-tools.ts reads. It runs under Node, which knows no `@/` alias, so this
// folder imports by relative path and ESLint leaves it out.

/**
 * Every Composio tool the backend runs, with the patch its output schema needs, or none. The
 * runtime check applies the patch, and codegen/composio-tools.ts generates each tool's `data`
 * type from the same patched schema, so a tool is named here and nowhere else.
 */
export const COMPOSIO_TOOLS = {
	LINEAR_LIST_LINEAR_TEAMS: typeTeams,
	SLACK_LIST_ALL_CHANNELS: undefined,
} satisfies Record<string, TSchemaPatch | undefined>;
