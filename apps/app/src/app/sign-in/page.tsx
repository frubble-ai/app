"use client";

import { Suspense } from "react";
import { SignInScreen } from "@/screens/sign-in";

// The screen reads the URL's `?from=`, which Next only has in the browser
export default function SignInPage() {
	return (
		<Suspense>
			<SignInScreen />
		</Suspense>
	);
}
