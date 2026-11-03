import { useAuth } from "@frubble/react-sdk";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Redirect } from "@/shared/components/redirect";
import { graphqlErrorCode } from "@/shared/graphql-error";
import { returnPath, withFrom } from "@/shared/return-path";

/** The error to show for a failed sign-in, by the API's code. */
function errorKey(error: unknown) {
	switch (graphqlErrorCode(error)) {
		case "TOO_MANY_REQUESTS":
			return "errors.tooMany";
		// A wrong email or password
		case "BAD_USER_INPUT":
			return "errors.invalid";
		default:
			return "errors.generic";
	}
}

/** Email and password, then back where the guard sent the user from. */
export function SignInScreen() {
	const { t } = useTranslation("auth");
	const { isAuthenticated, isPending, signIn } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [error, setError] = useState<ReturnType<typeof errorKey> | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const destination = returnPath(searchParams.get("from"));
	const wasReset = searchParams.get("reset") === "1";

	if (!isPending && isAuthenticated) {
		return <Redirect to={destination} />;
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		setSubmitting(true);
		setError(null);
		try {
			await signIn({
				email: String(form.get("email") ?? ""),
				password: String(form.get("password") ?? ""),
			});
			router.replace(destination);
		} catch (caught) {
			setError(errorKey(caught));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<main data-testid="sign-in">
			<h1>{t("signIn.title")}</h1>
			{wasReset ? <p data-testid="sign-in-reset">{t("signIn.reset")}</p> : null}
			<form onSubmit={submit}>
				<label>
					{t("email")}
					<input
						data-testid="sign-in-email"
						name="email"
						type="email"
						autoComplete="email"
						required
					/>
				</label>
				<label>
					{t("password")}
					<input
						data-testid="sign-in-password"
						name="password"
						type="password"
						autoComplete="current-password"
						required
					/>
				</label>
				{error ? (
					<p role="alert" data-testid="sign-in-error">
						{t(error)}
					</p>
				) : null}
				<button
					data-testid="sign-in-submit"
					type="submit"
					disabled={submitting}
				>
					{submitting ? t("signIn.submitting") : t("signIn.submit")}
				</button>
			</form>
			<p>
				<Link
					data-testid="sign-in-sign-up"
					href={withFrom("/sign-up", searchParams.get("from"))}
				>
					{t("signIn.signUp")}
				</Link>
			</p>
			<p>
				<Link data-testid="sign-in-forgot" href="/reset-password">
					{t("signIn.forgot")}
				</Link>
			</p>
		</main>
	);
}
