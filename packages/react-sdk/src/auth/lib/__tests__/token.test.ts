import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockTokenStore } from "../../__mocks__/mock-token-store";

type TTokenModule = typeof import("../token");

const TOKEN_KEY = "frubble_auth_token";

describe("token", () => {
	let token: TTokenModule;

	beforeEach(async () => {
		vi.resetModules();
		token = await import("../token");
	});

	describe("with a store", () => {
		let store: ReturnType<typeof createMockTokenStore>;

		beforeEach(() => {
			store = createMockTokenStore();
			token.configureTokenStore(store);
		});

		it("setToken holds the token in memory and persists it", async () => {
			const value = faker.string.alphanumeric(40);
			await token.setToken(value);
			expect(token.getToken()).toBe(value);
			expect(store.setItem).toHaveBeenCalledWith(TOKEN_KEY, value);
		});

		it("getToken reads memory, not the store", async () => {
			await token.setToken(faker.string.alphanumeric(40));
			token.getToken();
			expect(store.getItem).not.toHaveBeenCalled();
		});

		it("clearToken forgets the token and deletes it from the store", async () => {
			await token.setToken(faker.string.alphanumeric(40));
			await token.clearToken();
			expect(token.getToken()).toBeNull();
			expect(store.deleteItem).toHaveBeenCalledWith(TOKEN_KEY);
		});

		it("loadToken loads the persisted token into memory", async () => {
			const value = faker.string.alphanumeric(40);
			store.items.set(TOKEN_KEY, value);
			await token.loadToken();
			expect(token.getToken()).toBe(value);
		});

		it("keeps the token in memory when the store fails", async () => {
			vi.mocked(store.setItem).mockRejectedValueOnce(new Error("locked"));
			const value = faker.string.alphanumeric(40);
			await expect(token.setToken(value)).resolves.toBeUndefined();
			expect(token.getToken()).toBe(value);
		});
	});

	describe("without a store", () => {
		it("getToken is null before any token is set", () => {
			expect(token.getToken()).toBeNull();
		});

		it("holds the token in memory only", async () => {
			const value = faker.string.alphanumeric(40);
			await token.setToken(value);
			await token.loadToken();
			expect(token.getToken()).toBe(value);
			await token.clearToken();
			expect(token.getToken()).toBeNull();
		});
	});
});
