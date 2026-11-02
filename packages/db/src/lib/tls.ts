import type pg from "pg";

/**
 * TLS against a Cloud SQL instance's own CA. The chain is verified; the hostname is not, since
 * the server certificate names the instance, never the private IP the client dials. The CA is
 * per instance, so only that instance's certificate chains to it.
 */
export function tlsAgainstInstanceCa(caPem: string): pg.PoolConfig["ssl"] {
	return {
		ca: caPem,
		rejectUnauthorized: true,
		checkServerIdentity: () => undefined,
	};
}
