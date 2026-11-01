import { faker } from "@faker-js/faker";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildConfig } from "@/config";

function generateEnv(overrides: Record<string, string | undefined> = {}) {
	return {
		APP_ENV: "local",
		DB_USER: faker.internet.username(),
		DB_PASSWORD: faker.internet.password(),
		DB_HOST: "localhost",
		DB_NAME: "frubble",
		BETTER_AUTH_URL: "http://localhost:8080/",
		BETTER_AUTH_SECRET: faker.string.alphanumeric(48),
		PUBSUB_EMAILS_TOPIC: "emails",
		...overrides,
	};
}

function withEnv(env: Record<string, string | undefined>) {
	vi.stubEnv("APP_ENV", "");
	for (const [name, value] of Object.entries(env)) {
		vi.stubEnv(name, value ?? "");
	}
}

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("buildConfig", () => {
	it("reads a local environment with the defaults filled in", () => {
		const env = generateEnv();
		withEnv(env);

		const config = buildConfig();

		expect(config).toMatchObject({
			appEnv: "local",
			db: {
				user: env.DB_USER,
				host: "localhost",
				port: "5432",
				caPem: undefined,
			},
			publicUrl: "http://localhost:8080",
			cors: { origin: [] },
			email: { delivery: "none", fixedCode: "111111" },
			api: { host: "0.0.0.0", port: 8080 },
			pubsub: { emailsTopic: "emails" },
		});
	});

	it("turns email delivery on when the worker has a provider", () => {
		withEnv(generateEnv({ EMAIL_PROVIDER: "mailgun" }));

		expect(buildConfig().email).toEqual({ delivery: "provider" });
	});

	it("splits CORS origins and keeps them whole", () => {
		withEnv(
			generateEnv({
				CORS_ORIGIN: " https://app.example.com, http://localhost:3000 ",
			}),
		);

		expect(buildConfig().cors.origin).toEqual([
			"https://app.example.com",
			"http://localhost:3000",
		]);
	});

	it.each([
		{
			label: "a wildcard origin",
			env: { CORS_ORIGIN: "https://*.example.com" },
			message: /wildcard/,
		},
		{
			label: "a bare host as origin",
			env: { CORS_ORIGIN: "app.example.com" },
			message: /origin/,
		},
		{
			label: "a short auth secret",
			env: { BETTER_AUTH_SECRET: "short" },
			message: /BETTER_AUTH_SECRET/,
		},
		{ label: "an unknown APP_ENV", env: { APP_ENV: "qa" }, message: /APP_ENV/ },
		{
			label: "no database CA outside local",
			env: { APP_ENV: "stg" },
			message: /DB_CA_PEM/,
		},
		{
			label: "no email provider in prd",
			env: { APP_ENV: "prd", DB_CA_PEM: "cert" },
			message: /EMAIL_PROVIDER/,
		},
	])("refuses to start with $label", ({ env, message }) => {
		withEnv(generateEnv(env));

		expect(() => buildConfig()).toThrow(message);
	});

	it("names every missing variable at once", () => {
		withEnv(generateEnv({ DB_USER: undefined, BETTER_AUTH_SECRET: undefined }));

		expect(() => buildConfig()).toThrow(
			/DB_USER.*BETTER_AUTH_SECRET|BETTER_AUTH_SECRET.*DB_USER/,
		);
	});
});
