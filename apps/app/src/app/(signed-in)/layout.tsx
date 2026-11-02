"use client";

import { UserRole } from "@frubble/react-sdk";
import type { ReactNode } from "react";
import { AppShell } from "@/shared/components/app-shell";
import { AuthGuard } from "@/shared/components/auth-guard";
import { LoadingState } from "@/shared/components/loading-state";

/**
 * Every page behind sign-in: customers only, in the app's frame. The frame shows at once, with a
 * skeleton, while the API says who is signed in.
 */
export default function SignedInLayout({
	children,
}: {
	readonly children: ReactNode;
}) {
	return (
		<AuthGuard
			requiredRole={UserRole.Customer}
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
