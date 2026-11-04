import { describe, expect, it } from "vitest";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import { buildTestConfig } from "@/testing/test-environment";
import { githubAppInstallUrlUseCase } from "@/use-cases/cases/github-app-install-url.use-case";

describe("with a GitHub App", () => {
	const { getClone } = setupIntegrationTestContext();

	it("answers where to install it on an organization", async () => {
		getClone();

		await expect(githubAppInstallUrlUseCase({})).resolves.toBe(
			buildTestConfig().github.appInstallUrl,
		);
	});
});

describe("without a GitHub App", () => {
	const { getClone } = setupIntegrationTestContext({
		config: { github: { appInstallUrl: undefined } },
	});

	it("has nothing to install", async () => {
		getClone();

		await expect(githubAppInstallUrlUseCase({})).resolves.toBeNull();
	});
});
