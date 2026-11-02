import { useAuth } from "@frubble/react-sdk";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGuard } from "@/shared/components/auth-guard";
import {
	generateAuth,
	generatePendingAuth,
	generateSignedOutAuth,
} from "@/testing/generate-auth";
import { renderWithProviders } from "@/testing/testing";

vi.mock("@frubble/react-sdk", async () => import("@/testing/mock-react-sdk"));
vi.mock("@/shared/session", async () => import("@/testing/mock-session"));

function renderGuarded(path: string) {
	return renderWithProviders(
		<AuthGuard pending={<div data-testid="pending" />}>
			<div data-testid="guarded" />
		</AuthGuard>,
		{ path, routes: ["/sign-in"] },
	);
}

describe("AuthGuard", () => {
	beforeEach(() => vi.clearAllMocks());

	it("shows the page to a signed-in user", () => {
		vi.mocked(useAuth).mockReturnValue(generateAuth());

		renderGuarded("/");

		expect(screen.getByTestId("guarded")).toBeInTheDocument();
	});

	it("waits while it finds out who is signed in", () => {
		vi.mocked(useAuth).mockReturnValue(generatePendingAuth());

		renderGuarded("/");

		expect(screen.getByTestId("pending")).toBeInTheDocument();
		expect(screen.queryByTestId("guarded")).not.toBeInTheDocument();
	});

	it("sends a signed-out visitor to sign-in, remembering the page they wanted", () => {
		vi.mocked(useAuth).mockReturnValue(generateSignedOutAuth());

		const { location } = renderGuarded("/settings");

		expect(screen.getByTestId("route-/sign-in")).toBeInTheDocument();
		expect(location().search).toBe("?from=%2Fsettings");
	});

	it("sends a signed-out visitor at home to plain sign-in", () => {
		vi.mocked(useAuth).mockReturnValue(generateSignedOutAuth());

		const { location } = renderGuarded("/");

		expect(location().search).toBe("");
	});
});
