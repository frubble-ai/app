import { faker } from "@faker-js/faker";
import {
	clearSession,
	clearToken,
	getToken,
	graphqlClient,
	TOKEN_KEY,
} from "@frubble/react-sdk";
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

	describe("another tab signing out", () => {
		/** What the browser sends the other tabs when a tab removes `key` from localStorage. */
		function otherTabRemoves(
			key: string | null,
			storageArea: Storage = window.localStorage,
		) {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key,
					oldValue: faker.string.alphanumeric(40),
					newValue: null,
					storageArea,
				}),
			);
		}

		beforeEach(async () => {
			window.localStorage.setItem(TOKEN_KEY, faker.string.alphanumeric(40));
			await bootSession();
		});

		it.each([
			{ label: "removes the token", key: TOKEN_KEY },
			{ label: "clears the storage", key: null },
		])("signs this tab out when another tab $label", async ({ key }) => {
			otherTabRemoves(key);

			await vi.waitFor(() =>
				expect(clearSession).toHaveBeenCalledWith({ revoke: false }),
			);
			expect(graphqlClient.resetStore).toHaveBeenCalled();
		});

		it("leaves this tab alone when another key goes", () => {
			otherTabRemoves(faker.lorem.word());

			expect(clearSession).not.toHaveBeenCalled();
		});

		it("leaves this tab alone when the removal happens in sessionStorage", () => {
			otherTabRemoves(TOKEN_KEY, window.sessionStorage);

			expect(clearSession).not.toHaveBeenCalled();
		});

		it("leaves a tab that holds no token alone: it has no session to end", async () => {
			await clearToken();

			otherTabRemoves(TOKEN_KEY);

			expect(clearSession).not.toHaveBeenCalled();
		});

		it("leaves this tab alone when another tab signs in", () => {
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: TOKEN_KEY,
					newValue: faker.string.alphanumeric(40),
					storageArea: window.localStorage,
				}),
			);

			expect(clearSession).not.toHaveBeenCalled();
		});

		it("watches once however many times the app boots", async () => {
			await bootSession();

			otherTabRemoves(TOKEN_KEY);

			await vi.waitFor(() => expect(clearSession).toHaveBeenCalledTimes(1));
		});
	});
});
