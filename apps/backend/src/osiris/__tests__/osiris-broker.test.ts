import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { createOsirisBroker } from "@/osiris";
import {
	osiris,
	setupOsirisNetwork,
} from "@/osiris/__mocks__/mock-osiris-network";
import { OsirisError } from "@/osiris/lib/answer";
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
		// Our outputs are osiris's own types, so osiris answers them as they are.
		osiris.answerAction("github.list_installations", installations);
		osiris.answerAction("github.list_repositories", repositories);
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

	it("answers Slack channels and Linear teams as osiris gives them", async () => {
		const broker = osirisBroker();
		const attempt = generateConnectAttempt({ provider: "slack" });
		const { accountRef } = await broker.startConnect(attempt);
		const channel = {
			id: `C${faker.string.alphanumeric(8)}`,
			name: faker.word.noun(),
			is_private: faker.datatype.boolean(),
			num_members: null,
		};
		const team = { id: faker.string.uuid(), name: faker.company.name() };
		osiris.answerAction("slack.list_channels", [channel]);
		osiris.answerAction("linear.list_teams", [team]);

		await expect(
			broker.run(
				"slack.listChannels",
				{ organizationId: attempt.organizationId, accountRef },
				{},
			),
		).resolves.toEqual([channel]);
		await expect(
			broker.run(
				"linear.listTeams",
				{ organizationId: attempt.organizationId, accountRef },
				{},
			),
		).resolves.toEqual([team]);
	});

	it("reads an expired pending connection as failed", async () => {
		const broker = osirisBroker();
		const { accountRef } = await broker.startConnect(generateConnectAttempt());
		osiris.setStatus(accountRef, "expired");

		await expect(broker.accountState(accountRef)).resolves.toBe("failed");
	});

	it("fails a removal osiris refuses with anything but not found", async () => {
		const broker = osirisBroker();
		const { accountRef } = await broker.startConnect(generateConnectAttempt());
		osiris.failDelete(accountRef, 500);

		await expect(broker.removeAccount(accountRef)).rejects.toMatchObject({
			name: OsirisError.name,
			status: 500,
		});
	});

	it("fails an action osiris refuses", async () => {
		const broker = osirisBroker();
		const attempt = generateConnectAttempt({ provider: "github" });
		const { accountRef } = await broker.startConnect(attempt);
		osiris.failAction("github.list_repositories", 502);

		await expect(
			broker.run(
				"github.listRepositories",
				{ organizationId: attempt.organizationId, accountRef },
				{},
			),
		).rejects.toMatchObject({ name: OsirisError.name, status: 502 });
	});
});
