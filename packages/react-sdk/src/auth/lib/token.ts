/** The key the token persists under, for a store that can tell when another context changes it. */
export const TOKEN_KEY = "frubble_auth_token";

/**
 * Where the session token persists, given by each app: secure storage on native, the browser's
 * storage on the web. The SDK holds no platform module of its own.
 */
export type TTokenStore = {
	getItem: (key: string) => Promise<string | null>;
	setItem: (key: string, value: string) => Promise<void>;
	deleteItem: (key: string) => Promise<void>;
};

let store: TTokenStore | undefined;

// Kept in memory for synchronous reads by the GraphQL client; persisted in the app's store.
let _memoryToken: string | null = null;

/** Sets where the token persists. Without a store the token lives in memory only (tests). */
export function configureTokenStore(next: TTokenStore): void {
	store = next;
}

export async function setToken(token: string): Promise<void> {
	_memoryToken = token;
	try {
		await store?.setItem(TOKEN_KEY, token);
	} catch {
		// Storage unavailable: the session lasts as long as the process.
	}
}

export function getToken(): string | null {
	return _memoryToken;
}

export async function clearToken(): Promise<void> {
	_memoryToken = null;
	try {
		await store?.deleteItem(TOKEN_KEY);
	} catch {
		// Storage unavailable.
	}
}

/** Loads the persisted token into memory, once, as the app opens. */
export async function loadToken(): Promise<void> {
	try {
		const stored = await store?.getItem(TOKEN_KEY);
		if (stored) _memoryToken = stored;
	} catch {
		// Storage unavailable.
	}
}
