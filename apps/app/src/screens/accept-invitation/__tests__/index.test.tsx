import { CombinedGraphQLErrors } from "@apollo/client";
import { useAcceptOrganizationInvitationMutation } from "@frubble/react-sdk";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AcceptInvitationScreen } from "@/screens/accept-invitation";
import { readCurrentOrganizationId } from "@/shared/current-organization";
import { renderWithProviders } from "@/testing/testing";

vi.mock("@frubble/react-sdk", async () => import("@/testing/mock-react-sdk"));
vi.mock("next/navigation", async (importOriginal) => ({
	...(await importOriginal<typeof import("next/navigation")>()),
	useParams: vi.fn(),
}));

function accepting(result: Promise<unknown>) {
	const accept = vi.fn().mockReturnValue(result);
	vi.mocked(useAcceptOrganizationInvitationMutation).mockReturnValue([
		accept,
		{ loading: false },
	] as never);
	return accept;
}

describe("AcceptInvitationScreen", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		vi.mocked(useParams).mockReturnValue({ id: "invite-123" });
	});

	it("accepts and lands in the organization", async () => {
		const accept = accepting(
			Promise.resolve({
				data: { acceptOrganizationInvitation: { organizationId: "org-9" } },
			}),
		);
		renderWithProviders(<AcceptInvitationScreen />, {
			path: "/invitations/invite-123",
			routes: ["/"],
		});

		await userEvent.click(screen.getByTestId("accept-invitation-submit"));

		expect(accept).toHaveBeenCalledWith({
			variables: { invitationId: "invite-123" },
		});
		expect(await screen.findByTestId("route-/")).toBeInTheDocument();
		expect(readCurrentOrganizationId()).toBe("org-9");
	});

	it("says when the invitation went to another address", async () => {
		accepting(
			Promise.reject(
				new CombinedGraphQLErrors({
					errors: [{ message: "no", extensions: { code: "FORBIDDEN" } }],
				}),
			),
		);
		renderWithProviders(<AcceptInvitationScreen />, {
			path: "/invitations/invite-123",
		});

		await userEvent.click(screen.getByTestId("accept-invitation-submit"));

		expect(
			await screen.findByTestId("accept-invitation-error"),
		).toHaveTextContent("invitations.errors.notYours");
	});
});
