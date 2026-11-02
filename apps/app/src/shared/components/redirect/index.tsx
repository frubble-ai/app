"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Sends the user to `to` in place of the current page, as soon as it renders. */
export function Redirect({ to }: { readonly to: string }) {
	const router = useRouter();
	useEffect(() => {
		router.replace(to);
	}, [router, to]);
	return null;
}
