import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationPreview } from "@/screens/home/components/integration-preview";
import {
	IntegrationProvider,
	mockOrganizationActions,
} from "@/testing/mock-organization-sdk";
import { renderWithProviders } from "@/testing/testing";

vi.mock("@frubble/react-sdk", async () => import("@/testing/mock-react-sdk"));

describe("IntegrationPreview", () => {
	beforeEach(() => vi.clearAllMocks());

	it("reads through the connection on demand", async () => {
		const { loadPreview } = mockOrganizationActions();
		renderWithProviders(
			<IntegrationPreview
				organizationId="org-1"
				provider={IntegrationProvider.Linear}
			/>,
		);

		await userEvent.click(
			screen.getByTestId("integration-preview-load-linear"),
		);

		expect(loadPreview).toHaveBeenCalledWith({
			variables: {
				input: {
					organizationId: "org-1",
					provider: IntegrationProvider.Linear,
				},
			},
		});
	});

	it("lists what the provider returned", () => {
		mockOrganizationActions({
			integrationPreview: [
				{ id: "C1", name: "general" },
				{ id: "C2", name: "design" },
			],
		});

		renderWithProviders(
			<IntegrationPreview
				organizationId="org-1"
				provider={IntegrationProvider.Slack}
			/>,
		);

		expect(
			screen.getByTestId("integration-preview-items-slack"),
		).toHaveTextContent("generaldesign");
	});
});
