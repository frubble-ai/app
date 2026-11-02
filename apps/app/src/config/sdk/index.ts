import { configureGraphql, configureTokenStore } from "@frubble/react-sdk";
import type { TAppConfig } from "@/config/app-config";
import { endSession } from "@/shared/session";
import { browserTokenStore } from "@/shared/token-store";

// The session token persists in the browser
configureTokenStore(browserTokenStore);

/** Points the SDK at the API the runtime config names; `AppProviders` calls it before any query. */
export function configureSdk(config: TAppConfig): void {
	configureGraphql({
		endpoint: config.graphqlUrl,
		// The API refused the session token: the session is over, wherever it was found out
		onUnauthenticated: () => void endSession(),
	});
}
