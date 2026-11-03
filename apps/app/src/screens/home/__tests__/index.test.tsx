import { faker } from "@faker-js/faker";
import { useAuth, useIntegrationPreviewLazyQuery } from "@frubble/react-sdk";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeScreen } from "@/screens/home";
import { generateAuth } from "@/testing/generate-auth";
import {
	generateOrganization,
	IntegrationProvider,
	mockIntegrations,
	mockMyOrganizations,
	mockOrganizationActions,
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
		expect(
			screen.getByTestId("integration-preview-github"),
		).toBeInTheDocument();
		expect(screen.queryByTestId("integration-preview-slack")).toBeNull();
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

	it("reads through a connected tool on demand and lists what it returned", async () => {
		const organization = generateOrganization(OrganizationRole.Member);
		mockMyOrganizations([organization]);
		mockIntegrations([IntegrationProvider.Slack]);
		const items = [
			{ id: "C1", name: "general" },
			{ id: "C2", name: "design" },
		];
		const loadPreview = vi.fn();
		// Like Apollo: no data until the query has been run.
		vi.mocked(useIntegrationPreviewLazyQuery).mockImplementation(() => {
			const [data, setData] = useState<{ integrationPreview: typeof items }>();
			loadPreview.mockImplementation(() =>
				setData({ integrationPreview: items }),
			);
			return [
				loadPreview,
				{ data, loading: false, called: Boolean(data) },
			] as never;
		});
		renderWithProviders(<HomeScreen />);

		expect(screen.queryByTestId("integration-preview-items-slack")).toBeNull();
		await userEvent.click(screen.getByTestId("integration-preview-load-slack"));

		expect(loadPreview).toHaveBeenCalledWith({
			variables: {
				input: {
					organizationId: organization.id,
					provider: IntegrationProvider.Slack,
				},
			},
		});
		expect(
			await screen.findByTestId("integration-preview-items-slack"),
		).toHaveTextContent("generaldesign");
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
