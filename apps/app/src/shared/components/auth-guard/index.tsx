"use client";

import { type UserRole, useAuth } from "@frubble/react-sdk";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Redirect } from "@/shared/components/redirect";
import { RoleFallback } from "@/shared/components/role-fallback";

type TAuthGuardProps = {
	readonly children: ReactNode;
	readonly requiredRole: UserRole;
	/** What shows while the API says who is signed in: the page's frame and skeleton. */
	readonly pending: ReactNode;
};

/**
 * Renders `children` only for a signed-in user with `requiredRole`. Signed out, it sends them to
 * sign-in, carrying where they were going (`?from=`); with another role, it offers sign-out.
 */
export function AuthGuard({
	children,
	requiredRole,
	pending,
}: TAuthGuardProps) {
	const { isAuthenticated, isPending, role } = useAuth();
	const pathname = usePathname();
	const search = useSearchParams().toString();

	if (isPending) return <>{pending}</>;
	if (!isAuthenticated) {
		const from = search ? `${pathname}?${search}` : pathname;
		const target =
			from === "/" ? "/sign-in" : `/sign-in?from=${encodeURIComponent(from)}`;
		return <Redirect to={target} />;
	}
	if (role !== requiredRole) return <RoleFallback />;
	return <>{children}</>;
}
