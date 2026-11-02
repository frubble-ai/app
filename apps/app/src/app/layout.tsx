import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { buildAppConfig } from "@/config/app-config";
import { AppProviders } from "@/shared/components/app-providers";
import "./app.css";

export const metadata: Metadata = {
	title: "Frubble",
	robots: { index: false, follow: false },
};

export default async function RootLayout({
	children,
}: {
	readonly children: ReactNode;
}) {
	// At request time, so the container's environment decides, not the build's: one image serves
	// every environment (docs/environment.md)
	await connection();
	const config = buildAppConfig({
		APP_ENV: process.env.APP_ENV,
		GRAPHQL_URL: process.env.GRAPHQL_URL,
	});
	return (
		<html lang="en">
			<body>
				<AppProviders config={config}>{children}</AppProviders>
			</body>
		</html>
	);
}
