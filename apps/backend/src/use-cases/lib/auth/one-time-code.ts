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
 * code before the action runs and gives it back if the action fails before its change is written;
 * `verifyOneTimeCode` only checks, for a flow that cannot be claimed first. Guessing is bounded by `maxAttempts` per code
 * plus the per-email rate limit on requesting and redeeming.
 */

export const ONE_TIME_CODE_LENGTH = 6;

const storedValueSchema = z.object({
	hash: z.string(),
	attempts: z.number().int().nonnegative(),
	/** Set while a redemption is running; the code is spent for everyone else until it settles. */
	claimed: z.boolean().optional(),
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
type TStoredValue = z.infer<typeof storedValueSchema>;
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
	| { result: "valid"; row: TVerificationRow; stored: TStoredValue }
	| { result: "invalid" | "missing" }
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
	// Another request is redeeming this code. Not a guess, so it counts no attempt.
	if (stored.data.claimed) return { result: "missing" };

	const expected = Buffer.from(stored.data.hash, "hex");
	const actual = Buffer.from(hashCode(identifier, code), "hex");
	if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
		return { result: "valid", row, stored: stored.data };
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

/** What the action of `redeemOneTimeCode` can say about how far it got. */
export type TRedeemProgress = {
	/** Call once the change the code unlocks has been written: from then on the code is spent. */
	markSpent: () => void;
};

/**
 * Run `action` once per code. The code is claimed first, in one transaction under the
 * identifier's lock: the row is marked as claimed, and every other request, concurrent or later,
 * finds the code missing. The lock is not held while `action` runs, so it cannot starve the
 * connection pool.
 *
 * The row stays in place while the action runs, so a code issued in the meantime replaces it
 * like any other and nothing can bring the old one back. If `action` throws before it calls
 * `markSpent`, the claim is released and the code works again for a retry. After `markSpent` the
 * code is burned whatever happens next, so a change that was written is never repeated with the
 * same code. A process that dies mid-action leaves the code claimed until it expires, and the
 * user asks for a new one.
 *
 * Settling the claim can itself fail. That never replaces what the caller should see: the
 * action's own error is rethrown, and a change that was written still reports success. The code
 * is then left claimed until it expires, which is the same as burned, and `onSettleError` is told
 * so the failure is not lost.
 */
export async function redeemOneTimeCode(
	db: TDb,
	flow: TCodeFlowConfig,
	email: string,
	code: string,
	action: (progress: TRedeemProgress) => Promise<void>,
	{ onSettleError }: { onSettleError?: (error: unknown) => void } = {},
): Promise<TRedeemCodeResult> {
	const identifier = codeIdentifier(flow, email);

	const claim = await db.transaction(async (tx) => {
		await lockIdentifier(tx, identifier);
		const checked = await checkCode(tx, flow, identifier, code);
		if (checked.result !== "valid") return checked.result;
		await tx
			.update(verification)
			.set({ value: JSON.stringify({ ...checked.stored, claimed: true }) })
			.where(eq(verification.id, checked.row.id));
		return { rowId: checked.row.id, stored: checked.stored };
	});
	if (typeof claim === "string") return claim;

	let spent = false;
	try {
		await action({
			markSpent: () => {
				spent = true;
			},
		});
	} catch (error) {
		await settleClaim(
			db,
			identifier,
			claim.rowId,
			spent ? "burn" : { release: claim.stored },
		).catch((settleError: unknown) => onSettleError?.(settleError));
		throw error;
	}
	await settleClaim(db, identifier, claim.rowId, "burn").catch(
		(settleError: unknown) => onSettleError?.(settleError),
	);
	return "redeemed";
}

/**
 * Burn the claimed row, or give it back. Both touch the row by id, so if a newer code replaced it
 * meanwhile there is nothing to burn or to give back, and the newer code is left alone.
 */
async function settleClaim(
	db: TDb,
	identifier: string,
	rowId: string,
	outcome: "burn" | { release: TStoredValue },
): Promise<void> {
	await db.transaction(async (tx) => {
		await lockIdentifier(tx, identifier);
		if (outcome === "burn") {
			await tx.delete(verification).where(eq(verification.id, rowId));
			return;
		}
		await tx
			.update(verification)
			.set({
				value: JSON.stringify({
					hash: outcome.release.hash,
					attempts: outcome.release.attempts,
				}),
			})
			.where(eq(verification.id, rowId));
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
