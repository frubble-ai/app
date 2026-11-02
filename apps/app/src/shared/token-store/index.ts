import type { TTokenStore } from "@frubble/react-sdk";

/**
 * The session token's store in the browser: `localStorage`, so a reload keeps the user signed in.
 * Storage can be blocked (private mode, site data off); the SDK then keeps the session in memory.
 */
export const browserTokenStore: TTokenStore = {
	getItem: async (key) => window.localStorage.getItem(key),
	setItem: async (key, value) => window.localStorage.setItem(key, value),
	deleteItem: async (key) => window.localStorage.removeItem(key),
};
