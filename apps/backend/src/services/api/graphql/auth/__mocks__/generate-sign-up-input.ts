import { faker } from "@faker-js/faker";

interface ISignUpInput {
	email: string;
	code: string;
	name: string;
	password: string;
}

export function generateSignUpInput(
	overrides: Partial<ISignUpInput> = {},
): ISignUpInput {
	return {
		email: faker.internet.email().toLowerCase(),
		code: faker.string.numeric(6),
		name: faker.person.fullName(),
		password: faker.internet.password({ length: 12 }),
		...overrides,
	};
}
