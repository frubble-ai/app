import { useAuth } from "@frubble/react-sdk";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/shared/components/app-shell";
import { endSession } from "@/shared/session";
import { generateAuth } from "@/testing/generate-auth";
import { renderWithProviders } from "@/testing/testing";

vi.mock("@frubble/react-sdk", async () => import("@/testing/mock-react-sdk"));
vi.mock("@/shared/session", async () => import("@/testing/mock-session"));

function renderShell() {
	const auth = generateAuth();
	vi.mocked(useAuth).mockReturnValue(auth);
	renderWithProviders(
		<AppShell>
			<div data-testid="page" />
		</AppShell>,
	);
	return auth;
}

describe("AppShell", () => {
	beforeEach(() => vi.clearAllMocks());

	it("frames the page and says who is signed in", () => {
		const auth = renderShell();

		expect(screen.getByTestId("page")).toBeInTheDocument();
		expect(screen.getByTestId("app-shell-email")).toHaveTextContent(
			auth.user?.email ?? "",
		);
		expect(screen.getByTestId("app-shell-brand")).toHaveAttribute("href", "/");
	});

	it("signs the user out", async () => {
		renderShell();

		await userEvent.setup().click(screen.getByTestId("app-shell-sign-out"));

		expect(endSession).toHaveBeenCalled();
	});
});
