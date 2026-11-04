import { describeConnectionBrokerContract } from "@/testing/connection-broker-contract";
import { createMockConnectionBroker } from "@/testing/mock-connection-broker";

// The use-case tests run on the in-memory broker: it owes them what a real broker does.
describeConnectionBrokerContract("the in-memory broker", () => {
	const mock = createMockConnectionBroker();
	return {
		broker: mock.broker,
		answerConnect(redirectUrl) {
			mock.answerConnect({ redirectUrl });
			return { accountRef: () => mock.lastConnect().accountRef };
		},
		answerState: (accountRef, state) => mock.answerState(accountRef, state),
		hangState: (accountRef) => mock.hangState(accountRef),
		loseConnect() {
			mock.loseConnect({ listed: true });
			return { accountRef: () => mock.lastLostAccount() };
		},
		removedElsewhere: (accountRef) => {
			void mock.broker.removeAccount(accountRef);
		},
		answerGithubOrganizations: (organizations) =>
			mock.answerAction("github.listOrganizations", organizations),
	};
});
