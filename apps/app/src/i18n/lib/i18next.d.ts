// Types every `t()` key against the English resources, so a typo (`t("signIn.titel")`) fails the
// typecheck instead of rendering the raw key. The JSON is imported for its type only.
import type auth from "@/i18n/resources/en/auth.json";
import type home from "@/i18n/resources/en/home.json";
import type layout from "@/i18n/resources/en/layout.json";

declare module "i18next" {
	interface CustomTypeOptions {
		resources: {
			auth: typeof auth;
			home: typeof home;
			layout: typeof layout;
		};
	}
}
