import type { Me } from "@frubble/gql/types";

/** The signed-in user as the schema's `Me`. */
export function mapUserToMe(user: {
	id: string;
	name: string;
	email: string;
}): Me {
	return { id: user.id, name: user.name, email: user.email };
}
