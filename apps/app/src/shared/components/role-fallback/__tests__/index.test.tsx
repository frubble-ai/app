import { UserRole, useAuth } from "@frubble/react-sdk";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleFallback } from "@/shared/components/role-fallback";
import { endSession } from "@/shared/session";
import { generateAuth } from "@/testing/generate-auth";

vi.mock("@frubble/react-sdk", async () => import("@/testing/mock-react-sdk"));
vi.mock("@/shared/session", async () => import("@/testing/mock-session"));

describe("RoleFallback", () => {
	beforeEach(() => vi.clearAllMocks());

	it("lets an admin who signed in here sign out", async () => {
		vi.mocked(useAuth).mockReturnValue(
			generateAuth({ role: UserRole.SystemAdmin }),
		);
		render(<RoleFallback />);

		await userEvent.setup().click(screen.getByTestId("role-fallback-sign-out"));

		expect(screen.getByTestId("role-fallback-email")).toHaveTextContent(
			"layout.roleFallback.description",
		);
		expect(endSession).toHaveBeenCalled();
	});
});
