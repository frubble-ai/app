import { useMyOrganizationsQuery } from "@frubble/react-sdk";
import { useState } from "react";
import {
	readCurrentOrganizationId,
	writeCurrentOrganizationId,
} from "@/shared/current-organization";

/** The caller's organizations and the one the page shows: the last chosen, else the first. */
export function useCurrentOrganization() {
	const { data, loading, error, refetch } = useMyOrganizationsQuery();
	const [chosenId, setChosenId] = useState(readCurrentOrganizationId);
	const organizations = data?.myOrganizations ?? [];
	const current =
		organizations.find((entry) => entry.id === chosenId) ?? organizations[0];

	function choose(id: string) {
		writeCurrentOrganizationId(id);
		setChosenId(id);
	}

	return { organizations, current, loading, error, refetch, choose };
}
