import { faker } from "@faker-js/faker";
import { verification } from "@frubble/db";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { describe, expect, it, vi } from "vitest";
import type { TCodeFlowConfig } from "@/config";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import {
	codeIdentifier,
	deleteOneTimeCode,
	issueOneTimeCode,
	ONE_TIME_CODE_LENGTH,
	redeemOneTimeCode,
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

describe("redeemOneTimeCode", () => {
	it("runs the action for exactly one of many concurrent requests with the same code", async () => {
		const db = getClone().db;
		const email = newEmail();
		const code = await issueOneTimeCode(db, FLOW, email);
		let ran = 0;

		const results = await Promise.all(
			Array.from({ length: 8 }, () =>
				redeemOneTimeCode(db, FLOW, email, code, async () => {
					ran += 1;
					await new Promise((resolve) => setTimeout(resolve, 50));
				}),
			),
		);

		expect(ran).toBe(1);
		expect(results.filter((result) => result === "redeemed")).toHaveLength(1);
		expect(results.filter((result) => result === "missing")).toHaveLength(7);
		expect(await storedRows(email)).toEqual([]);
	});

	it("does not run the action for a wrong code, and the guess still counts", async () => {
		const db = getClone().db;
		const email = newEmail();
		const code = await issueOneTimeCode(db, FLOW, email);
		const action = vi.fn(async () => undefined);

		expect(
			await redeemOneTimeCode(db, FLOW, email, wrongCode(code), action),
		).toBe("invalid");

		expect(action).not.toHaveBeenCalled();
		const [row] = await storedRows(email);
		expect(JSON.parse(row?.value ?? "{}").attempts).toBe(1);
	});

	it("gives the code back, attempts and expiry intact, when the action fails", async () => {
		const db = getClone().db;
		const email = newEmail();
		const code = await issueOneTimeCode(db, FLOW, email);
		await verifyOneTimeCode(db, FLOW, email, wrongCode(code));
		const [before] = await storedRows(email);
		const failure = new Error(faker.lorem.sentence());

		await expect(
			redeemOneTimeCode(db, FLOW, email, code, async () => {
				throw failure;
			}),
		).rejects.toThrow(failure);

		const [after] = await storedRows(email);
		expect(after).toMatchObject({
			id: before?.id,
			value: before?.value,
			expiresAt: before?.expiresAt,
		});
		expect(
			await redeemOneTimeCode(db, FLOW, email, code, async () => undefined),
		).toBe("redeemed");
	});

	it("leaves a code issued during the action in place instead of restoring the old one", async () => {
		const db = getClone().db;
		const email = newEmail();
		const first = await issueOneTimeCode(db, FLOW, email);
		let second = "";

		await expect(
			redeemOneTimeCode(db, FLOW, email, first, async () => {
				second = await issueOneTimeCode(db, FLOW, email);
				throw new Error(faker.lorem.sentence());
			}),
		).rejects.toThrow();

		expect(await storedRows(email)).toHaveLength(1);
		expect(await verifyOneTimeCode(db, FLOW, email, second)).toBe("valid");
	});

	it("does not make a code that expired while the action ran usable again", async () => {
		const db = getClone().db;
		const email = newEmail();
		const shortLived = { ...FLOW, codeTtlMs: 150 };
		const code = await issueOneTimeCode(db, shortLived, email);

		await expect(
			redeemOneTimeCode(db, shortLived, email, code, async () => {
				await new Promise((resolve) => setTimeout(resolve, 400));
				throw new Error(faker.lorem.sentence());
			}),
		).rejects.toThrow();

		expect(await verifyOneTimeCode(db, shortLived, email, code)).toBe(
			"missing",
		);
	});

	it("cannot bring back a superseded code after the newer one was redeemed", async () => {
		const db = getClone().db;
		const email = newEmail();
		const first = await issueOneTimeCode(db, FLOW, email);
		let second = "";

		await expect(
			redeemOneTimeCode(db, FLOW, email, first, async () => {
				second = await issueOneTimeCode(db, FLOW, email);
				expect(
					await redeemOneTimeCode(
						db,
						FLOW,
						email,
						second,
						async () => undefined,
					),
				).toBe("redeemed");
				throw new Error(faker.lorem.sentence());
			}),
		).rejects.toThrow();

		expect(await storedRows(email)).toEqual([]);
		expect(await verifyOneTimeCode(db, FLOW, email, first)).toBe("missing");
	});

	it("burns the code when the action says its change was written and then fails", async () => {
		const db = getClone().db;
		const email = newEmail();
		const code = await issueOneTimeCode(db, FLOW, email);

		await expect(
			redeemOneTimeCode(db, FLOW, email, code, async ({ markSpent }) => {
				markSpent();
				throw new Error(faker.lorem.sentence());
			}),
		).rejects.toThrow();

		expect(await storedRows(email)).toEqual([]);
		expect(await verifyOneTimeCode(db, FLOW, email, code)).toBe("missing");
	});

	it("shows a claimed code as missing to others without counting an attempt", async () => {
		const db = getClone().db;
		const email = newEmail();
		const code = await issueOneTimeCode(db, FLOW, email);
		let duringAction = "";

		await redeemOneTimeCode(db, FLOW, email, code, async () => {
			duringAction = await verifyOneTimeCode(db, FLOW, email, wrongCode(code));
			const [row] = await storedRows(email);
			expect(JSON.parse(row?.value ?? "{}").attempts).toBe(0);
		});

		expect(duringAction).toBe("missing");
	});
});
