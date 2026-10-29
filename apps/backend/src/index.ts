import { app, meta } from "./app.ts";

const port = Number(Bun.env.PORT ?? 8080);

const server = Bun.serve({
	port,
	hostname: "0.0.0.0",
	fetch: app.fetch,
});

console.log(
	`${meta.service} ${meta.version} (${meta.commit}) listening on :${server.port}`,
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		console.log(`${signal} received, draining…`);
		server.stop();
		process.exit(0);
	});
}
