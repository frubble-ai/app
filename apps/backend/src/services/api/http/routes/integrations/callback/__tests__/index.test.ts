import { faker } from "@faker-js/faker";
import { describe, expect, it, vi } from "vitest";
import { buildHttp } from "@/services/api/http";
import { completeIntegrationConnectUseCase } from "@/use-cases/cases/complete-integration-connect.use-case";

vi.mock(
	"@/use-cases/cases/complete-integration-connect.use-case",
	async () =>
		import(
			"@/services/api/http/routes/integrations/callback/__mocks__/mock-complete-integration-connect-use-case"
		),
);

describe("GET /integrations/callback", () => {
	it("hands the connection id to the use case and redirects where it says", async () => {
		const connectionId = faker.string.uuid();
		const redirectUrl = `${faker.internet.url()}/?integration=github&integration_status=connected`;
		vi.mocked(completeIntegrationConnectUseCase).mockResolvedValue({
			redirectUrl,
		});

		const response = await buildHttp().fetch(
			new Request(
				`http://api.test/integrations/callback?connection=${connectionId}&status=success`,
			),
		);

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe(redirectUrl);
		expect(completeIntegrationConnectUseCase).toHaveBeenCalledWith({
			connectionId,
		});
	});

	it("passes no id when the query has none", async () => {
		vi.mocked(completeIntegrationConnectUseCase).mockResolvedValue({
			redirectUrl: faker.internet.url(),
		});

		await buildHttp().fetch(
			new Request("http://api.test/integrations/callback"),
		);

		expect(completeIntegrationConnectUseCase).toHaveBeenCalledWith({
			connectionId: undefined,
		});
	});
});
