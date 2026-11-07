/** Osiris's error body: `{ error: { code, type, message } }`. */
type TOsirisError = {
	error?: { code?: string; type?: string; message?: string };
};

/** An osiris call that failed, with its status and `OS_xx` code. */
export class OsirisError extends Error {
	constructor(
		readonly status: number,
		readonly code: string | undefined,
		message: string,
	) {
		super(message);
		this.name = "OsirisError";
	}
}

/**
 * An SDK call's data, or the failure as an OsirisError. The SDK has already checked the answer
 * against its schema; a missing body after a success is a failure too.
 */
export function answer<TData>(result: {
	data?: TData;
	error?: unknown;
	response?: Response;
}): TData {
	if (result.error === undefined && result.data !== undefined)
		return result.data;
	const status = result.response?.status ?? 0;
	const error = (result.error as TOsirisError | undefined)?.error;
	throw new OsirisError(
		status,
		error?.code,
		`osiris answered ${status}: ${error?.message ?? "no body"}`,
	);
}
