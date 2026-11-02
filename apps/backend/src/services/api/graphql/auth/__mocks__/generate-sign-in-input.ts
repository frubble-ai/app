import { faker } from "@faker-js/faker";

interface ISignInInput {
	email: string;
	password: string;
}

export function generateSignInInput(
	overrides: Partial<ISignInInput> = {},
): ISignInInput {
	return {
		email: faker.internet.email().toLowerCase(),
		password: faker.internet.password({ length: 12 }),
		...overrides,
	};
}
