import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { tlsAgainstInstanceCa } from "../tls";

describe("tlsAgainstInstanceCa", () => {
	it("verifies the chain against the CA and accepts the private IP the cert does not name", () => {
		const ca = `-----BEGIN CERTIFICATE-----\n${faker.string.alphanumeric(64)}\n-----END CERTIFICATE-----`;
		const ip = faker.internet.ipv4();

		const ssl = tlsAgainstInstanceCa(ca);

		expect(ssl).toMatchObject({ ca, rejectUnauthorized: true });
		const check = (
			ssl as { checkServerIdentity: (host: string, cert: object) => unknown }
		).checkServerIdentity;
		expect(check(ip, {})).toBeUndefined();
	});
});
