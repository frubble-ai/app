import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { getWorkerConfig } from "@/services/worker/lib/config";

function generateEnv(overrides: Record<string, string | undefined> = {}) {
	return { APP_ENV: "local", ...overrides };
}

describe("getWorkerConfig", () => {
	it.each(["mailgun", "resend"] as const)(
		"configures the %s adapter from the generic variables",
		(provider) => {
			const apiKey = faker.string.alphanumeric(32);
			const domain = `stg.${faker.internet.domainName()}`;

			const config = getWorkerConfig(
				generateEnv({
					EMAIL_PROVIDER: provider,
					EMAIL_API_KEY: apiKey,
					EMAIL_DOMAIN: domain,
					EMAIL_FROM: `noreply@${domain}`,
				}),
			);

			expect(config).toMatchObject({
				provider,
				host: "0.0.0.0",
				port: 8080,
			});
			expect(config.email).toEqual({
				apiKey,
				apiUrl: undefined,
				domain,
				fromEmail: `noreply@${domain}`,
				fromName: "Frubble",
			});
		},
	);

	it.each([
		{
			label: "a provider without its key",
			env: { EMAIL_PROVIDER: "mailgun", EMAIL_DOMAIN: "stg.example.com" },
			message: /EMAIL_API_KEY/,
		},
		{
			label: "a provider without its domain",
			env: { EMAIL_PROVIDER: "mailgun", EMAIL_API_KEY: "k" },
			message: /EMAIL_DOMAIN/,
		},
		{
			label: "a provider it does not ship",
			env: { EMAIL_PROVIDER: "pigeon", EMAIL_API_KEY: "k", EMAIL_DOMAIN: "d" },
			message: /EMAIL_PROVIDER/,
		},
		{ label: "no provider", env: {}, message: /EMAIL_PROVIDER/ },
	])("refuses to start with $label", ({ env, message }) => {
		expect(() => getWorkerConfig(generateEnv(env))).toThrow(message);
	});
});
