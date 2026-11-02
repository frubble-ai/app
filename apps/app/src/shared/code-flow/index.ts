import { type FormEvent, useState } from "react";
import { graphqlErrorCode, graphqlErrorMessage } from "@/shared/graphql-error";

/** What a code flow (sign-up, password reset) shows for a failed step. */
export type TCodeFlowError =
	// The API's reason (a wrong or expired code, a weak password)
	{ message: string } | { key: "errors.tooMany" | "errors.generic" };

/** The error to show for a failed code step, by the API's code. */
export function codeFlowError(caught: unknown): TCodeFlowError {
	const message = graphqlErrorMessage(caught);
	if (graphqlErrorCode(caught) === "TOO_MANY_REQUESTS") {
		return { key: "errors.tooMany" };
	}
	if (graphqlErrorCode(caught) === "BAD_USER_INPUT" && message) {
		return { message };
	}
	return { key: "errors.generic" };
}

/**
 * The two steps every code flow shares: the email, which `sendCode` asks the API to send a code to,
 * then a form that uses the code. `run` does one step, with its pending state and its error.
 */
export function useCodeFlow(
	sendCode: (input: { email: string }) => Promise<unknown>,
) {
	const [email, setEmail] = useState<string | null>(null);
	const [error, setError] = useState<TCodeFlowError | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function run(step: () => Promise<void>) {
		setSubmitting(true);
		setError(null);
		try {
			await step();
		} catch (caught) {
			setError(codeFlowError(caught));
		} finally {
			setSubmitting(false);
		}
	}

	/** The first step's form: sends the code, then moves on to the second step. */
	function requestCode(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const address = String(
			new FormData(event.currentTarget).get("email") ?? "",
		);
		void run(async () => {
			await sendCode({ email: address });
			setEmail(address);
		});
	}

	return {
		/** Where the code went; null until the first step is done. */
		email,
		requestCode,
		/** Back to the first step, to use another address. */
		changeEmail: () => setEmail(null),
		error,
		submitting,
		run,
	};
}
