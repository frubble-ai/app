import { faker } from "@faker-js/faker";
import { describe, expect, it, vi } from "vitest";
import {
	createEmailSender,
	type TEmailProviderConfig,
} from "@/services/worker/email/providers";

function generateConfig(
	overrides: Partial<TEmailProviderConfig> = {},
): TEmailProviderConfig {
	return {
		apiKey: faker.string.alphanumeric(32),
		apiUrl: undefined,
		domain: `stg.${faker.internet.domainName()}`,
		fromEmail: `noreply@stg.${faker.internet.domainName()}`,
		fromName: faker.company.name(),
		...overrides,
	};
}

function okFetch() {
	return vi
		.fn<typeof fetch>()
		.mockResolvedValue(new Response("{}", { status: 200 }));
}

describe("the Mailgun adapter", () => {
	it("posts the rendered email as a form to the domain's messages endpoint, signed with the key", async () => {
		const config = generateConfig();
		const fetchImpl = okFetch();
		const to = faker.internet.email().toLowerCase();
		const code = faker.string.numeric(6);

		await createEmailSender("mailgun", config, fetchImpl).send(to, {
			type: "password.reset_requested",
			props: { code },
		});

		const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(`https://api.mailgun.net/v3/${config.domain}/messages`);
		expect((init.headers as Record<string, string>).Authorization).toBe(
			`Basic ${Buffer.from(`api:${config.apiKey}`).toString("base64")}`,
		);
		const form = init.body as URLSearchParams;
		expect(form.get("to")).toBe(to);
		expect(form.get("from")).toBe(`${config.fromName} <${config.fromEmail}>`);
		expect(form.get("subject")).toBe("Reset your password");
		expect(form.get("html")).toContain(code);
	});
});

describe("the Resend adapter", () => {
	it("posts the rendered email as JSON with a bearer key", async () => {
		const config = generateConfig();
		const fetchImpl = okFetch();
		const to = faker.internet.email().toLowerCase();
		const code = faker.string.numeric(6);

		await createEmailSender("resend", config, fetchImpl).send(to, {
			type: "signup.code_requested",
			props: { code },
		});

		const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("https://api.resend.com/emails");
		expect((init.headers as Record<string, string>).Authorization).toBe(
			`Bearer ${config.apiKey}`,
		);
		const body = JSON.parse(String(init.body));
		expect(body).toMatchObject({
			to: [to],
			from: `${config.fromName} <${config.fromEmail}>`,
			subject: "Your Frubble code",
		});
		expect(body.html).toContain(code);
	});
});

describe.each(["mailgun", "resend"] as const)(
	"%s adapter failures",
	(provider) => {
		it("throws on a non-2xx answer, so the message is redelivered", async () => {
			const fetchImpl = vi
				.fn<typeof fetch>()
				.mockResolvedValue(new Response("rate limited", { status: 429 }));

			await expect(
				createEmailSender(provider, generateConfig(), fetchImpl).send(
					faker.internet.email(),
					{ type: "password.reset_requested", props: { code: "123456" } },
				),
			).rejects.toThrow(/send failed \(429\)/);
		});

		it("fails a stalled send instead of holding the worker", async () => {
			const fetchImpl = vi
				.fn<typeof fetch>()
				.mockImplementation(
					(_url, init) =>
						new Promise((_resolve, reject) =>
							init?.signal?.addEventListener("abort", () =>
								reject(init.signal?.reason),
							),
						),
				);

			await expect(
				createEmailSender(
					provider,
					generateConfig({ requestTimeoutMs: 20 }),
					fetchImpl,
				).send(faker.internet.email(), {
					type: "password.reset_requested",
					props: { code: "123456" },
				}),
			).rejects.toThrow(/timed out|abort/i);
		});

		it("honours a custom API origin", async () => {
			const fetchImpl = okFetch();
			const apiUrl = `https://${faker.internet.domainName()}/`;

			await createEmailSender(
				provider,
				generateConfig({ apiUrl }),
				fetchImpl,
			).send(faker.internet.email(), {
				type: "password.reset_requested",
				props: { code: "123456" },
			});

			expect(String(fetchImpl.mock.calls[0]?.[0])).toMatch(
				new RegExp(`^${apiUrl.replace(/\/$/, "")}/`),
			);
		});
	},
);
