import { logger } from "@/logger";
import { buildWorkerApp } from "@/services/worker/app";
import { handleEmailMessage } from "@/services/worker/email";
import { createEmailSender } from "@/services/worker/email/providers";
import { getWorkerConfig } from "@/services/worker/lib/config";
import { stopOnSignal } from "@/shared/shutdown";

// The worker: Pub/Sub pushes each `emails` message to `POST /push/emails`, which renders and
// sends it through the configured provider. Same image as the API, started with
// `APP_PROCESS=worker`. No database: everything it needs is in the message.

const config = getWorkerConfig();

const sender = createEmailSender(config.provider, config.email);

const app = buildWorkerApp({
	pushToken: config.pushToken,
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
