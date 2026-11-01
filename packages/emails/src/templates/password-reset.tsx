import type { TEmailLinks } from "../index";
import { Code } from "../shared/components/code/index";
import { Heading } from "../shared/components/heading/index";
import { Layout } from "../shared/components/layout/index";
import { Paragraph } from "../shared/components/paragraph/index";

// Transactional: the code that lets the reader choose a new password.
export function PasswordResetEmail({
	code,
	supportUrl,
}: { code: string } & TEmailLinks) {
	return (
		<Layout
			preview={`Your password reset code is ${code}`}
			supportUrl={supportUrl}
		>
			<Heading>Reset your password</Heading>
			<Paragraph>
				We got a request to reset the password on your Frubble account. Enter
				this code in the app to choose a new one:
			</Paragraph>
			<Code>{code}</Code>
			<Paragraph variant="muted">
				This code expires in 15 minutes. If you didn't request a reset, you can
				safely ignore this email: your password won't change.
			</Paragraph>
		</Layout>
	);
}
