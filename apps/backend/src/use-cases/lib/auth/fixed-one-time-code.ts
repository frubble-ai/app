import type { TDb } from "@frubble/db";
import { verification } from "@frubble/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { DateTime } from "luxon";
import type { TCodeFlowConfig, TConfig } from "@/config";
import {
	codeIdentifier,
	type TVerifyCodeResult,
	verifyOneTimeCode,
} from "@/use-cases/lib/auth/one-time-code";

/**
 * The fixed code accepted beside the emailed one while emails are not delivered (`config.email`
 * `delivery: "none"`, which prd refuses at boot). Codes are still minted, stored and verified as
 * always; this only widens what verifies, and only while a requested code is live.
 */

async function hasLiveCode(
	db: TDb,
	flow: TCodeFlowConfig,
	email: string,
): Promise<boolean> {
	const [row] = await db
		.select({ id: verification.id })
		.from(verification)
		.where(
			and(
				eq(verification.identifier, codeIdentifier(flow, email)),
				gt(verification.expiresAt, DateTime.utc().toJSDate()),
			),
		)
		.limit(1);
	return row !== undefined;
}

/** Check a code: the emailed one as always, or the fixed one when emails are not delivered. */
export async function verifyCode(
	db: TDb,
	delivery: TConfig["email"],
	flow: TCodeFlowConfig,
	email: string,
	code: string,
): Promise<TVerifyCodeResult> {
	if (delivery.delivery === "none" && code === delivery.fixedCode) {
		return (await hasLiveCode(db, flow, email)) ? "valid" : "missing";
	}
	return verifyOneTimeCode(db, flow, email, code);
}
