import type { TEmailLinks } from "../index";
import { Heading } from "../shared/components/heading/index";
import { Layout } from "../shared/components/layout/index";
import { Paragraph } from "../shared/components/paragraph/index";

// Transactional: sent in place of a sign-up code when the address already has an account, so the
// app's answer to the request never says whether one exists.
export function SignupAccountExistsEmail({ supportUrl }: TEmailLinks) {
	return (
		<Layout
			preview="You already have a Frubble account"
			supportUrl={supportUrl}
		>
			<Heading>You already have an account</Heading>
			<Paragraph>
				Someone asked to sign up for Frubble with this email address, which
				already has an account. Sign in with it instead; if you forgot the
				password, you can reset it from the sign-in page.
			</Paragraph>
			<Paragraph variant="muted">
				If you didn't ask, you can safely ignore this email: nothing changed on
				your account.
			</Paragraph>
		</Layout>
	);
}
