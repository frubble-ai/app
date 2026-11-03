import { Hono } from "hono";
import { logger } from "@/logger";
import { buildHttp } from "@/services/api/http";

/** What the deploy reads from `GET /` to know which commit serves. */
export const meta = {
	version: process.env.APP_VERSION ?? "dev",
	commit: process.env.APP_COMMIT ?? "local",
	env: process.env.APP_ENV ?? "local",
};

type TYogaLike = { handle: (request: Request) => Promise<Response> | Response };

/** The HTTP app: the meta route, the dependency-free health check, GraphQL and `http/`'s routes. */
export function buildApp({ yoga }: { yoga: TYogaLike }) {
	const app = new Hono();

	app.get("/", (context) => context.json({ service: "frubble-api", ...meta }));

	// Dependency-free on purpose: the startup and liveness probes call it.
	app.get("/health", (context) =>
		context.json({ status: "ok", uptime: process.uptime() }),
	);

	app.all("/graphql", (context) => yoga.handle(context.req.raw));

	app.route("/", buildHttp());

	app.notFound((context) =>
		context.json({ error: "not_found", path: context.req.path }, 404),
	);

	app.onError((err, context) => {
		logger.error({ err, path: context.req.path }, "unhandled request error");
		return context.json({ error: "internal_error" }, 500);
	});

	return app;
}
