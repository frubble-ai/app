import { Hono } from "hono";
import { logger } from "hono/logger";

/** Build-time metadata, injected by the Dockerfile at image build. */
export const meta = {
	service: "frubble-backend",
	version: process.env.APP_VERSION ?? "dev",
	commit: process.env.APP_COMMIT ?? "local",
	environment: process.env.APP_ENV ?? "development",
};

export const app = new Hono();

app.use("*", logger());

app.get("/", (context) =>
	context.json({
		message: "Hello World",
		...meta,
	}),
);

/**
 * Liveness probe. Kept free of dependencies so it stays truthful even when
 * downstream services are degraded — the tunnel uses it to decide if the
 * origin is reachable at all.
 */
app.get("/health", (context) =>
	context.json({ status: "ok", uptime: process.uptime() }),
);

app.notFound((context) =>
	context.json({ error: "not_found", path: context.req.path }, 404),
);

app.onError((err, context) => {
	console.error("unhandled", err);
	return context.json({ error: "internal_error" }, 500);
});
