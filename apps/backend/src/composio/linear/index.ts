import { executeTool } from "@/composio/lib/execute-tool";
import type { TRunContext } from "@/composio/lib/run-context";
import type { TLinearTeam } from "@/integrations";
import { typeTeams } from "./lib/output-patch";

/** The Linear teams the connected user can see. */
export async function listLinearTeams(
	run: TRunContext,
): Promise<TLinearTeam[]> {
	const data = await executeTool(run.composio, await run.session(), {
		slug: "LINEAR_LIST_LINEAR_TEAMS",
		arguments: { first: 100 },
		patch: typeTeams,
	});
	return data.teams.map((team) => ({ id: team.id, name: team.name }));
}
