"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/shared/components/app-shell";
import { AuthGuard } from "@/shared/components/auth-guard";
import { LoadingState } from "@/shared/components/loading-state";

/**
 * Every page behind sign-in, in the app's frame. The frame shows at once, with a loading state,
 * while the API says who is signed in.
 */
export default function SignedInLayout({
	children,
}: {
	readonly children: ReactNode;
}) {
	return (
		<AuthGuard
			pending={
				<AppShell>
					<LoadingState />
				</AppShell>
			}
		>
			<AppShell>{children}</AppShell>
		</AuthGuard>
	);
}
