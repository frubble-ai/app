import { faker } from "@faker-js/faker";
import type { TSlackChannel } from "@/integrations";

/** A Slack channel as a broker's `slack.listChannels` gives it. */
export function generateSlackChannel(
	overrides: Partial<TSlackChannel> = {},
): TSlackChannel {
	return {
		id: `C${faker.string.alphanumeric(8).toUpperCase()}`,
		name: faker.word.noun(),
		is_private: faker.datatype.boolean(),
		num_members: faker.number.int({ min: 1, max: 500 }),
		...overrides,
	};
}
