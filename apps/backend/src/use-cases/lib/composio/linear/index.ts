import type { TComposio } from "@/composio";
import { executeTool } from "@/use-cases/lib/composio/lib/execute-tool";
import type { TSession } from "@/use-cases/lib/composio/lib/session";

/** A Linear team the connected user can see. */
export type TLinearTeam = { id: string; name: string };

/** The Linear teams the connected user can see. */
export async function listLinearTeams(
	composio: TComposio,
	session: TSession,
): Promise<TLinearTeam[]> {
	const data = (await executeTool(composio, session, {
		slug: "LINEAR_LIST_LINEAR_TEAMS",
		arguments: { first: 100 },
	})) as { teams: Array<{ id: string; name: string }> };
	return data.teams.map((team) => ({ id: team.id, name: team.name }));
}
