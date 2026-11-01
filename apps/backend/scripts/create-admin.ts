import { runUseCaseScript } from "@/shared/run-script";
import { requestAdminSignUpCodeUseCase } from "@/use-cases/cases/request-admin-sign-up-code.use-case";

// Invite a system admin: `yarn workspace @frubble/backend create-admin <email>`. Emails an invite
// code; signing up with it creates a `system_admin`.
const email = process.argv[2];
if (!email) {
	console.error("Usage: yarn workspace @frubble/backend create-admin <email>");
	process.exit(1);
}

await runUseCaseScript("create-admin", async () => {
	await requestAdminSignUpCodeUseCase({ email });
	// The address stays out of the logs; the operator typed it.
	return "Invite code sent.";
});
