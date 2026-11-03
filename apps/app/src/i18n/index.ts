import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enAuth from "./resources/en/auth.json";
import enHome from "./resources/en/home.json";
import enInvitations from "./resources/en/invitations.json";
import enLayout from "./resources/en/layout.json";

// One namespace (file) per domain; screens load theirs with `useTranslation("<domain>")`. Bundled
// with the page: the app is English only and small enough not to fetch them.
i18n.use(initReactI18next).init({
	lng: "en",
	fallbackLng: "en",
	ns: ["auth", "home", "invitations", "layout"],
	resources: {
		en: {
			auth: enAuth,
			home: enHome,
			invitations: enInvitations,
			layout: enLayout,
		},
	},
	interpolation: {
		// React escapes what it renders
		escapeValue: false,
	},
});

export default i18n;
