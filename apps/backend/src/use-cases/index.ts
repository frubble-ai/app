import type { TDb } from "@frubble/db";
import type { TMessageBus } from "@frubble/events";
import { DateTime } from "luxon";
import type { TAuth, TAuthSessionCache } from "@/better-auth";
import type { TComposio } from "@/composio";
import type { TConfig } from "@/config";
import type { TLogger } from "@/logger";
import { betterAuthClientErrorToDomainError } from "@/use-cases/lib/auth/better-auth-error";

/**
 * The context every use case receives: the configured clients and nothing that runs on its own.
 * Only use cases receive it; a `lib` function takes the parts it needs (`ctx.db`, `ctx.composio`).
 */
export type TUseCaseContext = {
	config: TConfig;
	db: TDb;
	/** The worker's queue: emails. */
	messages: TMessageBus;
	auth: TAuth;
	sessionCache: TAuthSessionCache;
	/** Composio, set up with the project's key; use cases make the calls. */
	composio: TComposio;
	logger: TLogger;
};

export type TUseCase<TArgs, TResult> = (
	ctx: TUseCaseContext,
	args: TArgs,
) => Promise<TResult>;

// Built once per process. Entry points call initUseCaseContext; tests call setCtxForTests. No
// value import of @/better-auth here (import cycle).

let _ctx: TUseCaseContext | null = null;
let _builder: (() => Promise<TUseCaseContext>) | null = null;
let _inflight: Promise<TUseCaseContext> | null = null;

async function getCtx(): Promise<TUseCaseContext> {
	if (_ctx) return _ctx;
	if (!_builder) {
		throw new Error(
			"use-cases: no context registered. Entry points call `initUseCaseContext(buildUseCaseContext)`; tests call `setCtxForTests`.",
		);
	}
	if (!_inflight) {
		// Cleared on both outcomes, so a failed boot does not poison the next caller.
		_inflight = _builder()
			.then((ctx) => {
				_ctx = ctx;
				_inflight = null;
				return ctx;
			})
			.catch((err) => {
				_inflight = null;
				throw err;
			});
	}
	return _inflight;
}

/** Registers the builder and builds eagerly, so a config error fails startup, not a request. */
export async function initUseCaseContext(
	builder: () => Promise<TUseCaseContext>,
): Promise<TUseCaseContext> {
	_builder = builder;
	return getCtx();
}

/** Tests only: pre-register a fixture context. */
export function setCtxForTests(ctx: TUseCaseContext): void {
	_ctx = ctx;
	_inflight = null;
}

/** Tests only: drop the registered context so the next call rebuilds. */
export function resetCtx(): void {
	_ctx = null;
	_inflight = null;
}

/**
 * Wraps a named use-case function: injects the context and logs each call with its duration.
 * Failures propagate; the handling boundary (GraphQL, the worker, a script) logs them once.
 */
export function defineUseCase<TArgs, TResult>(
	impl: TUseCase<TArgs, TResult>,
): (args: TArgs) => Promise<TResult> {
	const name = impl.name;
	if (!name) {
		throw new Error(
			"defineUseCase requires a named function, so logs identify the use case",
		);
	}
	return async (args: TArgs) => {
		const ctx = await getCtx();
		const started = DateTime.utc();
		ctx.logger.info({ useCase: name }, `[use-case] ${name} called`);
		try {
			const result = await impl(ctx, args);
			ctx.logger.info(
				{ useCase: name, durationMs: DateTime.utc().diff(started).toMillis() },
				`[use-case] ${name} ok`,
			);
			return result;
		} catch (caught) {
			throw betterAuthClientErrorToDomainError(caught);
		}
	};
}
