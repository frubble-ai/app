import { getConfig } from "@/config";
import { logger } from "@/logger";
import { buildApp } from "@/services/api/app";
import { buildYoga } from "@/services/api/graphql";
import { stopOnSignal } from "@/shared/shutdown";
import { initUseCaseContext } from "@/use-cases";
import { buildUseCaseContext } from "@/use-cases/lib/shared/build-use-case-context";

// Validates env at boot, so a missing key fails startup rather than a request.
const config = getConfig();

// Awaited, so a broken deploy exits before it takes traffic.
await initUseCaseContext(buildUseCaseContext);

const app = buildApp({
	yoga: buildYoga({
		corsOrigin: config.cors.origin,
		trustedProxies: config.api.trustedProxies,
	}),
});

const server = Bun.serve({
	hostname: config.api.host,
	port: config.api.port,
	fetch: app.fetch,
});

logger.info(`API listening on ${server.hostname}:${server.port}`);

stopOnSignal("API", async () => {
	await server.stop();
});
