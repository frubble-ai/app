import { Hono } from "hono";
import { createIntegrationsCallbackRoutes } from "./routes/integrations/callback";

/**
 * Every route, at the path its folder under `routes/` spells: `routes/integrations/callback/`
 * serves `/integrations/callback`. A route answers at its own `/`; a deeper path is a folder inside
 * it.
 */
const ROUTES: readonly [path: string, create: () => Hono][] = [
	["/integrations/callback", createIntegrationsCallbackRoutes],
];

/** The API's HTTP routes beside GraphQL. Each one reads the request and calls one use case. */
export function buildHttp(): Hono {
	const app = new Hono();
	for (const [path, create] of ROUTES) app.route(path, create());
	return app;
}
