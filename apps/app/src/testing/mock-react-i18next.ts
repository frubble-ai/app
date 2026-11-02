import { vi } from "vitest";

/** `react-i18next` whose `t` returns the namespace and key it was given, never the copy. */
export function useTranslation(namespace?: string) {
	return {
		t: (key: string) => (namespace ? `${namespace}.${key}` : key),
		i18n: { changeLanguage: vi.fn() },
	};
}

export const initReactI18next = { type: "3rdParty", init: vi.fn() };
