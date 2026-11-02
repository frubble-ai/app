import type { TAppConfig } from "@/config/app-config";

/**
 * `@/config/app-config` as a stg build, which a test can turn into another environment's:
 * `vi.mock("@/config/app-config", async () => import("@/testing/mock-app-config"))`, then
 * `Object.assign(appConfig, { appEnv: "prd" })`. Reset with `resetAppConfig`.
 */
const STG: TAppConfig = {
	appEnv: "stg",
	graphqlUrl: "https://api.stg.frubble.ai/graphql",
};

export const appConfig: TAppConfig = { ...STG };

export function resetAppConfig(): void {
	Object.assign(appConfig, STG);
}
