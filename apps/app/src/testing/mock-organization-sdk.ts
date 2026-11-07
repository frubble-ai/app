import { faker } from "@faker-js/faker";
import {
	GithubAccountType,
	GithubRepositorySelection,
	IntegrationProvider,
	OrganizationRole,
	useCreateOrganizationMutation,
	useDisconnectIntegrationMutation,
	useGithubAppInstallUrlQuery,
	useGithubInstallationsQuery,
	useGithubRepositoriesLazyQuery,
	useIntegrationsQuery,
	useInviteOrganizationMemberMutation,
	useLinearTeamsLazyQuery,
	useMyOrganizationsQuery,
	useOrganizationQuery,
	useSlackChannelsLazyQuery,
	useStartIntegrationConnectMutation,
} from "@frubble/react-sdk";
import { useState } from "react";
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

/** The mutations, each resolving with `data`, and the provider reads, not yet run. */
export function mockOrganizationActions(
	results: {
		createOrganization?: unknown;
		startIntegrationConnect?: unknown;
		inviteOrganizationMember?: unknown;
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
	vi.mocked(useGithubAppInstallUrlQuery).mockReturnValue({
		data: { githubAppInstallUrl: faker.internet.url() },
	} as never);
	vi.mocked(useGithubInstallationsQuery).mockReturnValue({
		data: { githubInstallations: [] },
		loading: false,
	} as never);
	for (const hook of [
		useGithubRepositoriesLazyQuery,
		useLinearTeamsLazyQuery,
		useSlackChannelsLazyQuery,
	]) {
		vi.mocked(hook).mockReturnValue([
			vi.fn(),
			{ data: undefined, loading: false, called: false },
		] as never);
	}
	return { createOrganization, startConnect, disconnect, invite };
}

/**
 * A provider's read: like Apollo, no data until `load` runs; then `data[field]` is `items`.
 * Answers the `load` function a test asserts on.
 */
export function mockRead(
	hook:
		| typeof useGithubRepositoriesLazyQuery
		| typeof useLinearTeamsLazyQuery
		| typeof useSlackChannelsLazyQuery,
	field: string,
	items: unknown[],
) {
	const load = vi.fn();
	vi.mocked(hook).mockImplementation((() => {
		const [data, setData] = useState<Record<string, unknown>>();
		load.mockImplementation(() => setData({ [field]: items }));
		return [load, { data, loading: false, called: Boolean(data) }];
	}) as never);
	return load;
}

/** The read `hook` was asked and failed. */
export function mockReadFailed(
	hook:
		| typeof useGithubRepositoriesLazyQuery
		| typeof useLinearTeamsLazyQuery
		| typeof useSlackChannelsLazyQuery,
) {
	vi.mocked(hook).mockReturnValue([
		vi.fn(),
		{
			data: undefined,
			loading: false,
			called: true,
			error: new Error(faker.lorem.sentence()),
		},
	] as never);
}

/** Our GitHub App installs at `url`; none: the query has not answered, or failed. */
export function mockGithubAppInstallUrl(url: string | undefined) {
	vi.mocked(useGithubAppInstallUrlQuery).mockReturnValue({
		data: url === undefined ? undefined : { githubAppInstallUrl: url },
	} as never);
}

/** Where our GitHub App is installed, as the API gives it. */
export function generateGithubInstallation(
	overrides: Partial<{
		account: string;
		repositories: GithubRepositorySelection;
	}> = {},
) {
	return {
		id: String(faker.number.int({ min: 1, max: 1_000_000_000 })),
		account: faker.internet.username().toLowerCase(),
		accountType: faker.helpers.arrayElement([
			GithubAccountType.User,
			GithubAccountType.Organization,
		]),
		repositories: GithubRepositorySelection.All,
		...overrides,
	};
}

/** A repository our GitHub App reads, as the API gives it. */
export function generateGithubRepository() {
	const fullName = `${faker.internet.username().toLowerCase()}/${faker.lorem.slug(2)}`;
	return {
		id: String(faker.number.int({ min: 1, max: 1_000_000_000 })),
		fullName,
		isPrivate: faker.datatype.boolean(),
		url: `https://github.com/${fullName}`,
		description: faker.helpers.arrayElement([null, faker.lorem.sentence()]),
	};
}

/** Our GitHub App is installed at `installations`, or the check is still running, or failed. */
export function mockGithubInstallations(
	installations:
		| ReturnType<typeof generateGithubInstallation>[]
		| "loading"
		| "failed",
) {
	vi.mocked(useGithubInstallationsQuery).mockReturnValue({
		data: Array.isArray(installations)
			? { githubInstallations: installations }
			: undefined,
		loading: installations === "loading",
		error: installations === "failed" ? new Error("failed") : undefined,
	} as never);
}

export function generateSlackChannel() {
	return {
		id: `C${faker.string.alphanumeric(8).toUpperCase()}`,
		name: faker.lorem.slug(1),
		isPrivate: faker.datatype.boolean(),
		memberCount: faker.number.int({ min: 1, max: 500 }),
	};
}

export { GithubRepositorySelection, IntegrationProvider, OrganizationRole };
