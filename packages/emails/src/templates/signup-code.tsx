import type { TEmailLinks } from "../index";
import { Code } from "../shared/components/code/index";
import { Heading } from "../shared/components/heading/index";
import { Layout } from "../shared/components/layout/index";
import { Paragraph } from "../shared/components/paragraph/index";

// Transactional: the code the reader types to finish signing up.
export function SignupCodeEmail({
	code,
	supportUrl,
}: { code: string } & TEmailLinks) {
	return (
		<Layout preview={`Your Frubble code is ${code}`} supportUrl={supportUrl}>
			<Heading>Confirm your email</Heading>
			<Paragraph>
				Enter this code in the app to finish creating your Frubble account:
			</Paragraph>
			<Code>{code}</Code>
			<Paragraph variant="muted">
				This code expires in 15 minutes. If you didn't request it, you can
				safely ignore this email.
			</Paragraph>
		</Layout>
	);
}
