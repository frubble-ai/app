"use client";

import { Suspense } from "react";
import { HomeScreen } from "@/screens/home";

// The screen reads the connect outcome from the URL, which Next only has in the browser
export default function HomePage() {
	return (
		<Suspense>
			<HomeScreen />
		</Suspense>
	);
}
