import { logger } from "@/logger";
import { initUseCaseContext } from "@/use-cases";
import { buildUseCaseContext } from "@/use-cases/lib/shared/build-use-case-context";

/**
 * Run a one-off script's `task` (a use case call) with the use-case context, log the line it
 * returns and exit; a failure logs `<name> failed` with the error and exits 1.
 */
export async function runUseCaseScript(
	name: string,
	task: () => Promise<string>,
): Promise<void> {
	let code = 0;
	try {
		await initUseCaseContext(buildUseCaseContext);
		logger.info(await task());
	} catch (err) {
		logger.error({ err }, `${name} failed`);
		code = 1;
	}
	process.exit(code);
}
