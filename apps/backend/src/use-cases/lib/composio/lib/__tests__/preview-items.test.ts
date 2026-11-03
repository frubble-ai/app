import { describe, expect, it } from "vitest";
import { toPreviewItems } from "@/use-cases/lib/composio/lib/preview-items";

describe("toPreviewItems", () => {
	it("reads the list under the first key that holds one, a GitHub login as the name", () => {
		expect(
			toPreviewItems({ details: [{ id: 7, login: "frubble-ai" }] }, [
				"details",
				"organizations",
			]),
		).toEqual([{ id: "7", name: "frubble-ai" }]);
	});

	it("takes data that is itself the list, and skips rows without an id", () => {
		expect(
			toPreviewItems([{ id: "C1", name: "general" }, { name: "no id" }], []),
		).toEqual([{ id: "C1", name: "general" }]);
	});

	it("answers no rows when nothing in the data is a list", () => {
		expect(toPreviewItems({ ok: true }, ["channels"])).toEqual([]);
	});
});
