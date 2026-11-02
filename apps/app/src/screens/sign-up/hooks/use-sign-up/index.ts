import { useAuth } from "@frubble/react-sdk";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCodeFlow } from "@/shared/code-flow";

/**
 * Signing up in two steps: the email, which the API sends a code to; then the code with a name and a
 * password, which creates the account and signs in.
 */
export function useSignUp() {
	const { requestSignUpCode, signUp } = useAuth();
	const router = useRouter();
	const { run, ...flow } = useCodeFlow(requestSignUpCode);

	function createAccount(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		void run(async () => {
			await signUp({
				email: flow.email ?? "",
				code: String(form.get("code") ?? "").trim(),
				name: String(form.get("name") ?? ""),
				password: String(form.get("password") ?? ""),
			});
			router.replace("/");
		});
	}

	return { ...flow, createAccount };
}
