import { X509Certificate } from "node:crypto";
import type { ConnectionOptions } from "node:tls";
import type { TDbEnv } from "./env";
import { tlsAgainstInstanceCa } from "./tls";

/** What drizzle-kit connects with. Structured, because a bare URL carries no TLS settings. */
export type TDrizzleCredentials = {
	host: string;
	port: number;
	user: string;
	password: string;
	database: string;
	/**
	 * Always present. drizzle-kit reads a missing `ssl` as "TLS against the system CAs", which a
	 * database without TLS refuses, so a connection that is not TLS says `false`.
	 */
	ssl: ConnectionOptions | false;
};

const CERTIFICATE_BLOCK =
	/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g;

/**
 * Throws unless `caPem` holds at least one certificate and every certificate in it parses. A CA
 * that cannot be read must stop the CLI: connecting without it would send the password to
 * whoever answers. The message never repeats the value.
 */
function assertUsableCa(caPem: string): void {
	const blocks = caPem.match(CERTIFICATE_BLOCK);
	if (!blocks) {
		throw new Error("DB_CA_PEM holds no PEM certificate");
	}
	for (const block of blocks) {
		try {
			new X509Certificate(block);
		} catch {
			throw new Error("DB_CA_PEM holds a certificate that cannot be parsed");
		}
	}
}

/**
 * The credentials drizzle-kit connects with. With `DB_CA_PEM` set the connection is TLS against
 * that CA and drizzle-kit is given the TLS options itself; with a `url` it would take none and
 * connect in clear text. It refuses, instead of falling back, when the CA is set but unusable,
 * and when `appEnv` names a deployed environment but no CA is set: the API and the migrate
 * script refuse the same way.
 *
 * @param appEnv `APP_ENV` when the shell sets it. Unset means a developer's machine, which
 *   connects to the compose database without TLS.
 */
export function drizzleCredentials(
	env: TDbEnv,
	appEnv?: string,
): TDrizzleCredentials {
	const credentials: TDrizzleCredentials = {
		host: env.DB_HOST,
		port: Number(env.DB_PORT),
		user: env.DB_USER,
		password: env.DB_PASSWORD,
		database: env.DB_NAME,
		ssl: false,
	};
	if (env.DB_CA_PEM === undefined) {
		if (appEnv !== undefined && appEnv !== "" && appEnv !== "local") {
			throw new Error(`DB_CA_PEM is required with APP_ENV=${appEnv}`);
		}
		return credentials;
	}
	assertUsableCa(env.DB_CA_PEM);
	return { ...credentials, ssl: tlsAgainstInstanceCa(env.DB_CA_PEM) };
}
