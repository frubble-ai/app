import { useAuth } from "@frubble/react-sdk";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AcceptInvitationPage from "@/app/(signed-in)/invitations/[id]/page";
import HomePage from "@/app/(signed-in)/page";
import ResetPasswordPage from "@/app/reset-password/page";
import SignInPage from "@/app/sign-in/page";
import SignUpPage from "@/app/sign-up/page";
import { generateAuth } from "@/testing/generate-auth";
import { renderWithProviders } from "@/testing/testing";

vi.mock("@frubble/react-sdk", async () => import("@/testing/mock-react-sdk"));
vi.mock("@/shared/session", async () => import("@/testing/mock-session"));
vi.mock("@/screens/sign-in");
vi.mock("@/screens/sign-up");
vi.mock("@/screens/reset-password");
vi.mock("@/screens/home");
vi.mock("@/screens/accept-invitation");

describe("pages", () => {
	beforeEach(() => {
		vi.mocked(useAuth).mockReturnValue(generateAuth());
	});

	it.each([
		["/sign-in", SignInPage, "sign-in-screen"],
		["/sign-up", SignUpPage, "sign-up-screen"],
		["/reset-password", ResetPasswordPage, "reset-password-screen"],
		["/", HomePage, "home-screen"],
		["/invitations/abc", AcceptInvitationPage, "accept-invitation-screen"],
	])("%s renders its screen", (path, Page, testId) => {
		renderWithProviders(<Page />, { path });

		expect(screen.getByTestId(testId)).toBeInTheDocument();
	});
});
