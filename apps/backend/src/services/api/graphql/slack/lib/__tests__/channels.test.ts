import { describe, expect, it } from "vitest";
import { toGqlChannel } from "@/services/api/graphql/slack/lib/channels";
import { generateSlackChannel } from "@/shared/__mocks__/generate-slack-channel";

describe("toGqlChannel", () => {
	it("turns a channel into the schema's", () => {
		const channel = generateSlackChannel();

		expect(toGqlChannel(channel)).toEqual({
			id: channel.id,
			name: channel.name,
			isPrivate: channel.is_private,
			memberCount: channel.num_members,
		});
	});

	it.each([
		{ label: "null", members: null },
		{ label: "absent", members: undefined },
	])("answers a $label member count as null", ({ members }) => {
		const channel = generateSlackChannel({ num_members: members });

		expect(toGqlChannel(channel).memberCount).toBeNull();
	});
});
