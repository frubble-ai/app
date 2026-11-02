import { UserRole, useAuth } from "@frubble/react-sdk";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignedInLayout from "@/app/(signed-in)/layout";
import {
	generateAuth,
	generatePendingAuth,
	generateSignedOutAuth,
} from "@/testing/generate-auth";
import { renderWithProviders } from "@/testing/testing";

vi.mock("@frubble/react-sdk", async () => import("@/testing/mock-react-sdk"));
vi.mock("@/shared/session", async () => import("@/testing/mock-session"));

/** The layout around a page at `/`, with sign-in beside it. */
function renderLayout() {
	renderWithProviders(
		<SignedInLayout>
			<div data-testid="page" />
		</SignedInLayout>,
		{ routes: ["/sign-in"] },
	);
}

describe("signed-in layout", () => {
	beforeEach(() => vi.clearAllMocks());

	it("shows a customer the page in the app's frame", () => {
		vi.mocked(useAuth).mockReturnValue(generateAuth());

		renderLayout();

		expect(screen.getByTestId("app-shell")).toBeInTheDocument();
		expect(screen.getByTestId("page")).toBeInTheDocument();
	});

	it("sends a signed-out visitor to sign-in", () => {
		vi.mocked(useAuth).mockReturnValue(generateSignedOutAuth());

		renderLayout();

		expect(screen.getByTestId("route-/sign-in")).toBeInTheDocument();
		expect(screen.queryByTestId("page")).not.toBeInTheDocument();
	});

	it("shows the app's frame at once, with a loading state, while it finds out who is signed in", () => {
		vi.mocked(useAuth).mockReturnValue(generatePendingAuth());

		renderLayout();

		expect(screen.getByTestId("app-shell")).toBeInTheDocument();
		expect(screen.getByTestId("loading-state")).toBeInTheDocument();
		expect(screen.queryByTestId("page")).not.toBeInTheDocument();
	});

	it("keeps an admin out", () => {
		vi.mocked(useAuth).mockReturnValue(
			generateAuth({ role: UserRole.SystemAdmin }),
		);

		renderLayout();

		expect(screen.getByTestId("role-fallback")).toBeInTheDocument();
		expect(screen.queryByTestId("page")).not.toBeInTheDocument();
	});
});
