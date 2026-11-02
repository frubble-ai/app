import { CombinedGraphQLErrors } from "@apollo/client";
import { faker } from "@faker-js/faker";
import { useAuth } from "@frubble/react-sdk";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInScreen } from "@/screens/sign-in";
import {
	generateAuth,
	generatePendingAuth,
	generateSignedOutAuth,
} from "@/testing/generate-auth";
import { renderWithProviders } from "@/testing/testing";

vi.mock("@frubble/react-sdk", async () => import("@/testing/mock-react-sdk"));

function signedOut(signIn = vi.fn().mockResolvedValue({})) {
	vi.mocked(useAuth).mockReturnValue({ ...generateSignedOutAuth(), signIn });
	return signIn;
}

async function submit(email: string, password: string) {
	const user = userEvent.setup();
	await user.type(screen.getByTestId("sign-in-email"), email);
	await user.type(screen.getByTestId("sign-in-password"), password);
	await user.click(screen.getByTestId("sign-in-submit"));
}

describe("SignInScreen", () => {
	beforeEach(() => vi.clearAllMocks());

	it("signs the user in and takes them home", async () => {
		const signIn = signedOut();
		const email = faker.internet.email();
		const password = faker.internet.password();
		renderWithProviders(<SignInScreen />, { path: "/sign-in", routes: ["/"] });

		await submit(email, password);

		await waitFor(() =>
			expect(signIn).toHaveBeenCalledWith({ email, password }),
		);
		expect(await screen.findByTestId("route-/")).toBeInTheDocument();
	});

	it("takes them back to the page they were sent from", async () => {
		signedOut();
		renderWithProviders(<SignInScreen />, {
			path: "/sign-in?from=%2Fsettings",
			routes: ["/settings"],
		});

		await submit(faker.internet.email(), faker.internet.password());

		expect(await screen.findByTestId("route-/settings")).toBeInTheDocument();
	});

	it.each([
		["BAD_USER_INPUT", "auth.errors.invalid"],
		["TOO_MANY_REQUESTS", "auth.errors.tooMany"],
		["INTERNAL_SERVER_ERROR", "auth.errors.generic"],
	])("explains a %s refusal", async (code, key) => {
		signedOut(
			vi.fn().mockRejectedValue(
				new CombinedGraphQLErrors({
					errors: [{ message: faker.lorem.sentence(), extensions: { code } }],
				}),
			),
		);
		renderWithProviders(<SignInScreen />, { path: "/sign-in" });

		await submit(faker.internet.email(), faker.internet.password());

		expect(await screen.findByTestId("sign-in-error")).toHaveTextContent(key);
	});

	it("explains a sign-in that never reached the API", async () => {
		signedOut(vi.fn().mockRejectedValue(new Error("Failed to fetch")));
		renderWithProviders(<SignInScreen />, { path: "/sign-in" });

		await submit(faker.internet.email(), faker.internet.password());

		expect(await screen.findByTestId("sign-in-error")).toHaveTextContent(
			"auth.errors.generic",
		);
	});

	it("sends a user who is already signed in straight on", () => {
		vi.mocked(useAuth).mockReturnValue(generateAuth());

		renderWithProviders(<SignInScreen />, { path: "/sign-in", routes: ["/"] });

		expect(screen.getByTestId("route-/")).toBeInTheDocument();
	});

	it("shows the form while it's still finding out who is signed in", () => {
		vi.mocked(useAuth).mockReturnValue(generatePendingAuth());

		renderWithProviders(<SignInScreen />, { path: "/sign-in" });

		expect(screen.getByTestId("sign-in")).toBeInTheDocument();
	});

	it("says the password changed after a reset, and links to sign-up and the reset", () => {
		signedOut();

		renderWithProviders(<SignInScreen />, { path: "/sign-in?reset=1" });

		expect(screen.getByTestId("sign-in-reset")).toHaveTextContent(
			"auth.signIn.reset",
		);
		expect(screen.getByTestId("sign-in-sign-up")).toHaveAttribute(
			"href",
			"/sign-up",
		);
		expect(screen.getByTestId("sign-in-forgot")).toHaveAttribute(
			"href",
			"/reset-password",
		);
	});
});
