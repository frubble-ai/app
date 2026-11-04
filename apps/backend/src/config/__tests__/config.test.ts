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
		APP_URL: "http://localhost:3000/",
		COMPOSIO_API_KEY: faker.string.alphanumeric(32),
		COMPOSIO_AUTH_CONFIG_IDS:
			"github=ac_github1, linear=ac_linear1,slack=ac_slack1",
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
			appUrl: "http://localhost:3000",
			composio: {
				apiKey: env.COMPOSIO_API_KEY,
				authConfigIds: {
					github: "ac_github1",
					linear: "ac_linear1",
					slack: "ac_slack1",
				},
			},
			cors: { origin: [] },
			api: { host: "0.0.0.0", port: 8080, trustedProxies: 1 },
			pubsub: { emailsTopic: "emails" },
		});
	});

	it("installs the GitHub App from github.com/apps/<slug>, and has nothing to install without one", () => {
		const slug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();
		withEnv(generateEnv({ GITHUB_APP_SLUG: slug }));
		expect(buildConfig().github.appInstallUrl).toBe(
			`https://github.com/apps/${slug}/installations/new`,
		);

		withEnv(generateEnv({ GITHUB_APP_SLUG: undefined }));
		expect(buildConfig().github.appInstallUrl).toBeUndefined();
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
			label: "a GitHub App slug that is not one",
			env: { GITHUB_APP_SLUG: "Frubble AI/../x" },
			message: /GITHUB_APP_SLUG/,
		},
		{
			label: "no database CA outside local",
			env: { APP_ENV: "stg" },
			message: /DB_CA_PEM/,
		},
	])("refuses to start with $label", ({ env, message }) => {
		withEnv(generateEnv(env));

		expect(() => buildConfig()).toThrow(message);
	});

	it("refuses auth configs missing a provider or not shaped provider=ac_…", () => {
		withEnv(
			generateEnv({ COMPOSIO_AUTH_CONFIG_IDS: "github=ac_x,linear=oops" }),
		);

		expect(() => buildConfig()).toThrow(/linear.*ac_|slack/);
	});

	it("names every missing variable at once", () => {
		withEnv(generateEnv({ DB_USER: undefined, BETTER_AUTH_SECRET: undefined }));

		expect(() => buildConfig()).toThrow(
			/DB_USER.*BETTER_AUTH_SECRET|BETTER_AUTH_SECRET.*DB_USER/,
		);
	});
});
