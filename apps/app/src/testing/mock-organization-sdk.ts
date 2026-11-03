import { faker } from "@faker-js/faker";
import {
	IntegrationProvider,
	OrganizationRole,
	useCreateOrganizationMutation,
	useDisconnectIntegrationMutation,
	useIntegrationPreviewLazyQuery,
	useIntegrationsQuery,
	useInviteOrganizationMemberMutation,
	useMyOrganizationsQuery,
	useOrganizationQuery,
	useStartIntegrationConnectMutation,
} from "@frubble/react-sdk";
import { vi } from "vitest";

// Drives the organization and integration hooks of `@/testing/mock-react-sdk`; call after
// `vi.mock("@frubble/react-sdk", …)`. Each returns the `vi.fn()`s a test asserts on.

export function generateOrganization(role = OrganizationRole.Owner) {
	return {
		id: faker.string.alphanumeric(32),
		name: faker.company.name(),
		role,
	};
}

/** The caller belongs to `organizations`. */
export function mockMyOrganizations(
	organizations: ReturnType<typeof generateOrganization>[],
) {
	const refetch = vi.fn().mockResolvedValue({});
	vi.mocked(useMyOrganizationsQuery).mockReturnValue({
		data: { myOrganizations: organizations },
		loading: false,
		refetch,
	} as never);
	return { refetch };
}

/** The organization has these providers connected, and no members beyond the caller. */
export function mockIntegrations(connected: IntegrationProvider[] = []) {
	const refetch = vi.fn().mockResolvedValue({});
	vi.mocked(useIntegrationsQuery).mockReturnValue({
		data: {
			integrations: connected.map((provider) => ({
				provider,
				connectedAt: new Date().toISOString(),
			})),
		},
		loading: false,
		refetch,
	} as never);
	vi.mocked(useOrganizationQuery).mockReturnValue({
		data: undefined,
		refetch: vi.fn(),
	} as never);
	return { refetch };
}

/** The mutations and the lazy preview, each resolving with `data`. */
export function mockOrganizationActions(
	results: {
		createOrganization?: unknown;
		startIntegrationConnect?: unknown;
		inviteOrganizationMember?: unknown;
		integrationPreview?: Array<{ id: string; name: string }>;
	} = {},
) {
	const createOrganization = vi.fn().mockResolvedValue({
		data: { createOrganization: results.createOrganization },
	});
	const startConnect = vi.fn().mockResolvedValue({
		data: { startIntegrationConnect: results.startIntegrationConnect },
	});
	const disconnect = vi.fn().mockResolvedValue({ data: {} });
	const invite = vi.fn().mockResolvedValue({
		data: { inviteOrganizationMember: results.inviteOrganizationMember },
	});
	const loadPreview = vi.fn();
	vi.mocked(useCreateOrganizationMutation).mockReturnValue([
		createOrganization,
		{ loading: false },
	] as never);
	vi.mocked(useStartIntegrationConnectMutation).mockReturnValue([
		startConnect,
		{ loading: false },
	] as never);
	vi.mocked(useDisconnectIntegrationMutation).mockReturnValue([
		disconnect,
		{ loading: false },
	] as never);
	vi.mocked(useInviteOrganizationMemberMutation).mockReturnValue([
		invite,
		{ loading: false },
	] as never);
	vi.mocked(useIntegrationPreviewLazyQuery).mockReturnValue([
		loadPreview,
		{
			data: results.integrationPreview
				? { integrationPreview: results.integrationPreview }
				: undefined,
			loading: false,
			called: Boolean(results.integrationPreview),
		},
	] as never);
	return { createOrganization, startConnect, disconnect, invite, loadPreview };
}

export { IntegrationProvider, OrganizationRole };
