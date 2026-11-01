import { faker } from "@faker-js/faker";
import { describe, expect, it, vi } from "vitest";
import { createSessionCache } from "@/better-auth/lib/session-cache";

function bearer(token: string): Headers {
	return new Headers({ authorization: `Bearer ${token}` });
}

function generateSession() {
	return { user: { id: faker.string.alphanumeric(32) } };
}

describe("createSessionCache", () => {
	it("looks a bearer token up once and serves it from memory afterwards", async () => {
		const session = generateSession();
		const getSession = vi.fn().mockResolvedValue(session);
		const cache = createSessionCache(getSession);
		const token = faker.string.alphanumeric(40);

		const first = await cache.get(bearer(token));
		const second = await cache.get(bearer(token));

		expect(first).toBe(session);
		expect(second).toBe(session);
		expect(getSession).toHaveBeenCalledTimes(1);
	});

	it("coalesces concurrent misses for the same token into one lookup", async () => {
		const getSession = vi.fn().mockResolvedValue(generateSession());
		const cache = createSessionCache(getSession);
		const token = faker.string.alphanumeric(40);

		await Promise.all([cache.get(bearer(token)), cache.get(bearer(token))]);

		expect(getSession).toHaveBeenCalledTimes(1);
	});

	it("does not cache a miss, so an unknown token is checked every time", async () => {
		const getSession = vi.fn().mockResolvedValue(null);
		const cache = createSessionCache(getSession);
		const token = faker.string.alphanumeric(40);

		await cache.get(bearer(token));
		await cache.get(bearer(token));

		expect(getSession).toHaveBeenCalledTimes(2);
	});

	it("forgets a token on sign-out, so the next request is checked again", async () => {
		const getSession = vi.fn().mockResolvedValue(generateSession());
		const cache = createSessionCache(getSession);
		const token = faker.string.alphanumeric(40);
		await cache.get(bearer(token));

		cache.invalidateByToken(token);
		await cache.get(bearer(token));

		expect(getSession).toHaveBeenCalledTimes(2);
	});

	it("does not keep a session that was signed out while its lookup was in flight", async () => {
		const token = faker.string.alphanumeric(40);
		let resolveLookup: (value: unknown) => void = () => {};
		const getSession = vi.fn().mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveLookup = resolve;
				}),
		);
		const cache = createSessionCache(getSession);

		const pending = cache.get(bearer(token));
		cache.invalidateByToken(token);
		resolveLookup(generateSession());
		await pending;
		getSession.mockResolvedValue(null);

		expect(await cache.get(bearer(token))).toBeNull();
		expect(getSession).toHaveBeenCalledTimes(2);
	});

	it.each([
		{ label: "no header", headers: new Headers() },
		{
			label: "a non-bearer scheme",
			headers: new Headers({ authorization: "Basic abc" }),
		},
		{
			label: "an empty bearer",
			headers: new Headers({ authorization: "Bearer " }),
		},
	])(
		"passes a request with $label straight through, uncached",
		async ({ headers }) => {
			const getSession = vi.fn().mockResolvedValue(null);
			const cache = createSessionCache(getSession);

			await cache.get(headers);
			await cache.get(headers);

			expect(getSession).toHaveBeenCalledTimes(2);
		},
	);
});
