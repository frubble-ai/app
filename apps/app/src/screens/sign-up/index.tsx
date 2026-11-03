import { useAuth } from "@frubble/react-sdk";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useSignUp } from "@/screens/sign-up/hooks/use-sign-up";
import { CodeFlowError } from "@/shared/components/code-flow-error";
import { Redirect } from "@/shared/components/redirect";
import { returnPath, withFrom } from "@/shared/return-path";

/** The code's digits (the API's `ONE_TIME_CODE_LENGTH`). */
const CODE_LENGTH = 6;

/** Creates an account: the email first, then the code sent to it, a name and a password. */
export function SignUpScreen() {
	const { t } = useTranslation("auth");
	const { isAuthenticated, isPending } = useAuth();
	const from = useSearchParams().get("from");
	const signUp = useSignUp(returnPath(from));

	if (!isPending && isAuthenticated) return <Redirect to="/" />;

	return (
		<main data-testid="sign-up">
			<h1>{t("signUp.title")}</h1>
			{signUp.email === null ? (
				<form data-testid="sign-up-email-step" onSubmit={signUp.requestCode}>
					<label>
						{t("email")}
						<input
							data-testid="sign-up-email"
							name="email"
							type="email"
							autoComplete="email"
							required
						/>
					</label>
					<CodeFlowError error={signUp.error} testId="sign-up-error" />
					<button
						data-testid="sign-up-send"
						type="submit"
						disabled={signUp.submitting}
					>
						{t("signUp.send")}
					</button>
				</form>
			) : (
				<form data-testid="sign-up-code-step" onSubmit={signUp.createAccount}>
					<p data-testid="sign-up-sent">
						{t("signUp.sent", { email: signUp.email })}{" "}
						<button type="button" onClick={signUp.changeEmail}>
							{t("signUp.changeEmail")}
						</button>
					</p>
					<label>
						{t("code")}
						<input
							data-testid="sign-up-code"
							name="code"
							inputMode="numeric"
							autoComplete="one-time-code"
							pattern={`\\d{${CODE_LENGTH}}`}
							maxLength={CODE_LENGTH}
							required
						/>
					</label>
					<label>
						{t("signUp.name")}
						<input
							data-testid="sign-up-name"
							name="name"
							autoComplete="name"
							required
						/>
					</label>
					<label>
						{t("password")}
						<input
							data-testid="sign-up-password"
							name="password"
							type="password"
							autoComplete="new-password"
							minLength={8}
							required
						/>
					</label>
					<CodeFlowError error={signUp.error} testId="sign-up-error" />
					<button
						data-testid="sign-up-submit"
						type="submit"
						disabled={signUp.submitting}
					>
						{signUp.submitting ? t("signUp.submitting") : t("signUp.submit")}
					</button>
				</form>
			)}
			<p>
				<Link data-testid="sign-up-sign-in" href={withFrom("/sign-in", from)}>
					{t("signUp.signIn")}
				</Link>
			</p>
		</main>
	);
}
