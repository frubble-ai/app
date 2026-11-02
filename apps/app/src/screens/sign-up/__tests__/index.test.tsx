import { CombinedGraphQLErrors } from "@apollo/client";
import { faker } from "@faker-js/faker";
import { useAuth } from "@frubble/react-sdk";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignUpScreen } from "@/screens/sign-up";
import { generateAuth, generateSignedOutAuth } from "@/testing/generate-auth";
import { renderWithProviders } from "@/testing/testing";

vi.mock("@frubble/react-sdk", async () => import("@/testing/mock-react-sdk"));

function signedOut(
	actions: { requestSignUpCode?: unknown; signUp?: unknown } = {},
) {
	const requestSignUpCode = vi.fn().mockResolvedValue({ sent: true });
	const signUp = vi.fn().mockResolvedValue({});
	vi.mocked(useAuth).mockReturnValue({
		...generateSignedOutAuth(),
		requestSignUpCode,
		signUp,
		...actions,
	} as ReturnType<typeof useAuth>);
	return { requestSignUpCode, signUp };
}

async function requestCode(email: string) {
	const user = userEvent.setup();
	await user.type(screen.getByTestId("sign-up-email"), email);
	await user.click(screen.getByTestId("sign-up-send"));
	return user;
}

describe("SignUpScreen", () => {
	beforeEach(() => vi.clearAllMocks());

	it("emails a code, then creates the account with it and goes home", async () => {
		const { requestSignUpCode, signUp } = signedOut();
		const email = faker.internet.email();
		const code = faker.string.numeric(6);
		const name = faker.person.fullName();
		const password = faker.internet.password({ length: 12 });
		renderWithProviders(<SignUpScreen />, { path: "/sign-up", routes: ["/"] });

		const user = await requestCode(email);

		expect(requestSignUpCode).toHaveBeenCalledWith({ email });
		expect(await screen.findByTestId("sign-up-sent")).toHaveTextContent(
			"auth.signUp.sent",
		);
		await user.type(screen.getByTestId("sign-up-code"), code);
		await user.type(screen.getByTestId("sign-up-name"), name);
		await user.type(screen.getByTestId("sign-up-password"), password);
		await user.click(screen.getByTestId("sign-up-submit"));

		await waitFor(() =>
			expect(signUp).toHaveBeenCalledWith({ email, code, name, password }),
		);
		expect(await screen.findByTestId("route-/")).toBeInTheDocument();
	});

	it("shows the API's reason when the code is refused", async () => {
		const message = faker.lorem.sentence();
		signedOut({
			signUp: vi.fn().mockRejectedValue(
				new CombinedGraphQLErrors({
					errors: [{ message, extensions: { code: "BAD_USER_INPUT" } }],
				}),
			),
		});
		renderWithProviders(<SignUpScreen />, { path: "/sign-up" });

		const user = await requestCode(faker.internet.email());
		await user.type(await screen.findByTestId("sign-up-code"), "000000");
		await user.type(
			screen.getByTestId("sign-up-name"),
			faker.person.fullName(),
		);
		await user.type(
			screen.getByTestId("sign-up-password"),
			faker.internet.password({ length: 12 }),
		);
		await user.click(screen.getByTestId("sign-up-submit"));

		expect(await screen.findByTestId("sign-up-error")).toHaveTextContent(
			message,
		);
	});

	it("explains a rate limit on the code request", async () => {
		signedOut({
			requestSignUpCode: vi.fn().mockRejectedValue(
				new CombinedGraphQLErrors({
					errors: [
						{
							message: faker.lorem.sentence(),
							extensions: { code: "TOO_MANY_REQUESTS" },
						},
					],
				}),
			),
		});
		renderWithProviders(<SignUpScreen />, { path: "/sign-up" });

		await requestCode(faker.internet.email());

		expect(await screen.findByTestId("sign-up-error")).toHaveTextContent(
			"auth.errors.tooMany",
		);
		expect(screen.getByTestId("sign-up-email-step")).toBeInTheDocument();
	});

	it("goes back to the email step to use another address", async () => {
		signedOut();
		renderWithProviders(<SignUpScreen />, { path: "/sign-up" });

		const user = await requestCode(faker.internet.email());
		await user.click(
			await screen.findByRole("button", { name: "auth.signUp.changeEmail" }),
		);

		expect(screen.getByTestId("sign-up-email-step")).toBeInTheDocument();
	});

	it("sends a user who is already signed in home", () => {
		vi.mocked(useAuth).mockReturnValue(generateAuth());

		renderWithProviders(<SignUpScreen />, { path: "/sign-up", routes: ["/"] });

		expect(screen.getByTestId("route-/")).toBeInTheDocument();
	});
});
