import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import type { TCodeFlowConfig, TConfig } from "@/config";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import { verifyCode } from "@/use-cases/lib/auth/fixed-one-time-code";
import { issueOneTimeCode } from "@/use-cases/lib/auth/one-time-code";

const { getClone } = setupIntegrationTestContext();

const FLOW: TCodeFlowConfig = {
	identifierPrefix: "test-code:",
	codeTtlMs: 15 * 60 * 1000,
	maxAttempts: 3,
};
const NONE: TConfig["email"] = { delivery: "none", fixedCode: "111111" };
const DELIVERED: TConfig["email"] = { delivery: "provider" };

function newEmail(): string {
	return `${faker.string.alphanumeric(10).toLowerCase()}@example.com`;
}

describe("verifyCode", () => {
	it("accepts the fixed code while emails are not delivered and a code is live", async () => {
		const db = getClone().db;
		const email = newEmail();
		await issueOneTimeCode(db, FLOW, email);

		expect(await verifyCode(db, NONE, FLOW, email, "111111")).toBe("valid");
	});

	it("refuses the fixed code when no code was requested", async () => {
		expect(
			await verifyCode(getClone().db, NONE, FLOW, newEmail(), "111111"),
		).toBe("missing");
	});

	it("refuses the fixed code when emails are delivered", async () => {
		const db = getClone().db;
		const email = newEmail();
		const code = await issueOneTimeCode(db, FLOW, email);

		expect(await verifyCode(db, DELIVERED, FLOW, email, "111111")).toBe(
			code === "111111" ? "valid" : "invalid",
		);
	});

	it("still accepts the emailed code either way", async () => {
		const db = getClone().db;
		const email = newEmail();
		const code = await issueOneTimeCode(db, FLOW, email);

		expect(await verifyCode(db, NONE, FLOW, email, code)).toBe("valid");
		expect(await verifyCode(db, DELIVERED, FLOW, email, code)).toBe("valid");
	});
});
