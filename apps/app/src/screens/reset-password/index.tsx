import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useResetPassword } from "@/screens/reset-password/hooks/use-reset-password";
import { CodeFlowError } from "@/shared/components/code-flow-error";

/** The code's digits (the API's `ONE_TIME_CODE_LENGTH`). */
const CODE_LENGTH = 6;

/** A new password for a forgotten one: the email first, then the code sent to it. */
export function ResetPasswordScreen() {
	const { t } = useTranslation("auth");
	const flow = useResetPassword();

	return (
		<main className="auth" data-testid="reset-password">
			<h1>{t("reset.title")}</h1>
			{flow.email === null ? (
				<form
					data-testid="reset-password-email-step"
					onSubmit={flow.requestCode}
				>
					<label>
						{t("email")}
						<input
							data-testid="reset-password-email"
							name="email"
							type="email"
							autoComplete="email"
							required
						/>
					</label>
					<CodeFlowError error={flow.error} testId="reset-password-error" />
					<button
						data-testid="reset-password-send"
						type="submit"
						disabled={flow.submitting}
					>
						{t("reset.send")}
					</button>
				</form>
			) : (
				<form data-testid="reset-password-code-step" onSubmit={flow.reset}>
					<p data-testid="reset-password-sent">
						{t("reset.sent", { email: flow.email })}{" "}
						<button type="button" onClick={flow.changeEmail}>
							{t("reset.changeEmail")}
						</button>
					</p>
					<label>
						{t("code")}
						<input
							data-testid="reset-password-code"
							name="code"
							inputMode="numeric"
							autoComplete="one-time-code"
							pattern={`\\d{${CODE_LENGTH}}`}
							maxLength={CODE_LENGTH}
							required
						/>
					</label>
					<label>
						{t("reset.newPassword")}
						<input
							data-testid="reset-password-password"
							name="password"
							type="password"
							autoComplete="new-password"
							minLength={8}
							required
						/>
					</label>
					<CodeFlowError error={flow.error} testId="reset-password-error" />
					<button
						data-testid="reset-password-submit"
						type="submit"
						disabled={flow.submitting}
					>
						{flow.submitting ? t("reset.submitting") : t("reset.submit")}
					</button>
				</form>
			)}
			<p>
				<Link data-testid="reset-password-sign-in" href="/sign-in">
					{t("reset.signIn")}
				</Link>
			</p>
		</main>
	);
}
