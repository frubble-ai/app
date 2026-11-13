import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MeDocument, SignOutDocument } from "../../../gql/documents";
import { graphqlClient } from "../../../gql/lib/client";
import { clearSession } from "../clear-session";
import { getToken, setToken } from "../token";

vi.mock("../../../gql/lib/client", async () =>
	(await import("../../__mocks__/mock-client")).createMockClient(),
);

describe("clearSession", () => {
	beforeEach(() => vi.clearAllMocks());

	it("forgets the token, signs nobody in, and revokes the server session with the old token", async () => {
		const token = faker.string.alphanumeric(40);
		await setToken(token);

		await clearSession();

		expect(getToken()).toBeNull();
		expect(graphqlClient.cache.writeQuery).toHaveBeenCalledWith({
			query: MeDocument,
			data: { me: null },
		});
		expect(graphqlClient.mutate).toHaveBeenCalledWith({
			mutation: SignOutDocument,
			context: { headers: { Authorization: `Bearer ${token}` } },
		});
	});

	it("forgets the token and the user but leaves the server alone when asked not to revoke", async () => {
		await setToken(faker.string.alphanumeric(40));

		await clearSession({ revoke: false });

		expect(getToken()).toBeNull();
		expect(graphqlClient.cache.writeQuery).toHaveBeenCalledWith({
			query: MeDocument,
			data: { me: null },
		});
		expect(graphqlClient.mutate).not.toHaveBeenCalled();
	});

	it("revokes nothing when no one was signed in", async () => {
		await clearSession();

		expect(graphqlClient.mutate).not.toHaveBeenCalled();
		expect(graphqlClient.cache.writeQuery).toHaveBeenCalled();
	});

	it("only warns when the server can't be told: the device is signed out either way", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const failure = new Error("offline");
		vi.mocked(graphqlClient.mutate).mockRejectedValueOnce(failure);
		await setToken(faker.string.alphanumeric(40));

		await clearSession();
		await vi.waitFor(() =>
			expect(warn).toHaveBeenCalledWith("Server sign-out failed", failure),
		);

		expect(getToken()).toBeNull();
		warn.mockRestore();
	});
});
