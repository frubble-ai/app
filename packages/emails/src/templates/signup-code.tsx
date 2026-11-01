import type { TEmailLinks } from "../index";
import { Code } from "../shared/components/code/index";
import { Heading } from "../shared/components/heading/index";
import { Layout } from "../shared/components/layout/index";
import { Paragraph } from "../shared/components/paragraph/index";

// Transactional: the code the reader types to finish signing up. An admin invite is the same code
// with a longer life.
export function SignupCodeEmail({
	code,
	isAdminInvite,
	supportUrl,
}: { code: string; isAdminInvite: boolean } & TEmailLinks) {
	return (
		<Layout preview={`Your Frubble code is ${code}`} supportUrl={supportUrl}>
			<Heading>
				{isAdminInvite ? "You're invited to Frubble" : "Confirm your email"}
			</Heading>
			<Paragraph>
				{isAdminInvite
					? "You've been invited to join Frubble as an administrator. Enter this code when you sign up to create your account:"
					: "Enter this code in the app to finish creating your Frubble account:"}
			</Paragraph>
			<Code>{code}</Code>
			<Paragraph variant="muted">
				{isAdminInvite
					? "This invite expires in 72 hours."
					: "This code expires in 15 minutes."}{" "}
				If you didn't request it, you can safely ignore this email.
			</Paragraph>
		</Layout>
	);
}
