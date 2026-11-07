import { INTEGRATION_PROVIDERS, type TIntegrationProvider } from "@frubble/db";
import { z } from "zod";

const authConfigIdsSchema = z.object(
	Object.fromEntries(
		INTEGRATION_PROVIDERS.map((provider) => [
			provider,
			z.string().startsWith("ac_", `${provider} needs an ac_ auth config id`),
		]),
	) as Record<TIntegrationProvider, z.ZodString>,
);

/**
 * `github=ac_…,linear=ac_…`: a broker's auth config (our app registered at the broker) per
 * provider, every provider present.
 */
export function parseAuthConfigIds(
	raw: string,
	context: z.RefinementCtx,
): Record<TIntegrationProvider, string> {
	const pairs = raw
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0)
		.map((entry) => entry.split("=").map((part) => part.trim()));
	const parsed = authConfigIdsSchema.safeParse(Object.fromEntries(pairs));
	if (!parsed.success) {
		for (const issue of parsed.error.issues) {
			context.addIssue({
				code: "custom",
				message: `${issue.path.join(".") || "value"}: ${issue.message}; expected provider=ac_… pairs separated by commas`,
			});
		}
		return z.NEVER;
	}
	return parsed.data;
}
