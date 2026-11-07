import { describe, expect, it } from "vitest";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import { TEST_GITHUB_APP_SLUG } from "@/testing/test-environment";
import { githubAppInstallUrlUseCase } from "@/use-cases/cases/github-app-install-url.use-case";

const { getClone } = setupIntegrationTestContext();

describe("githubAppInstallUrlUseCase", () => {
	it("answers where to install the environment's GitHub App", async () => {
		getClone();

		await expect(githubAppInstallUrlUseCase({})).resolves.toBe(
			`https://github.com/apps/${TEST_GITHUB_APP_SLUG}/installations/new`,
		);
	});
});
