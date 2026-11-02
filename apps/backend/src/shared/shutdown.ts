import { logger } from "@/logger";

/** Stop cleanly on SIGTERM (Cloud Run sends it before stopping an instance) or SIGINT. */
export function stopOnSignal(service: string, stop: () => Promise<void>): void {
	async function shutdown(signal: NodeJS.Signals): Promise<void> {
		logger.info({ signal }, `${service} stopping`);
		await stop();
		process.exit(0);
	}
	process.once("SIGTERM", (signal) => void shutdown(signal));
	process.once("SIGINT", (signal) => void shutdown(signal));
}
