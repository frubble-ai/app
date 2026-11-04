/** Our GitHub App, Frubble AI: github.com/apps/frubble-ai. */
const GITHUB_APP_SLUG = "frubble-ai";

export type TGithubConfig = {
	/**
	 * Where to install our GitHub App on an organization. Its connection lists only the
	 * organizations the app is installed on.
	 */
	appInstallUrl: string;
};

export function githubConfig(): TGithubConfig {
	return {
		appInstallUrl: `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`,
	};
}
