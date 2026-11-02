import type { TUserRole } from "@frubble/db";
import { type Me, UserRole } from "@frubble/gql/types";

const ROLE_TO_GQL: Record<TUserRole, UserRole> = {
	application_user: UserRole.ApplicationUser,
};

/** The signed-in user as the schema's `Me`. */
export function mapUserToMe(user: {
	id: string;
	name: string;
	email: string;
	role: TUserRole;
}): Me {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: ROLE_TO_GQL[user.role],
	};
}
