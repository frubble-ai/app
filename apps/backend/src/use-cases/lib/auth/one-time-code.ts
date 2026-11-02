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
 * count. Verify, do the action, then delete, so a failed action leaves the code usable. Guessing is
 * bounded by `maxAttempts` per code plus the per-email rate limit on requesting and redeeming.
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

/** Check a code without consuming it. Wrong guesses count; at `maxAttempts` the code is deleted. */
export async function verifyOneTimeCode(
	db: TDb,
	flow: TCodeFlowConfig,
	email: string,
	code: string,
): Promise<TVerifyCodeResult> {
	const identifier = codeIdentifier(flow, email);

	return db.transaction(async (tx) => {
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${identifier}))`,
		);
		const [row] = await tx
			.select({ id: verification.id, value: verification.value })
			.from(verification)
			.where(
				and(
					eq(verification.identifier, identifier),
					gt(verification.expiresAt, DateTime.utc().toJSDate()),
				),
			)
			.limit(1);
		if (!row) return "missing";

		const stored = storedValueSchema.safeParse(safeJsonParse(row.value));
		if (!stored.success) {
			await tx.delete(verification).where(eq(verification.id, row.id));
			return "missing";
		}

		const expected = Buffer.from(stored.data.hash, "hex");
		const actual = Buffer.from(hashCode(identifier, code), "hex");
		if (
			expected.length === actual.length &&
			timingSafeEqual(expected, actual)
		) {
			return "valid";
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
		return "invalid";
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
