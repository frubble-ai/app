import { defineUseCase } from "@/use-cases";

/**
 * Where to install our GitHub App on an organization. A GitHub connection lists only the
 * organizations the app is installed on, so connecting is not enough to see one. Null when the
 * environment has no GitHub App.
 */
export const githubAppInstallUrlUseCase = defineUseCase(
	async function githubAppInstallUrlUseCase(
		ctx,
		_args: Record<string, never>,
	): Promise<string | null> {
		return ctx.config.github.appInstallUrl ?? null;
	},
);
