import { useAuth } from "@frubble/react-sdk";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeScreen } from "@/screens/home";
import { generateAuth } from "@/testing/generate-auth";
import { renderWithProviders } from "@/testing/testing";

vi.mock("@frubble/react-sdk", async () => import("@/testing/mock-react-sdk"));

describe("HomeScreen", () => {
	beforeEach(() => {
		vi.mocked(useAuth).mockReturnValue(generateAuth());
	});

	it("greets the user", () => {
		const auth = generateAuth();
		vi.mocked(useAuth).mockReturnValue(auth);

		renderWithProviders(<HomeScreen />);

		expect(screen.getByTestId("page-head")).toHaveTextContent("home.title");
	});
});
