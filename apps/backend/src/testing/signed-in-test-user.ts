import { faker } from "@faker-js/faker";
import { user } from "@frubble/db";
import { eq } from "drizzle-orm";
import type { TTestClone } from "./integration-bootstrap";
import { signUpTestUser } from "./signup-test-user";

/** A verified user with a session, as the app's sign-up leaves one: `headers` carry the bearer. */
export async function signedInTestUser(
	clone: TTestClone,
	email = `test+${faker.string.alphanumeric(10).toLowerCase()}@example.com`,
) {
	const signedUp = await signUpTestUser(clone.auth, { email });
	await clone.db
		.update(user)
		.set({ emailVerified: true })
		.where(eq(user.id, signedUp.id));
	const session = await clone.auth.api.signInEmail({
		body: { email, password: "password123" },
	});
	return {
		...signedUp,
		headers: new Headers({ authorization: `Bearer ${session.token}` }),
	};
}

export type TSignedInTestUser = Awaited<ReturnType<typeof signedInTestUser>>;
