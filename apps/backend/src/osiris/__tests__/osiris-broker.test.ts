import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { createOsirisBroker } from "@/osiris";
import {
	osiris,
	setupOsirisNetwork,
} from "@/osiris/__mocks__/mock-osiris-network";
import { generateConnectAttempt } from "@/shared/__mocks__/generate-connect-attempt";
import { describeConnectionBrokerContract } from "@/testing/connection-broker-contract";
import { buildTestConfig } from "@/testing/test-environment";

// The real broker and the real osiris client; only osiris's HTTP answers are the test's.
setupOsirisNetwork();

function osirisBroker() {
	return createOsirisBroker(buildTestConfig().integrations.osiris);
}

describeConnectionBrokerContract("osiris", () => ({
	broker: osirisBroker(),
	answerConnect(redirectUrl) {
		osiris.answerConnect(redirectUrl);
		return { accountRef: () => osiris.lastAccountId() };
	},
	answerState: (accountRef, state) => osiris.setStatus(accountRef, state),
	hangState: (accountRef) => osiris.hang(accountRef),
	loseConnect() {
		osiris.loseConnect();
		return { accountRef: () => osiris.lastAccountId() };
	},
	removedElsewhere: (accountRef) => osiris.removedElsewhere(accountRef),
	answerGithub({ installations, repositories }) {
		osiris.answerAction(
			"github.list_installations",
			installations.map((installation) => ({
				id: installation.id,
				account: installation.account,
				account_type: installation.accountType,
				repository_selection: installation.repositories,
			})),
		);
		osiris.answerAction(
			"github.list_repositories",
			repositories.map((repository) => ({
				id: repository.id,
				full_name: repository.fullName,
				private: repository.isPrivate,
				url: repository.url,
				description: repository.description,
			})),
		);
	},
}));

describe("osiris as a broker", () => {
	it("opens a consent on our app at osiris, keyed by the attempt so a retry opens one", async () => {
		const attempt = generateConnectAttempt({ provider: "github" });

		await osirisBroker().startConnect(attempt);

		const [request] = osiris.requests();
		expect(request?.headers.get("idempotency-key")).toBe(attempt.attemptId);
		expect(request?.headers.get("authorization")).toBe(
			`Bearer ${buildTestConfig().integrations.osiris.apiKey}`,
		);
		expect(request?.headers.get("osiris-version")).toBe("2026-11-04.anubis");
		expect(request?.body).toEqual({
			auth_config_id:
				buildTestConfig().integrations.osiris.authConfigIds.github,
			user_id: attempt.organizationId,
			alias: attempt.attemptId,
			callback_url: attempt.callbackUrl,
		});
	});

	it("reads Slack channels and Linear teams into our types", async () => {
		const broker = osirisBroker();
		const attempt = generateConnectAttempt({ provider: "slack" });
		const { accountRef } = await broker.startConnect(attempt);
		const channel = {
			id: `C${faker.string.alphanumeric(8)}`,
			name: "general",
			is_private: true,
			num_members: null,
		};
		osiris.answerAction("slack.list_channels", [channel]);
		osiris.answerAction("linear.list_teams", [{ id: "t1", name: "Core" }]);

		await expect(
			broker.run(
				"slack.listChannels",
				{ organizationId: attempt.organizationId, accountRef },
				{},
			),
		).resolves.toEqual([
			{ id: channel.id, name: "general", isPrivate: true, memberCount: null },
		]);
		await expect(
			broker.run(
				"linear.listTeams",
				{ organizationId: attempt.organizationId, accountRef },
				{},
			),
		).resolves.toEqual([{ id: "t1", name: "Core" }]);
	});
});
