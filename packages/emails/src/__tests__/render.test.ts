import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { getSubject, renderEmail, type TEmail } from "../index";

function generateCode(): string {
	return faker.string.numeric(6);
}

describe("renderEmail", () => {
	it.each([
		{
			label: "the sign-up code",
			email: (code: string): TEmail => ({
				type: "signup.code_requested",
				props: { code },
			}),
			contains: ["Confirm your email", "15 minutes"],
			excludes: [],
		},
		{
			label: "the password reset code",
			email: (code: string): TEmail => ({
				type: "password.reset_requested",
				props: { code },
			}),
			contains: ["Reset your password", "15 minutes"],
			excludes: [],
		},
	])(
		"renders $label with the code and the brand",
		async ({ email, contains, excludes }) => {
			const code = generateCode();
			const { type, props } = email(code);

			const html = await renderEmail(type, props as never);

			expect(html).toContain(code);
			expect(html).toContain("Frubble");
			expect(html).toContain("Support");
			for (const needle of contains) expect(html).toContain(needle);
			for (const needle of excludes) expect(html).not.toContain(needle);
		},
	);

	it("renders the account-exists notice with the brand, a way back in and no code", async () => {
		const html = await renderEmail("signup.account_exists", {});

		expect(html).toContain("You already have an account");
		expect(html).toContain("Sign in");
		expect(html).toContain("Frubble");
		expect(html).not.toMatch(/\b\d{6}\b/);
		expect(getSubject("signup.account_exists")).toBe(
			"You already have a Frubble account",
		);
	});

	it("renders the organization invitation with its link and names", async () => {
		const props = {
			organizationName: faker.company.name(),
			inviterName: faker.person.fullName(),
			acceptUrl: faker.internet.url(),
		};

		const html = await renderEmail("organization.invitation_sent", props);

		expect(html).toContain(props.acceptUrl);
		expect(html).toContain("7 days");
		expect(getSubject("organization.invitation_sent")).toBe(
			"You're invited to Frubble",
		);
	});

	it("links the footer to the support address the worker passes", async () => {
		const supportUrl = faker.internet.url();

		const html = await renderEmail("password.reset_requested", {
			code: generateCode(),
			supportUrl,
		});

		expect(html).toContain(`href="${supportUrl}"`);
	});

	it.each(["signup.code_requested", "password.reset_requested"] as const)(
		"%s has a subject",
		(type) => {
			expect(getSubject(type).length).toBeGreaterThan(0);
		},
	);
});
