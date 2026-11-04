import { describe, expect, it } from "vitest";
import { accountState, isAlreadyGone } from "@/composio/lib/account-state";

describe("accountState", () => {
	it.each([
		["INITIALIZING", "pending"],
		["INITIATED", "pending"],
		["ACTIVE", "active"],
		["FAILED", "failed"],
		["EXPIRED", "failed"],
		["REVOKED", "failed"],
	])("reads %s as %s", (status, state) => {
		expect(accountState(status)).toBe(state);
	});
});

describe("isAlreadyGone", () => {
	it("takes Composio's 404 as already removed, anything else as a failure", () => {
		expect(isAlreadyGone({ status: 404 })).toBe(true);
		expect(isAlreadyGone({ status: 500 })).toBe(false);
		expect(isAlreadyGone(new Error("network"))).toBe(false);
	});
});
