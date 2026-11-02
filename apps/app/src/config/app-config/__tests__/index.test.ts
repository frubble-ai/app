import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { appConfig, applyAppConfig, buildAppConfig } from "@/config/app-config";

describe("buildAppConfig", () => {
	it.each(["stg", "prd"])(
		"a %s container talks to the API its service names",
		(appEnv) => {
			const graphqlUrl = faker.internet.url();

			expect(
				buildAppConfig({ APP_ENV: appEnv, GRAPHQL_URL: graphqlUrl }),
			).toEqual({ appEnv, graphqlUrl });
		},
	);

	it.each(["stg", "prd"])(
		"fails in %s without GRAPHQL_URL: no API host is built in outside local",
		(appEnv) => {
			expect(() => buildAppConfig({ APP_ENV: appEnv })).toThrow(
				/GRAPHQL_URL is required outside local/,
			);
		},
	);

	it("is local by default, against the local API", () => {
		expect(buildAppConfig({})).toEqual({
			appEnv: "local",
			graphqlUrl: "http://localhost:8080/graphql",
		});
	});

	it("talks to the API GRAPHQL_URL names, locally too", () => {
		const graphqlUrl = faker.internet.url();

		expect(buildAppConfig({ GRAPHQL_URL: graphqlUrl }).graphqlUrl).toBe(
			graphqlUrl,
		);
	});

	it.each([
		["an unknown environment", { APP_ENV: "production" }],
		["an API that isn't a URL", { GRAPHQL_URL: "localhost" }],
	])("fails on %s", (_case, env) => {
		expect(() => buildAppConfig(env)).toThrow(/Invalid app config/);
	});
});

describe("appConfig", () => {
	it("is what the server read, once applied", () => {
		const prd = buildAppConfig({
			APP_ENV: "prd",
			GRAPHQL_URL: faker.internet.url(),
		});

		applyAppConfig(prd);

		expect(appConfig).toEqual(prd);
	});
});
