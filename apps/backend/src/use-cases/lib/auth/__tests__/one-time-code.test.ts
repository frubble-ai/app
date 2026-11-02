import { faker } from "@faker-js/faker";
import { verification } from "@frubble/db";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import type { TCodeFlowConfig } from "@/config";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import {
	codeIdentifier,
	deleteOneTimeCode,
	issueOneTimeCode,
	ONE_TIME_CODE_LENGTH,
	verifyOneTimeCode,
} from "@/use-cases/lib/auth/one-time-code";

const { getClone } = setupIntegrationTestContext();

const FLOW: TCodeFlowConfig = {
	identifierPrefix: "test-code:",
	codeTtlMs: 15 * 60 * 1000,
	maxAttempts: 3,
};

function newEmail(): string {
	return `${faker.string.alphanumeric(10).toLowerCase()}@example.com`;
}

function wrongCode(code: string): string {
	return code === "000000" ? "111111" : "000000";
}

async function storedRows(email: string) {
	return getClone()
		.db.select()
		.from(verification)
		.where(eq(verification.identifier, codeIdentifier(FLOW, email)));
}

describe("one-time codes", () => {
	it("issues a zero-padded 6-digit code and stores only its hash", async () => {
		const email = newEmail();

		const code = await issueOneTimeCode(getClone().db, FLOW, email);

		expect(code).toMatch(new RegExp(`^\\d{${ONE_TIME_CODE_LENGTH}}$`));
		const rows = await storedRows(email);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.value).not.toContain(code);
		expect(JSON.parse(rows[0]?.value ?? "{}")).toEqual({
			hash: expect.stringMatching(/^[0-9a-f]{64}$/),
			attempts: 0,
		});
	});

	it("re-issuing replaces the previous code", async () => {
		const db = getClone().db;
		const email = newEmail();
		const first = await issueOneTimeCode(db, FLOW, email);
		const second = await issueOneTimeCode(db, FLOW, email);

		expect(await storedRows(email)).toHaveLength(1);
		if (first !== second) {
			expect(await verifyOneTimeCode(db, FLOW, email, first)).toBe("invalid");
		}
		expect(await verifyOneTimeCode(db, FLOW, email, second)).toBe("valid");
	});

	it("a correct code verifies without being consumed, until it is deleted", async () => {
		const db = getClone().db;
		const email = newEmail();
		const code = await issueOneTimeCode(db, FLOW, email);

		expect(await verifyOneTimeCode(db, FLOW, email, code)).toBe("valid");
		expect(await verifyOneTimeCode(db, FLOW, email, code)).toBe("valid");

		await deleteOneTimeCode(db, FLOW, email);
		expect(await verifyOneTimeCode(db, FLOW, email, code)).toBe("missing");
	});

	it("a wrong code counts an attempt that persists", async () => {
		const db = getClone().db;
		const email = newEmail();
		const code = await issueOneTimeCode(db, FLOW, email);

		expect(await verifyOneTimeCode(db, FLOW, email, wrongCode(code))).toBe(
			"invalid",
		);

		const [row] = await storedRows(email);
		expect(JSON.parse(row?.value ?? "{}").attempts).toBe(1);
	});

	it("the code is burned once maxAttempts wrong guesses are made", async () => {
		const db = getClone().db;
		const email = newEmail();
		const code = await issueOneTimeCode(db, FLOW, email);

		for (let attempt = 0; attempt < FLOW.maxAttempts; attempt++) {
			expect(await verifyOneTimeCode(db, FLOW, email, wrongCode(code))).toBe(
				"invalid",
			);
		}

		expect(await storedRows(email)).toEqual([]);
		expect(await verifyOneTimeCode(db, FLOW, email, code)).toBe("missing");
	});

	it("an expired code is missing", async () => {
		const db = getClone().db;
		const email = newEmail();
		const code = await issueOneTimeCode(db, FLOW, email);
		await db
			.update(verification)
			.set({ expiresAt: DateTime.utc().minus({ seconds: 1 }).toJSDate() })
			.where(eq(verification.identifier, codeIdentifier(FLOW, email)));

		expect(await verifyOneTimeCode(db, FLOW, email, code)).toBe("missing");
	});

	it("a corrupted stored value is discarded as missing", async () => {
		const db = getClone().db;
		const email = newEmail();
		await issueOneTimeCode(db, FLOW, email);
		await db
			.update(verification)
			.set({ value: "not-json" })
			.where(eq(verification.identifier, codeIdentifier(FLOW, email)));

		expect(await verifyOneTimeCode(db, FLOW, email, "123456")).toBe("missing");
		expect(await storedRows(email)).toEqual([]);
	});

	it("a code minted for one flow cannot be redeemed in another", async () => {
		const db = getClone().db;
		const email = newEmail();
		const code = await issueOneTimeCode(db, FLOW, email);

		expect(
			await verifyOneTimeCode(
				db,
				{ ...FLOW, identifierPrefix: "other-code:" },
				email,
				code,
			),
		).toBe("missing");
	});
});
