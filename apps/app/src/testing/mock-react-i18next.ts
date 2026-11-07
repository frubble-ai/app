import { vi } from "vitest";

/**
 * `react-i18next` whose `t` returns the namespace and key it was given, never the copy, followed
 * by its interpolation values as `(name=value, …)`, so a test sees which values reach the text.
 */
export function useTranslation(namespace?: string) {
	return {
		t: (key: string, values?: Record<string, unknown>) => {
			const name = namespace ? `${namespace}.${key}` : key;
			if (!values) return name;
			const pairs = Object.entries(values).map(
				([valueName, value]) => `${valueName}=${String(value)}`,
			);
			return `${name}(${pairs.join(", ")})`;
		},
		i18n: { changeLanguage: vi.fn() },
	};
}

export const initReactI18next = { type: "3rdParty", init: vi.fn() };
