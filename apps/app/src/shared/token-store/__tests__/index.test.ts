import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { browserTokenStore } from "@/shared/token-store";

describe("browserTokenStore", () => {
	it("keeps the token across a reload, until it's deleted", async () => {
		const key = faker.word.noun();
		const token = faker.string.alphanumeric(40);

		await browserTokenStore.setItem(key, token);
		expect(window.localStorage.getItem(key)).toBe(token);
		expect(await browserTokenStore.getItem(key)).toBe(token);

		await browserTokenStore.deleteItem(key);
		expect(await browserTokenStore.getItem(key)).toBeNull();
	});
});
