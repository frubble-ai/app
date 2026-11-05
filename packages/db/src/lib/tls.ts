import type { ConnectionOptions } from "node:tls";

/**
 * TLS against a Cloud SQL instance's own CA. The chain is verified; the hostname is not, since
 * the server certificate names the instance, never the private IP the client dials. The CA is
 * per instance, so only that instance's certificate chains to it.
 */
export function tlsAgainstInstanceCa(caPem: string): ConnectionOptions {
	return {
		ca: caPem,
		rejectUnauthorized: true,
		checkServerIdentity: () => undefined,
	};
}
