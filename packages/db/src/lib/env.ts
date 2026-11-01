import { z } from "zod";

/** A blank variable (`DB_CA_PEM=`) counts as unset: a required one is missing, an optional one takes its default. */
export function envVar<TSchema extends z.ZodType>(schema: TSchema) {
	return z.preprocess(
		(value) =>
			typeof value === "string" && value.trim() === "" ? undefined : value,
		schema,
	);
}

/** The Postgres connection as the API, the scripts and drizzle-kit read it from env. */
export const dbEnvSchema = z.object({
	DB_USER: z.string().min(1),
	DB_PASSWORD: z.string().min(1),
	DB_HOST: z.string().min(1),
	/** Postgres's own default when unset, as libpq does. */
	DB_PORT: envVar(
		z
			.string()
			.regex(/^\d{1,5}$/, "must be a port number")
			.default("5432"),
	),
	DB_NAME: z.string().min(1),
	/** The server's CA certificate, PEM. Required outside local, where the connection is TLS. */
	DB_CA_PEM: envVar(z.string().min(1).optional()),
});

export type TDbEnv = z.infer<typeof dbEnvSchema>;

export type TDbConnection = {
	user: string;
	password: string;
	host: string;
	port: string;
	name: string;
};

/** `postgresql://user:password@host:port/name`, credentials URL-encoded. */
export function databaseUrl(connection: TDbConnection): string {
	return `postgresql://${encodeURIComponent(connection.user)}:${encodeURIComponent(connection.password)}@${connection.host}:${connection.port}/${connection.name}`;
}

export function dbConnectionFromEnv(env: TDbEnv): TDbConnection {
	return {
		user: env.DB_USER,
		password: env.DB_PASSWORD,
		host: env.DB_HOST,
		port: env.DB_PORT,
		name: env.DB_NAME,
	};
}
