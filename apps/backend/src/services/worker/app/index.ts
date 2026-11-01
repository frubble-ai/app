import { Hono } from "hono";
import { logger } from "@/logger";
import { InvalidMessageError } from "@/services/worker/lib/envelope";
import { parsePushMessage } from "@/services/worker/lib/push-message";
import { isDomainError } from "@/use-cases/lib/shared/domain-errors";

export type TWorkerAppDeps = {
	/** Handles one `emails` message (its parsed body). Throws to have Pub/Sub retry it. */
	handleEmails: (body: unknown) => Promise<void>;
};

/**
 * The worker's HTTP app. Pub/Sub pushes each message to its channel's route and reads the
 * answer: 204 acknowledges, anything else has the message redelivered with backoff until the
 * subscription's dead-letter policy moves it aside. Cloud Run's invoker check is what keeps anyone
 * but the subscription's identity from calling it.
 */
export function buildWorkerApp(deps: TWorkerAppDeps) {
	const app = new Hono();
	let draining = false;

	app.get("/health", (context) =>
		context.json(
			{ status: draining ? "draining" : "ok" },
			draining ? 503 : 200,
		),
	);

	app.post("/push/emails", async (context) => {
		const push = parsePushMessage(await context.req.json().catch(() => null));
		try {
			await deps.handleEmails(push.body);
			return context.body(null, 204);
		} catch (err) {
			// Invalid messages and domain errors are bad input: a warning, not a failure of ours.
			// Either way the message stays on the subscription, until the dead-letter policy takes it.
			const expected = err instanceof InvalidMessageError || isDomainError(err);
			logger[expected ? "warn" : "error"](
				{ err, messageId: push.messageId },
				"message failed; Pub/Sub will redeliver it",
			);
			return context.json({ error: "message_failed" }, 500);
		}
	});

	app.notFound((context) =>
		context.json({ error: "not_found", path: context.req.path }, 404),
	);

	app.onError((err, context) => {
		if (err instanceof InvalidMessageError) {
			logger.warn({ err, path: context.req.path }, "invalid push request");
			return context.json({ error: "invalid_message" }, 400);
		}
		logger.error({ err, path: context.req.path }, "unhandled request error");
		return context.json({ error: "internal_error" }, 500);
	});

	return Object.assign(app, {
		/** Called on SIGTERM: from then on `/health` answers 503. */
		markDraining() {
			draining = true;
		},
	});
}
