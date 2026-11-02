import { faker } from "@faker-js/faker";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { appConfig, buildAppConfig } from "@/config/app-config";
import { AppProviders } from "@/shared/components/app-providers";
import { bootSession } from "@/shared/session";

// The real SDK: the providers hand its client to Apollo; only the session load is driven here
vi.mock("@/shared/session", async () => import("@/testing/mock-session"));

/** What the server read from a stg container's environment. */
const STG = buildAppConfig({
	APP_ENV: "stg",
	GRAPHQL_URL: faker.internet.url(),
});

describe("AppProviders", () => {
	it("shows the splash screen until the saved session has loaded, then the page", async () => {
		let loaded: () => void = () => {};
		vi.mocked(bootSession).mockReturnValueOnce(
			new Promise<void>((resolve) => {
				loaded = resolve;
			}),
		);

		render(
			<AppProviders config={STG}>
				<div data-testid="page" />
			</AppProviders>,
		);

		expect(screen.getByTestId("splash-screen")).toBeInTheDocument();
		expect(screen.queryByTestId("page")).not.toBeInTheDocument();

		loaded();

		expect(await screen.findByTestId("page")).toBeInTheDocument();
	});

	it("runs the page with the config the server read, applied before the session loads", async () => {
		render(
			<AppProviders config={STG}>
				<div data-testid="page" />
			</AppProviders>,
		);

		expect(await screen.findByTestId("page")).toBeInTheDocument();
		expect(appConfig).toEqual(STG);
		expect(bootSession).toHaveBeenCalled();
	});
});
