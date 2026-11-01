import { logger } from "@/logger";
import { buildWorkerApp } from "@/services/worker/app";
import { handleEmailMessage } from "@/services/worker/email";
import {
	createEmailSender,
	type TEmailSender,
} from "@/services/worker/email/providers";
import { getWorkerConfig } from "@/services/worker/lib/config";
import { stopOnSignal } from "@/shared/shutdown";

// The worker: Pub/Sub pushes each `emails` message to `POST /push/emails`, which renders and
// sends it through the configured provider. Same image as the API, started with
// `bun run src/services/worker/index.ts`. No database: everything it needs is in the message.

const config = getWorkerConfig();

// Without a provider (never in prd) each email is logged and dropped; the API accepts the
// fixed one-time code beside the emailed one, so sign-up and password reset still work.
const sender: TEmailSender =
	config.provider !== "none" && config.email
		? createEmailSender(config.provider, config.email)
		: {
				send: async (_to, email) => {
					logger.warn({ type: email.type }, "email not sent: no provider");
				},
			};
if (config.provider === "none") {
	logger.warn(
		"EMAIL_PROVIDER is none: emails are logged, not sent, and the API accepts the fixed one-time code (not prd)",
	);
}

const app = buildWorkerApp({
	handleEmails: (body) =>
		handleEmailMessage(
			{
				logger,
				sendEmail: (to, email) =>
					sender.send(to, email, { supportUrl: config.supportUrl }),
			},
			body,
		),
});

const server = Bun.serve({
	hostname: config.host,
	port: config.port,
	fetch: app.fetch,
});

logger.info(
	{ provider: config.provider },
	`worker listening on ${server.hostname}:${server.port}`,
);

// Cloud Run sends SIGTERM once no request is in flight; `stop()` lets any that remain finish.
stopOnSignal("worker", async () => {
	app.markDraining();
	await server.stop();
});
