"use client";

import { Suspense } from "react";
import { SignUpScreen } from "@/screens/sign-up";

// The screen reads the URL's `?from=`, which Next only has in the browser
export default function Page() {
	return (
		<Suspense>
			<SignUpScreen />
		</Suspense>
	);
}
