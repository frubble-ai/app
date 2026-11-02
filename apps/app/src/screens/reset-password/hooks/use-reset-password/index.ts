import { useAuth } from "@frubble/react-sdk";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCodeFlow } from "@/shared/code-flow";

/**
 * Resetting a forgotten password in two steps: the email, which the API sends a code to when it has
 * an account; then the code with a new password. The reset revokes every session, so it ends on
 * sign-in.
 */
export function useResetPassword() {
	const { requestPasswordReset, resetPassword } = useAuth();
	const router = useRouter();
	const { run, ...flow } = useCodeFlow(requestPasswordReset);

	function reset(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		void run(async () => {
			await resetPassword({
				email: flow.email ?? "",
				code: String(form.get("code") ?? "").trim(),
				newPassword: String(form.get("password") ?? ""),
			});
			router.replace("/sign-in?reset=1");
		});
	}

	return { ...flow, reset };
}
