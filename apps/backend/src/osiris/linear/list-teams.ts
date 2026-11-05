import { linearListTeams } from "@frubble-ai/osiris-client";
import type { TLinearTeam } from "@/integrations";
import { answer } from "@/osiris/lib/answer";
import type { TOsiris } from "@/osiris/lib/client";

/** `linear.list_teams`, in our types. */
export async function listLinearTeams(
	osiris: TOsiris,
	accountRef: string,
): Promise<TLinearTeam[]> {
	const { data } = answer(
		await linearListTeams({ client: osiris, path: { id: accountRef } }),
	);
	return data.map((team) => ({ id: team.id, name: team.name }));
}
