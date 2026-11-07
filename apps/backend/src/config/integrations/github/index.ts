import { z } from "zod";
import { envVar } from "@/shared/env";

export type TGithubConfig = {
	/**
	 * Where to install our GitHub App on an account or organization. Its connection lists only
	 * the installations of that app, so this is the app the environment's connections belong to.
	 */
	appInstallUrl: string;
};

/**
 * The variables GitHub's config reads. Each environment has its own GitHub App, so its slug (the
 * `github.com/apps/<slug>` name) is the environment's: `frubble-ai-dev` in dev, `frubble-ai` in stg.
 */
export const githubEnvFields = {
	GITHUB_APP_SLUG: envVar(z.string().regex(/^[a-z0-9-]+$/)),
};

export function githubConfig(env: { GITHUB_APP_SLUG: string }): TGithubConfig {
	return {
		appInstallUrl: `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`,
	};
}
