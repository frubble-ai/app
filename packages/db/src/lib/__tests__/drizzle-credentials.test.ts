import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { generateCaPem } from "../__mocks__/generate-ca-pem";
import { drizzleCredentials } from "../drizzle-credentials";
import { dbEnvSchema } from "../env";

function generateDbEnv(caPem?: string) {
	return dbEnvSchema.parse({
		DB_USER: faker.internet.username(),
		DB_PASSWORD: faker.internet.password(),
		DB_HOST: faker.internet.domainName(),
		DB_PORT: String(faker.internet.port()),
		DB_NAME: faker.word.noun(),
		DB_CA_PEM: caPem,
	});
}

describe("drizzleCredentials", () => {
	it("passes the connection as separate fields, never as a URL", () => {
		const env = generateDbEnv();

		const credentials = drizzleCredentials(env);

		expect(credentials).toEqual({
			host: env.DB_HOST,
			port: Number(env.DB_PORT),
			user: env.DB_USER,
			password: env.DB_PASSWORD,
			database: env.DB_NAME,
			ssl: false,
		});
	});

	it("connects over TLS and verifies the server against the CA when one is set", () => {
		const ca = generateCaPem();

		const credentials = drizzleCredentials(generateDbEnv(ca), "stg");

		expect(credentials.ssl).toMatchObject({ ca, rejectUnauthorized: true });
	});

	it("takes a CA bundle of several certificates", () => {
		const ca = `${generateCaPem()}\n${generateCaPem()}`;

		const credentials = drizzleCredentials(generateDbEnv(ca));

		expect(credentials.ssl).toMatchObject({ ca, rejectUnauthorized: true });
	});

	it.each([
		["text that is not a certificate", faker.string.alphanumeric(40)],
		[
			"a certificate whose body is not valid",
			`-----BEGIN CERTIFICATE-----\n${faker.string.alphanumeric(64)}\n-----END CERTIFICATE-----`,
		],
	])("refuses to start when the CA is %s", (_name, ca) => {
		expect(() => drizzleCredentials(generateDbEnv(ca))).toThrow(/DB_CA_PEM/);
	});

	it("does not repeat the CA value in the error", () => {
		const secret = faker.string.alphanumeric(64);
		const ca = `-----BEGIN CERTIFICATE-----\n${secret}\n-----END CERTIFICATE-----`;
		let message = "";

		try {
			drizzleCredentials(generateDbEnv(ca));
		} catch (error) {
			message = (error as Error).message;
		}

		expect(message).toMatch(/DB_CA_PEM/);
		expect(message).not.toContain(secret);
	});

	it.each(["dev", "stg", "prd"])(
		"refuses a %s environment without a CA, as the API and the migrate script do",
		(appEnv) => {
			expect(() => drizzleCredentials(generateDbEnv(), appEnv)).toThrow(
				/DB_CA_PEM is required/,
			);
		},
	);

	it.each([undefined, "", "local"])(
		"says ssl is false, not absent, on a developer's machine (APP_ENV %j): drizzle-kit reads a missing ssl as TLS",
		(appEnv) => {
			const credentials = drizzleCredentials(generateDbEnv(), appEnv);

			expect(credentials).toHaveProperty("ssl", false);
		},
	);
});
