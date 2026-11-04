import { faker } from "@faker-js/faker";
import {
	useAuth,
	useGithubOrganizationsLazyQuery,
	useLinearTeamsLazyQuery,
	useSlackChannelsLazyQuery,
} from "@frubble/react-sdk";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeScreen } from "@/screens/home";
import { generateAuth } from "@/testing/generate-auth";
import {
	generateOrganization,
	generateSlackChannel,
	IntegrationProvider,
	mockGithubAppInstallUrl,
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
		expect(screen.getByTestId("github-organizations")).toBeInTheDocument();
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

	it("offers to install the GitHub App on an organization once GitHub is connected", () => {
		mockMyOrganizations([generateOrganization(OrganizationRole.Member)]);
		mockIntegrations([IntegrationProvider.Github]);
		const installUrl = faker.internet.url();
		mockGithubAppInstallUrl(installUrl);

		renderWithProviders(<HomeScreen />);

		expect(screen.getByTestId("github-app-install")).toHaveAttribute(
			"href",
			installUrl,
		);
	});

	it.each([
		{
			label: "says to install the app, with its link",
			installUrl: faker.internet.url(),
			message: "home.integrations.github.emptyInstall",
		},
		{
			label: "stays neutral while the install link is unknown",
			installUrl: undefined,
			message: "home.integrations.github.empty",
		},
	])(
		"when a connected GitHub lists no organization, $label",
		async ({ installUrl, message }) => {
			mockMyOrganizations([generateOrganization(OrganizationRole.Member)]);
			mockIntegrations([IntegrationProvider.Github]);
			mockGithubAppInstallUrl(installUrl);
			mockRead(useGithubOrganizationsLazyQuery, "githubOrganizations", []);
			renderWithProviders(<HomeScreen />);

			await userEvent.click(screen.getByTestId("github-organizations-load"));

			expect(
				await screen.findByTestId("github-organizations-empty"),
			).toHaveTextContent(message);
			expect(screen.queryByTestId("github-app-install") !== null).toBe(
				installUrl !== undefined,
			);
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
