import type { TComposio } from "@/composio/lib/client";
import { executeTool } from "@/composio/lib/execute-tool";
import type { TSession } from "@/composio/lib/session";
import type { TLinearTeam } from "@/integrations";
import { typeTeams } from "./lib/output-patch";

/** The Linear teams the connected user can see. */
export async function listLinearTeams(
	composio: TComposio,
	session: TSession,
): Promise<TLinearTeam[]> {
	const data = await executeTool(composio, session, {
		slug: "LINEAR_LIST_LINEAR_TEAMS",
		arguments: { first: 100 },
		patch: typeTeams,
	});
	return data.teams.map((team) => ({ id: team.id, name: team.name }));
}
