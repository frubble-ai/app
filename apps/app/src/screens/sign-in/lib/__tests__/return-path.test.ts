import { describe, expect, it } from "vitest";
import { returnPath } from "@/screens/sign-in/lib/return-path";

describe("returnPath", () => {
	it("goes back to a page on this site", () => {
		expect(returnPath("/settings?tab=profile")).toBe("/settings?tab=profile");
	});

	it.each([
		["nothing to go back to", null],
		["another site", "https://example.com"],
		["another site, protocol-relative", "//example.com"],
		["another site, by backslash", "/\\example.com"],
		[
			"another site, behind a tab the browser strips (?from=/%09/…)",
			"/\t/example.com",
		],
		["another site, behind a newline", "/\n/example.com"],
		["another site, behind a carriage return", "/\r/example.com"],
		["another site, backslashes all the way", "/\\\\example.com"],
		["another site, once the dot segment resolves", "/.//example.com"],
		["another site, after a parent segment", "/a/..//example.com"],
		["a relative path", "sandbox"],
	])("goes home for %s", (_case, from) => {
		expect(returnPath(from)).toBe("/");
	});
});
