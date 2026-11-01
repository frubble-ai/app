import { faker } from "@faker-js/faker";
import { session } from "@frubble/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getConfig } from "@/config";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import { signUpTestUser } from "@/testing/signup-test-user";
import { signInWithEmailPasswordUseCase } from "@/use-cases/cases/sign-in-with-email-password.use-case";

const { getClone } = setupIntegrationTestContext();

function newEmail(): string {
	return `sign-in+${faker.string.alphanumeric(8).toLowerCase()}@example.com`;
}

describe("signInWithEmailPasswordUseCase", () => {
	it("a customer with valid credentials gets a session token and a persisted session", async () => {
		const clone = getClone();
		const email = newEmail();
		const password = `Pw-${faker.string.alphanumeric(12)}`;
		const name = faker.person.fullName();
		const customer = await signUpTestUser(clone.auth, {
			email,
			password,
			name,
		});
		const before = await clone.db
			.select()
			.from(session)
			.where(eq(session.userId, customer.id));

		const result = await signInWithEmailPasswordUseCase({ email, password });

		expect(result).toEqual({
			sessionToken: expect.any(String),
			user: { id: customer.id, name, email, role: "customer" },
		});
		const after = await clone.db
			.select()
			.from(session)
			.where(eq(session.userId, customer.id));
		expect(after.length).toBeGreaterThan(before.length);
		expect(after.some((row) => row.token === result.sessionToken)).toBe(true);
	});

	it("wrong credentials are refused and no session is created", async () => {
		const clone = getClone();
		const email = newEmail();
		const customer = await signUpTestUser(clone.auth, { email });
		const before = await clone.db
			.select()
			.from(session)
			.where(eq(session.userId, customer.id));

		await expect(
			signInWithEmailPasswordUseCase({
				email,
				password: "definitely-the-wrong-password",
			}),
		).rejects.toMatchObject({
			name: "BadInputError",
			message: "Wrong email or password.",
		});
		const after = await clone.db
			.select()
			.from(session)
			.where(eq(session.userId, customer.id));
		expect(after).toHaveLength(before.length);
	});

	it("an unknown address gets the same answer as a wrong password", async () => {
		await expect(
			signInWithEmailPasswordUseCase({
				email: newEmail(),
				password: "password123",
			}),
		).rejects.toMatchObject({ message: "Wrong email or password." });
	});

	it("locks an address out after too many attempts, whatever the address they come from", async () => {
		const clone = getClone();
		const email = newEmail();
		await signUpTestUser(clone.auth, { email, password: "password123" });
		const { limit } = getConfig().authRateLimits.perEmail;

		for (let attempt = 0; attempt < limit; attempt++) {
			await signInWithEmailPasswordUseCase({
				email,
				password: "wrong-password",
				clientIp: faker.internet.ipv4(),
			}).catch(() => {});
		}

		await expect(
			signInWithEmailPasswordUseCase({
				email,
				password: "password123",
				clientIp: faker.internet.ipv4(),
			}),
		).rejects.toMatchObject({ name: "TooManyRequestsError" });
	});
});
