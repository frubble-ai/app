import { Hono } from "hono";
import { completeIntegrationConnectUseCase } from "@/use-cases/cases/complete-integration-connect.use-case";

/**
 * `/integrations/callback`: where Composio sends the browser after a provider's consent. Public:
 * the use case checks the connection with Composio, then this redirects to the web app.
 */
export function createIntegrationsCallbackRoutes(): Hono {
	const app = new Hono();
	app.get("/", async (context) => {
		const { redirectUrl } = await completeIntegrationConnectUseCase({
			connectionId: context.req.query("connection"),
		});
		return context.redirect(redirectUrl, 302);
	});
	return app;
}
