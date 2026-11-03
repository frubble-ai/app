import { useAuth } from "@frubble/react-sdk";
import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { endSession } from "@/shared/session";

/** The signed-in user's frame: the app's name, who is signed in and sign-out, above the page. */
export function AppShell({ children }: { readonly children: ReactNode }) {
	const { t } = useTranslation("layout");
	const { user } = useAuth();
	return (
		<div data-testid="app-shell">
			<header className="app-header">
				<Link
					href="/"
					className="app-header__brand"
					data-testid="app-shell-brand"
				>
					{t("brand")}
				</Link>
				<div className="app-header__account">
					{user ? (
						<span data-testid="app-shell-email">{user.email}</span>
					) : null}
					<button
						type="button"
						data-testid="app-shell-sign-out"
						onClick={() => void endSession()}
					>
						{t("signOut")}
					</button>
				</div>
			</header>
			<main>{children}</main>
		</div>
	);
}
