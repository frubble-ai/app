"use client";

import { useAuth } from "@frubble/react-sdk";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Redirect } from "@/shared/components/redirect";

type TAuthGuardProps = {
	readonly children: ReactNode;
	/** What shows while the API says who is signed in: the page's frame and its loading state. */
	readonly pending: ReactNode;
};

/**
 * Renders `children` only for a signed-in user. Signed out, it sends them to sign-in, carrying
 * where they were going (`?from=`).
 */
export function AuthGuard({ children, pending }: TAuthGuardProps) {
	const { isAuthenticated, isPending } = useAuth();
	const pathname = usePathname();
	const search = useSearchParams().toString();

	if (isPending) return <>{pending}</>;
	if (!isAuthenticated) {
		const from = search ? `${pathname}?${search}` : pathname;
		const target =
			from === "/" ? "/sign-in" : `/sign-in?from=${encodeURIComponent(from)}`;
		return <Redirect to={target} />;
	}
	return <>{children}</>;
}
