import { faker } from "@faker-js/faker";

/** The database variables as a shell hands them over: strings, not yet parsed by `dbEnvSchema`. */
export function generateDbEnv(caPem?: string): Record<string, string> {
	return {
		DB_USER: faker.internet.username(),
		DB_PASSWORD: faker.internet.password(),
		DB_HOST: faker.internet.domainName(),
		DB_PORT: String(faker.internet.port()),
		DB_NAME: faker.word.noun(),
		...(caPem === undefined ? {} : { DB_CA_PEM: caPem }),
	};
}
