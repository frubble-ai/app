import { faker } from "@faker-js/faker";
import { useAuth } from "@frubble/react-sdk";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordScreen } from "@/screens/reset-password";
import { generateSignedOutAuth } from "@/testing/generate-auth";
import { renderWithProviders } from "@/testing/testing";

vi.mock("@frubble/react-sdk", async () => import("@/testing/mock-react-sdk"));

describe("ResetPasswordScreen", () => {
	beforeEach(() => vi.clearAllMocks());

	it("emails a code, sets the new password with it, then sends the user to sign in", async () => {
		const requestPasswordReset = vi.fn().mockResolvedValue({ sent: true });
		const resetPassword = vi.fn().mockResolvedValue({ reset: true });
		vi.mocked(useAuth).mockReturnValue({
			...generateSignedOutAuth(),
			requestPasswordReset,
			resetPassword,
		} as ReturnType<typeof useAuth>);
		const email = faker.internet.email();
		const code = faker.string.numeric(6);
		const newPassword = faker.internet.password({ length: 12 });
		const { location } = renderWithProviders(<ResetPasswordScreen />, {
			path: "/reset-password",
			routes: ["/sign-in"],
		});
		const user = userEvent.setup();

		await user.type(screen.getByTestId("reset-password-email"), email);
		await user.click(screen.getByTestId("reset-password-send"));

		expect(requestPasswordReset).toHaveBeenCalledWith({ email });
		await user.type(await screen.findByTestId("reset-password-code"), code);
		await user.type(screen.getByTestId("reset-password-password"), newPassword);
		await user.click(screen.getByTestId("reset-password-submit"));

		await waitFor(() =>
			expect(resetPassword).toHaveBeenCalledWith({ email, code, newPassword }),
		);
		expect(await screen.findByTestId("route-/sign-in")).toBeInTheDocument();
		expect(location().search).toBe("?reset=1");
	});
});
