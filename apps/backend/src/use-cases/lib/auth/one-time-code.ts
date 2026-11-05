import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { TDb } from "@frubble/db";
import { verification } from "@frubble/db/schema";
import { and, eq, gt, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import { z } from "zod";
import type { TCodeFlowConfig } from "@/config";
import { replaceVerification } from "@/use-cases/lib/auth/verification-row";

/**
 * Emailed 6-digit codes: one `verification` row per flow and email, stored hashed with an attempt
 * count. An action that must happen once per code goes through `redeemOneTimeCode`, which claims the
 * code before the action runs and gives it back if the action fails; `verifyOneTimeCode` only
 * checks, for a flow that cannot be claimed first. Guessing is bounded by `maxAttempts` per code
 * plus the per-email rate limit on requesting and redeeming.
 */

export const ONE_TIME_CODE_LENGTH = 6;

const storedValueSchema = z.object({
	hash: z.string(),
	attempts: z.number().int().nonnegative(),
});

export function codeIdentifier(flow: TCodeFlowConfig, email: string): string {
	return `${flow.identifierPrefix}${email}`;
}

function hashCode(identifier: string, code: string): string {
	return createHash("sha256").update(`${identifier}:${code}`).digest("hex");
}

function generateCode(): string {
	return randomInt(0, 10 ** ONE_TIME_CODE_LENGTH)
		.toString()
		.padStart(ONE_TIME_CODE_LENGTH, "0");
}

/** Mint a fresh code for `email`, replacing any previous code of the flow; returns the plaintext to email. */
export async function issueOneTimeCode(
	db: TDb,
	flow: TCodeFlowConfig,
	email: string,
): Promise<string> {
	const identifier = codeIdentifier(flow, email);
	const code = generateCode();
	const expiresAt = DateTime.utc().plus({ milliseconds: flow.codeTtlMs });

	await replaceVerification(
		db,
		identifier,
		JSON.stringify({ hash: hashCode(identifier, code), attempts: 0 }),
		expiresAt.toJSDate(),
	);

	return code;
}

export type TVerifyCodeResult = "valid" | "invalid" | "missing";

type TVerificationRow = typeof verification.$inferSelect;
type TTx = Parameters<Parameters<TDb["transaction"]>[0]>[0];

/**
 * Check `code` against the row for `identifier`, inside a transaction that already holds the
 * identifier's lock. A wrong guess counts an attempt, and at `maxAttempts` the row is deleted.
 * Returns the row alongside a valid result so a caller can claim it.
 */
async function checkCode(
	tx: TTx,
	flow: TCodeFlowConfig,
	identifier: string,
	code: string,
): Promise<
	{ result: "valid"; row: TVerificationRow } | { result: "invalid" | "missing" }
> {
	const [row] = await tx
		.select()
		.from(verification)
		.where(
			and(
				eq(verification.identifier, identifier),
				gt(verification.expiresAt, DateTime.utc().toJSDate()),
			),
		)
		.limit(1);
	if (!row) return { result: "missing" };

	const stored = storedValueSchema.safeParse(safeJsonParse(row.value));
	if (!stored.success) {
		await tx.delete(verification).where(eq(verification.id, row.id));
		return { result: "missing" };
	}

	const expected = Buffer.from(stored.data.hash, "hex");
	const actual = Buffer.from(hashCode(identifier, code), "hex");
	if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
		return { result: "valid", row };
	}

	const attempts = stored.data.attempts + 1;
	if (attempts >= flow.maxAttempts) {
		await tx.delete(verification).where(eq(verification.id, row.id));
	} else {
		await tx
			.update(verification)
			.set({ value: JSON.stringify({ hash: stored.data.hash, attempts }) })
			.where(eq(verification.id, row.id));
	}
	return { result: "invalid" };
}

function lockIdentifier(tx: TTx, identifier: string) {
	return tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${identifier}))`);
}

/** Check a code without consuming it. Wrong guesses count; at `maxAttempts` the code is deleted. */
export async function verifyOneTimeCode(
	db: TDb,
	flow: TCodeFlowConfig,
	email: string,
	code: string,
): Promise<TVerifyCodeResult> {
	const identifier = codeIdentifier(flow, email);

	return db.transaction(async (tx) => {
		await lockIdentifier(tx, identifier);
		return (await checkCode(tx, flow, identifier, code)).result;
	});
}

export type TRedeemCodeResult = "redeemed" | "invalid" | "missing";

/**
 * Run `action` once per code. The code is claimed first, in one transaction under the
 * identifier's lock, so of any number of concurrent requests with the same code exactly one gets
 * to run `action` and the rest see the code as missing. The lock is not held while `action` runs,
 * so it cannot starve the connection pool.
 *
 * If `action` throws, the code is put back with its attempt count and expiry, so the caller can
 * retry; a code issued in the meantime is left alone, since it replaces this one. A process that
 * dies between the claim and the restore loses the code, and the user asks for a new one.
 */
export async function redeemOneTimeCode(
	db: TDb,
	flow: TCodeFlowConfig,
	email: string,
	code: string,
	action: () => Promise<void>,
): Promise<TRedeemCodeResult> {
	const identifier = codeIdentifier(flow, email);

	const claimed = await db.transaction(async (tx) => {
		await lockIdentifier(tx, identifier);
		const checked = await checkCode(tx, flow, identifier, code);
		if (checked.result !== "valid") return checked.result;
		await tx.delete(verification).where(eq(verification.id, checked.row.id));
		return checked.row;
	});
	if (typeof claimed === "string") return claimed;

	try {
		await action();
	} catch (error) {
		await restoreClaimedCode(db, identifier, claimed);
		throw error;
	}
	return "redeemed";
}

/** Put a claimed row back unless it expired or the identifier has a newer code. */
async function restoreClaimedCode(
	db: TDb,
	identifier: string,
	row: TVerificationRow,
): Promise<void> {
	await db.transaction(async (tx) => {
		await lockIdentifier(tx, identifier);
		const [newer] = await tx
			.select({ id: verification.id })
			.from(verification)
			.where(eq(verification.identifier, identifier))
			.limit(1);
		if (newer || row.expiresAt <= DateTime.utc().toJSDate()) return;
		await tx.insert(verification).values(row);
	});
}

/** Burn the code for `(flow, email)` after the action it unlocked succeeded. */
export async function deleteOneTimeCode(
	db: TDb,
	flow: TCodeFlowConfig,
	email: string,
): Promise<void> {
	await db
		.delete(verification)
		.where(eq(verification.identifier, codeIdentifier(flow, email)));
}

function safeJsonParse(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}
