"use client";

import "@/i18n";
import { ApolloProvider } from "@apollo/client/react";
import { graphqlClient } from "@frubble/react-sdk";
import { type ReactNode, useEffect, useState } from "react";
import { applyAppConfig, type TAppConfig } from "@/config/app-config";
import { configureSdk } from "@/config/sdk";
import { SplashScreen } from "@/shared/components/splash-screen";
import { bootSession } from "@/shared/session";

/**
 * Every page's providers. `config` is what the server read from its environment at request time
 * (`app/layout.tsx`): it's applied and the SDK pointed at its API before the session loads. The
 * session lives in the browser, so nothing renders until it has loaded there: the server only ever
 * sends the splash screen.
 */
export function AppProviders({
	config,
	children,
}: {
	readonly config: TAppConfig;
	readonly children: ReactNode;
}) {
	const [booted, setBooted] = useState(false);

	useEffect(() => {
		applyAppConfig(config);
		configureSdk(config);
		void bootSession().then(() => setBooted(true));
	}, [config]);

	if (!booted) return <SplashScreen />;
	return <ApolloProvider client={graphqlClient}>{children}</ApolloProvider>;
}
