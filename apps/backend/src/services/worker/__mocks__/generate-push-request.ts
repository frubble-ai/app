import { faker } from "@faker-js/faker";

/** What Pub/Sub posts to a push endpoint for `body`, base64 in the message. */
export function generatePushRequest(
	body: unknown,
	overrides: Record<string, unknown> = {},
) {
	return {
		message: {
			data: Buffer.from(JSON.stringify(body)).toString("base64"),
			messageId: faker.string.numeric(16),
			publishTime: faker.date.recent().toISOString(),
			...overrides,
		},
		subscription: `projects/${faker.word.noun()}/subscriptions/emails-worker`,
	};
}
