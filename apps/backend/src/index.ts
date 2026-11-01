// The image's one entrypoint. APP_PROCESS picks what runs, so the same image
// is the API and the worker, and the platform never needs a `command`: a
// placeholder image that ignores the variable still starts.
const PROCESSES = {
	api: () => import("./services/api/index.ts"),
	worker: () => import("./services/worker/index.ts"),
};

const name = process.env.APP_PROCESS ?? "api";
const start = PROCESSES[name as keyof typeof PROCESSES];
if (!start) {
	console.error(
		`APP_PROCESS must be one of ${Object.keys(PROCESSES).join(", ")}, not "${name}"`,
	);
	process.exit(1);
}
await start();
