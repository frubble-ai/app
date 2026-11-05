import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { generateDbEnv } from "../__mocks__/generate-db-env";
import { databaseUrl, dbConnectionFromEnv, dbEnvSchema } from "../env";

describe("databaseUrl", () => {
	it("keeps credentials with URL syntax intact, so a password with @ or / still connects", () => {
		const user = `${faker.word.noun()}@ops`;
		const password = `${faker.string.alphanumeric(8)}:/@#?%`;
		const host = faker.internet.domainName();

		const url = new URL(
			databaseUrl({ user, password, host, port: "5432", name: "frubble" }),
		);

		expect(decodeURIComponent(url.username)).toBe(user);
		expect(decodeURIComponent(url.password)).toBe(password);
		expect(url.hostname).toBe(host);
		expect(url.port).toBe("5432");
		expect(url.pathname).toBe("/frubble");
	});
});

describe("dbEnvSchema", () => {
	it("reads a complete environment into the connection databaseUrl takes", () => {
		const env = generateDbEnv();

		const connection = dbConnectionFromEnv(dbEnvSchema.parse(env));

		expect(connection).toEqual({
			user: env.DB_USER,
			password: env.DB_PASSWORD,
			host: env.DB_HOST,
			port: env.DB_PORT,
			name: env.DB_NAME,
		});
	});

	it.each(["DB_USER", "DB_PASSWORD", "DB_HOST", "DB_NAME"] as const)(
		"fails at startup without %s",
		(name) => {
			const { [name]: _missing, ...env } = generateDbEnv();

			expect(dbEnvSchema.safeParse(env).success).toBe(false);
		},
	);

	it.each(["abc", "5432x", "123456"])(
		"rejects a DB_PORT that is not a port number (%s)",
		(port) => {
			expect(
				dbEnvSchema.safeParse({ ...generateDbEnv(), DB_PORT: port }).success,
			).toBe(false);
		},
	);

	it.each([undefined, ""])(
		"connects on Postgres's default port 5432 when DB_PORT is %o, as libpq does",
		(port) => {
			const env = { ...generateDbEnv(), DB_PORT: port };

			expect(dbEnvSchema.parse(env).DB_PORT).toBe("5432");
		},
	);

	it("treats a blank DB_CA_PEM as unset, the way local env files leave it", () => {
		const parsed = dbEnvSchema.parse({ ...generateDbEnv(), DB_CA_PEM: "  " });

		expect(parsed.DB_CA_PEM).toBeUndefined();
	});
});
