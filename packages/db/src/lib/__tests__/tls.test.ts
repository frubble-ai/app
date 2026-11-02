import { describe, expect, it } from "vitest";
import { tlsAgainstInstanceCa } from "../tls";

describe("tlsAgainstInstanceCa", () => {
	it("verifies the chain against the CA and accepts the private IP the cert does not name", () => {
		const ssl = tlsAgainstInstanceCa("-----BEGIN CERTIFICATE-----");

		expect(ssl).toMatchObject({
			ca: "-----BEGIN CERTIFICATE-----",
			rejectUnauthorized: true,
		});
		const check = (
			ssl as { checkServerIdentity: (host: string, cert: object) => unknown }
		).checkServerIdentity;
		expect(check("10.48.208.3", {})).toBeUndefined();
	});
});
