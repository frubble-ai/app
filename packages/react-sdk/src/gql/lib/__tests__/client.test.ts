import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getToken } from "../../../auth/lib/token";
import {
	answerFetch,
	graphqlCodeError,
	mockFetch,
	sentHeaders,
} from "../../__mocks__/mock-fetch";
import { MeDocument, SignOutDocument } from "../../documents";
import { configureGraphql, graphqlClient } from "../client";

vi.mock("../../../auth/lib/token", async () =>
	(await import("../../../auth/__mocks__/mock-token")).createMockToken(),
);
vi.stubGlobal("fetch", mockFetch);

const endpoint = "http://api.test/graphql";
const unauthenticated = graphqlCodeError("Sign in", "UNAUTHENTICATED");

describe("graphqlClient", () => {
	const onUnauthenticated = vi.fn();

	beforeEach(async () => {
		mockFetch.mockReset();
		onUnauthenticated.mockReset();
		vi.mocked(getToken).mockReturnValue(null);
		configureGraphql({ endpoint, onUnauthenticated });
		await graphqlClient.clearStore();
	});

	it("sends the session token to the configured endpoint", async () => {
		const token = faker.string.alphanumeric(40);
		vi.mocked(getToken).mockReturnValue(token);
		answerFetch({ data: { me: null } });

		await graphqlClient.query({ query: MeDocument });

		expect(mockFetch.mock.calls[0]?.[0]).toBe(endpoint);
		expect(sentHeaders()).toMatchObject({ authorization: `Bearer ${token}` });
	});

	it("keeps a caller's own authorization when no session is held", async () => {
		answerFetch({ data: { signOut: { signedOut: true } } });

		await graphqlClient.mutate({
			mutation: SignOutDocument,
			context: { headers: { Authorization: "Bearer old" } },
		});

		expect(sentHeaders().authorization).toBe("Bearer old");
		expect(onUnauthenticated).not.toHaveBeenCalled();
	});

	it("ends the session when the API refuses the token it was sent", async () => {
		vi.mocked(getToken).mockReturnValue(faker.string.alphanumeric(40));
		answerFetch(unauthenticated);

		await expect(graphqlClient.query({ query: MeDocument })).rejects.toThrow(
			"Sign in",
		);

		expect(onUnauthenticated).toHaveBeenCalledOnce();
	});

	it("leaves a newer session alone when a request sent with the old token is refused", async () => {
		const oldToken = faker.string.alphanumeric(40);
		vi.mocked(getToken).mockReturnValue(oldToken);
		mockFetch.mockImplementationOnce(async () => {
			// Signed in again while the request was out
			vi.mocked(getToken).mockReturnValue(faker.string.alphanumeric(40));
			return {
				ok: true,
				status: 200,
				headers: { get: () => "application/json" },
				text: async () => JSON.stringify(unauthenticated),
			};
		});

		await expect(graphqlClient.query({ query: MeDocument })).rejects.toThrow();

		expect(onUnauthenticated).not.toHaveBeenCalled();
	});

	it("leaves the session alone when no token was sent", async () => {
		answerFetch(unauthenticated);

		await expect(graphqlClient.query({ query: MeDocument })).rejects.toThrow();

		expect(onUnauthenticated).not.toHaveBeenCalled();
	});
});
