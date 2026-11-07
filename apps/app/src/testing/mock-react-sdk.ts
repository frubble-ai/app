import { vi } from "vitest";

/**
 * `@frubble/react-sdk` with the hooks screens call replaced by `vi.fn()`s; the rest (enums,
 * documents) is the real thing. Usage: `vi.mock("@frubble/react-sdk", async () =>
 * import("@/testing/mock-react-sdk"))`, then drive them with `vi.mocked(useAuth).mockReturnValue(…)`.
 */
const actual =
	await vi.importActual<typeof import("@frubble/react-sdk")>(
		"@frubble/react-sdk",
	);

export * from "@frubble/react-sdk";
export const graphqlClient = actual.graphqlClient;
export const useAuth = vi.fn();
export const useMyOrganizationsQuery = vi.fn();
export const useOrganizationQuery = vi.fn();
export const useIntegrationsQuery = vi.fn();
export const useGithubInstallationsQuery = vi.fn();
export const useGithubRepositoriesLazyQuery = vi.fn();
export const useGithubAppInstallUrlQuery = vi.fn();
export const useLinearTeamsLazyQuery = vi.fn();
export const useSlackChannelsLazyQuery = vi.fn();
export const useCreateOrganizationMutation = vi.fn();
export const useInviteOrganizationMemberMutation = vi.fn();
export const useAcceptOrganizationInvitationMutation = vi.fn();
export const useStartIntegrationConnectMutation = vi.fn();
export const useDisconnectIntegrationMutation = vi.fn();
