import { faker } from "@faker-js/faker";
import {
	useAuth,
	useGithubRepositoriesLazyQuery,
	useLinearTeamsLazyQuery,
	useSlackChannelsLazyQuery,
} from "@frubble/react-sdk";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeScreen } from "@/screens/home";
import { generateAuth } from "@/testing/generate-auth";
import {
	GithubRepositorySelection,
	generateGithubInstallation,
	generateGithubRepository,
	generateOrganization,
	generateSlackChannel,
	IntegrationProvider,
	mockGithubAppInstallUrl,
	mockGithubInstallations,
	mockIntegrations,
	mockMyOrganizations,
	mockOrganizationActions,
	mockRead,
	OrganizationRole,
} from "@/testing/mock-organization-sdk";
import { renderWithProviders } from "@/testing/testing";

vi.mock("@frubble/react-sdk", async () => import("@/testing/mock-react-sdk"));

describe("HomeScreen", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		vi.mocked(useAuth).mockReturnValue(generateAuth());
		mockIntegrations();
		mockOrganizationActions();
	});

	it("asks a user with no organization to create one, then shows it", async () => {
		const { refetch } = mockMyOrganizations([]);
		const organization = generateOrganization();
		const { createOrganization } = mockOrganizationActions({
			createOrganization: organization,
		});
		renderWithProviders(<HomeScreen />);

		await userEvent.type(
			screen.getByTestId("create-organization-name"),
			organization.name,
		);
		await userEvent.click(screen.getByTestId("create-organization-submit"));

		expect(createOrganization).toHaveBeenCalledWith({
			variables: { input: { name: organization.name } },
		});
		await waitFor(() => expect(refetch).toHaveBeenCalled());
	});

	it("shows each tool's status for the current organization", () => {
		mockMyOrganizations([generateOrganization()]);
		mockIntegrations([IntegrationProvider.Github]);

		renderWithProviders(<HomeScreen />);

		expect(screen.getByTestId("integration-status-github")).toHaveTextContent(
			"home.integrations.connected",
		);
		expect(screen.getByTestId("integration-status-slack")).toHaveTextContent(
			"home.integrations.notConnected",
		);
		expect(screen.getByTestId("github-repositories")).toBeInTheDocument();
		expect(screen.queryByTestId("slack-channels")).toBeNull();
	});

	it("sends an owner to the provider's consent page to connect", async () => {
		const organization = generateOrganization();
		mockMyOrganizations([organization]);
		const redirectUrl = faker.internet.url();
		const { startConnect } = mockOrganizationActions({
			startIntegrationConnect: { redirectUrl },
		});
		const assign = vi.fn();
		vi.stubGlobal("location", { ...window.location, assign });
		renderWithProviders(<HomeScreen />);

		await userEvent.click(screen.getByTestId("integration-connect-slack"));

		expect(startConnect).toHaveBeenCalledWith({
			variables: {
				input: {
					organizationId: organization.id,
					provider: IntegrationProvider.Slack,
				},
			},
		});
		await waitFor(() => expect(assign).toHaveBeenCalledWith(redirectUrl));
		vi.unstubAllGlobals();
	});

	it("offers only the install while Frubble AI is installed nowhere", () => {
		mockMyOrganizations([generateOrganization(OrganizationRole.Member)]);
		mockIntegrations([IntegrationProvider.Github]);
		const installUrl = faker.internet.url();
		mockGithubAppInstallUrl(installUrl);
		mockGithubInstallations([]);

		renderWithProviders(<HomeScreen />);

		expect(screen.getByTestId("github-installations-none")).toHaveTextContent(
			"home.integrations.github.notInstalled",
		);
		expect(screen.getByTestId("github-app-install")).toHaveAttribute(
			"href",
			installUrl,
		);
		expect(screen.queryByTestId("github-repositories-load")).toBeNull();
	});

	it("says where Frubble AI is installed and lists its repositories on demand", async () => {
		const organization = generateOrganization(OrganizationRole.Member);
		mockMyOrganizations([organization]);
		mockIntegrations([IntegrationProvider.Github]);
		const installation = generateGithubInstallation({
			repositories: GithubRepositorySelection.Selected,
		});
		mockGithubInstallations([installation]);
		const repository = generateGithubRepository();
		const load = mockRead(
			useGithubRepositoriesLazyQuery,
			"githubRepositories",
			[repository],
		);
		renderWithProviders(<HomeScreen />);

		expect(screen.getByTestId("github-installations")).toHaveTextContent(
			"home.integrations.github.installedOn",
		);
		expect(screen.getByTestId("github-app-install")).toHaveTextContent(
			"home.integrations.github.change",
		);
		await userEvent.click(screen.getByTestId("github-repositories-load"));

		expect(load).toHaveBeenCalledWith({
			variables: { organizationId: organization.id },
		});
		expect(
			await screen.findByTestId("github-repositories-items"),
		).toHaveTextContent(repository.fullName);
	});

	it("says when an installed Frubble AI reads no repository", async () => {
		mockMyOrganizations([generateOrganization(OrganizationRole.Member)]);
		mockIntegrations([IntegrationProvider.Github]);
		mockGithubInstallations([generateGithubInstallation()]);
		mockRead(useGithubRepositoriesLazyQuery, "githubRepositories", []);
		renderWithProviders(<HomeScreen />);

		await userEvent.click(screen.getByTestId("github-repositories-load"));

		expect(
			await screen.findByTestId("github-repositories-empty"),
		).toBeInTheDocument();
	});

	it("says when listing the repositories fails, and shows no list", () => {
		mockMyOrganizations([generateOrganization(OrganizationRole.Member)]);
		mockIntegrations([IntegrationProvider.Github]);
		mockGithubInstallations([generateGithubInstallation()]);
		vi.mocked(useGithubRepositoriesLazyQuery).mockReturnValue([
			vi.fn(),
			{
				data: undefined,
				loading: false,
				called: true,
				error: new Error(faker.lorem.sentence()),
			},
		] as never);
		renderWithProviders(<HomeScreen />);

		expect(screen.getByTestId("github-repositories-error")).toHaveAttribute(
			"role",
			"alert",
		);
		expect(screen.queryByTestId("github-repositories-items")).toBeNull();
		expect(screen.queryByTestId("github-repositories-empty")).toBeNull();
	});

	it.each([
		{ state: "loading", testId: "github-installations-checking" },
		{ state: "failed", testId: "github-installations-error" },
	] as const)(
		"shows no list while the installation check is $state",
		({ state, testId }) => {
			mockMyOrganizations([generateOrganization(OrganizationRole.Member)]);
			mockIntegrations([IntegrationProvider.Github]);
			mockGithubInstallations(state);

			renderWithProviders(<HomeScreen />);

			expect(screen.getByTestId(testId)).toBeInTheDocument();
			expect(screen.queryByTestId("github-repositories-load")).toBeNull();
		},
	);

	it("lists a connected Linear's teams on demand", async () => {
		const organization = generateOrganization(OrganizationRole.Member);
		mockMyOrganizations([organization]);
		mockIntegrations([IntegrationProvider.Linear]);
		const team = { id: faker.string.uuid(), name: faker.company.name() };
		const load = mockRead(useLinearTeamsLazyQuery, "linearTeams", [team]);
		renderWithProviders(<HomeScreen />);

		expect(screen.queryByTestId("linear-teams-items")).toBeNull();
		await userEvent.click(screen.getByTestId("linear-teams-load"));

		expect(load).toHaveBeenCalledWith({
			variables: { organizationId: organization.id },
		});
		expect(await screen.findByTestId("linear-teams-items")).toHaveTextContent(
			team.name,
		);
	});

	it("says when a connected Linear has no teams", async () => {
		mockMyOrganizations([generateOrganization(OrganizationRole.Member)]);
		mockIntegrations([IntegrationProvider.Linear]);
		mockRead(useLinearTeamsLazyQuery, "linearTeams", []);
		renderWithProviders(<HomeScreen />);

		await userEvent.click(screen.getByTestId("linear-teams-load"));

		expect(await screen.findByTestId("linear-teams-empty")).toBeInTheDocument();
	});

	it("says when reading Linear fails", () => {
		mockMyOrganizations([generateOrganization(OrganizationRole.Member)]);
		mockIntegrations([IntegrationProvider.Linear]);
		vi.mocked(useLinearTeamsLazyQuery).mockReturnValue([
			vi.fn(),
			{
				data: undefined,
				loading: false,
				called: true,
				error: new Error("down"),
			},
		] as never);
		renderWithProviders(<HomeScreen />);

		expect(screen.getByTestId("linear-teams-error")).toBeInTheDocument();
	});

	it("lists a connected Slack's channels on demand", async () => {
		const organization = generateOrganization(OrganizationRole.Member);
		mockMyOrganizations([organization]);
		mockIntegrations([IntegrationProvider.Slack]);
		const channel = generateSlackChannel();
		const load = mockRead(useSlackChannelsLazyQuery, "slackChannels", [
			channel,
		]);
		renderWithProviders(<HomeScreen />);

		expect(screen.queryByTestId("slack-channels-items")).toBeNull();
		await userEvent.click(screen.getByTestId("slack-channels-load"));

		expect(load).toHaveBeenCalledWith({
			variables: { organizationId: organization.id },
		});
		expect(await screen.findByTestId("slack-channels-items")).toHaveTextContent(
			`#${channel.name}`,
		);
	});

	it("gives a plain member no connect or invite controls", () => {
		mockMyOrganizations([generateOrganization(OrganizationRole.Member)]);

		renderWithProviders(<HomeScreen />);

		expect(screen.queryByTestId("integration-connect-github")).toBeNull();
		expect(screen.queryByTestId("invite-member")).toBeNull();
	});

	it("says how the connect attempt went when the API sends the user back", () => {
		mockMyOrganizations([generateOrganization()]);

		renderWithProviders(<HomeScreen />, {
			path: "/?integration=github&integration_status=failed",
		});

		expect(screen.getByTestId("connect-outcome-failed")).toBeInTheDocument();
	});

	it("invites someone by email", async () => {
		const organization = generateOrganization();
		mockMyOrganizations([organization]);
		const { invite } = mockOrganizationActions({
			inviteOrganizationMember: { id: "x" },
		});
		const email = faker.internet.email().toLowerCase();
		renderWithProviders(<HomeScreen />);

		await userEvent.type(screen.getByTestId("invite-member-email"), email);
		await userEvent.click(screen.getByTestId("invite-member-submit"));

		expect(invite).toHaveBeenCalledWith({
			variables: {
				input: { organizationId: organization.id, email, role: "MEMBER" },
			},
		});
		expect(await screen.findByTestId("invite-member-sent")).toBeInTheDocument();
	});
});
