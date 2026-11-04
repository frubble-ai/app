import { describe, expect, it } from "vitest";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import { githubAppInstallUrlUseCase } from "@/use-cases/cases/github-app-install-url.use-case";

const { getClone } = setupIntegrationTestContext();

describe("githubAppInstallUrlUseCase", () => {
	it("answers where to install Frubble AI on an organization", async () => {
		getClone();

		await expect(githubAppInstallUrlUseCase({})).resolves.toBe(
			"https://github.com/apps/frubble-ai/installations/new",
		);
	});
});
