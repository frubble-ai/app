import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { CA_PEM_PARSER_FIXTURE } from "../__mocks__/ca-pem-parser-fixture";
import { generateDbEnv } from "../__mocks__/generate-db-env";
import { drizzleCredentials } from "../drizzle-credentials";
import { dbEnvSchema } from "../env";

function parsedDbEnv(caPem?: string) {
	return dbEnvSchema.parse(generateDbEnv(caPem));
}

describe("drizzleCredentials", () => {
	it("passes the connection as separate fields, never as a URL", () => {
		const env = parsedDbEnv();

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
		const ca = CA_PEM_PARSER_FIXTURE;

		const credentials = drizzleCredentials(parsedDbEnv(ca), "stg");

		expect(credentials.ssl).toMatchObject({ ca, rejectUnauthorized: true });
	});

	it("takes a CA bundle of several certificates", () => {
		const ca = `${CA_PEM_PARSER_FIXTURE}\n${CA_PEM_PARSER_FIXTURE}`;

		const credentials = drizzleCredentials(parsedDbEnv(ca));

		expect(credentials.ssl).toMatchObject({ ca, rejectUnauthorized: true });
	});

	it.each([
		["text that is not a certificate", faker.string.alphanumeric(40)],
		[
			"a certificate whose body is not valid",
			`-----BEGIN CERTIFICATE-----\n${faker.string.alphanumeric(64)}\n-----END CERTIFICATE-----`,
		],
	])("refuses to start when the CA is %s", (_name, ca) => {
		expect(() => drizzleCredentials(parsedDbEnv(ca))).toThrow(/DB_CA_PEM/);
	});

	it.each([
		[
			"a second certificate cut short",
			(ca: string) =>
				`${ca}\n-----BEGIN CERTIFICATE-----\n${faker.string.alphanumeric(40)}`,
		],
		[
			"a key after the certificate",
			(ca: string) =>
				`${ca}\n-----BEGIN PRIVATE KEY-----\n${faker.string.alphanumeric(40)}\n-----END PRIVATE KEY-----`,
		],
	])(
		"refuses a bundle with %s, rather than trusting only the part that parses",
		(_name, build) => {
			expect(() =>
				drizzleCredentials(parsedDbEnv(build(CA_PEM_PARSER_FIXTURE))),
			).toThrow(/DB_CA_PEM/);
		},
	);

	it("does not repeat the CA value in the error", () => {
		const secret = faker.string.alphanumeric(64);
		const ca = `-----BEGIN CERTIFICATE-----\n${secret}\n-----END CERTIFICATE-----`;
		let message = "";

		try {
			drizzleCredentials(parsedDbEnv(ca));
		} catch (error) {
			message = (error as Error).message;
		}

		expect(message).toMatch(/DB_CA_PEM/);
		expect(message).not.toContain(secret);
	});

	it.each(["dev", "stg", "prd", "production", faker.word.noun()])(
		"refuses APP_ENV=%s without a CA, as the API and the migrate script do for anything but local",
		(appEnv) => {
			expect(() => drizzleCredentials(parsedDbEnv(), appEnv)).toThrow(
				/DB_CA_PEM is required/,
			);
		},
	);

	it.each([undefined, "", "local"])(
		"says ssl is false, not absent, on a developer's machine (APP_ENV %j): drizzle-kit reads a missing ssl as TLS",
		(appEnv) => {
			const credentials = drizzleCredentials(parsedDbEnv(), appEnv);

			expect(credentials).toHaveProperty("ssl", false);
		},
	);
});
