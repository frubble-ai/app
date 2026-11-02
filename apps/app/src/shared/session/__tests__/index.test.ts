import { faker } from "@faker-js/faker";
import { clearSession, getToken, graphqlClient } from "@frubble/react-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootSession, endSession } from "@/shared/session";

vi.mock("@frubble/react-sdk", async () => import("@/testing/mock-session-sdk"));

describe("session", () => {
	beforeEach(() => vi.clearAllMocks());

	it("loads the saved session as the user opens the page", async () => {
		const token = faker.string.alphanumeric(40);
		window.localStorage.setItem("frubble_auth_token", token);

		await bootSession();

		expect(getToken()).toBe(token);
	});

	it("ends a session: cleared through the SDK, then the cache forgets the user", async () => {
		await endSession();

		expect(clearSession).toHaveBeenCalled();
		expect(graphqlClient.resetStore).toHaveBeenCalled();
	});
});
