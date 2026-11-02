// @vitest-environment jsdom
import { faker } from "@faker-js/faker";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MeDocument } from "../../gql/documents";
import { graphqlClient } from "../../gql/lib/client";
import { mockConsoleWarn } from "../../shared/__mocks__/mock-console-warn";
import { createMockToken } from "../../shared/__mocks__/mock-token";
import { generateAuthPayload } from "../__mocks__/generate-auth-payload";
import {
	createMockGenerated,
	mockMutate,
	mockRefetch,
	mockUseMeQuery,
} from "../__mocks__/mock-generated";
import { useAuth } from "../index";

vi.mock("../../gql/generated", () => createMockGenerated());
vi.mock("../lib/token", () => createMockToken());
vi.mock("../../gql/lib/client", async () =>
	(await import("../__mocks__/mock-client")).createMockClient(),
);

describe("useAuth", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	beforeEach(async () => {
		mockMutate.mockReset();
		mockRefetch.mockReset().mockResolvedValue(undefined);
		mockUseMeQuery.mockReturnValue({
			data: undefined,
			loading: false,
			refetch: mockRefetch,
		});
		const { setToken, clearToken } = await import("../lib/token");
		vi.mocked(setToken).mockClear();
		vi.mocked(clearToken).mockClear();
	});

	it("user is null when me query returns no data", () => {
		const { result } = renderHook(() => useAuth());
		expect(result.current.user).toBeNull();
	});

	it("tells a failed check apart from being signed out, and can ask again", () => {
		mockUseMeQuery.mockReturnValue({
			data: undefined,
			loading: false,
			error: new Error("offline"),
			refetch: mockRefetch,
		});

		const { result } = renderHook(() => useAuth());
		result.current.retry();

		expect(result.current.isUnknown).toBe(true);
		expect(result.current.isAuthenticated).toBe(false);
		expect(mockRefetch).toHaveBeenCalledOnce();
	});

	it("isAuthenticated is false when no user", () => {
		const { result } = renderHook(() => useAuth());
		expect(result.current.isAuthenticated).toBe(false);
	});

	it("isAuthenticated is true when me query returns a user", () => {
		const payload = generateAuthPayload();
		mockUseMeQuery.mockReturnValue({
			data: { me: payload.user },
			loading: false,
			refetch: mockRefetch,
		});
		const { result } = renderHook(() => useAuth());
		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.user).toMatchObject({ id: payload.user.id });
		expect(result.current.role).toBe(payload.user.role);
	});

	it("signIn calls mutation, sets token, refetches me query", async () => {
		const { setToken } = await import("../lib/token");
		const payload = generateAuthPayload();
		mockMutate.mockResolvedValueOnce({ data: { signIn: payload } });

		const { result } = renderHook(() => useAuth());

		await act(async () => {
			await result.current.signIn({
				email: payload.user.email,
				password: faker.internet.password(),
			});
		});

		expect(mockMutate).toHaveBeenCalledOnce();
		expect(setToken).toHaveBeenCalledWith(payload.token);
		expect(graphqlClient.cache.writeQuery).toHaveBeenCalledWith({
			query: MeDocument,
			data: { me: payload.user },
		});
		expect(mockRefetch).toHaveBeenCalledOnce();
	});

	it("keeps the session when refreshing the user afterwards fails", async () => {
		const warn = mockConsoleWarn();
		const payload = generateAuthPayload();
		mockMutate.mockResolvedValueOnce({ data: { signIn: payload } });
		mockRefetch.mockRejectedValueOnce(new Error("offline"));

		const { result } = renderHook(() => useAuth());

		await act(async () => {
			await expect(
				result.current.signIn({
					email: payload.user.email,
					password: faker.internet.password(),
				}),
			).resolves.toEqual(payload);
		});

		await vi.waitFor(() => expect(warn).toHaveBeenCalled());
	});

	it("signUp calls mutation, sets token, refetches me query", async () => {
		const { setToken } = await import("../lib/token");
		const payload = generateAuthPayload();
		mockMutate.mockResolvedValueOnce({ data: { signUp: payload } });

		const { result } = renderHook(() => useAuth());

		await act(async () => {
			await result.current.signUp({
				email: payload.user.email,
				code: faker.string.numeric(6),
				name: payload.user.name,
				password: faker.internet.password(),
			});
		});

		expect(mockMutate).toHaveBeenCalledOnce();
		expect(setToken).toHaveBeenCalledWith(payload.token);
		expect(mockRefetch).toHaveBeenCalledOnce();
	});

	it("requestSignUpCode returns the mutation result without signing in", async () => {
		const { setToken } = await import("../lib/token");
		mockMutate.mockResolvedValueOnce({
			data: {
				requestSignUpCode: { sent: true },
			},
		});

		const { result } = renderHook(() => useAuth());

		let response: unknown;
		await act(async () => {
			response = await result.current.requestSignUpCode({
				email: faker.internet.email(),
			});
		});

		expect(response).toEqual({ sent: true });
		expect(setToken).not.toHaveBeenCalled();
	});

	it("requestPasswordReset returns the mutation result", async () => {
		mockMutate.mockResolvedValueOnce({
			data: {
				requestPasswordReset: { sent: true },
			},
		});

		const { result } = renderHook(() => useAuth());

		let response: unknown;
		await act(async () => {
			response = await result.current.requestPasswordReset({
				email: faker.internet.email(),
			});
		});

		expect(response).toEqual({ sent: true });
	});

	it("resetPassword returns the mutation result without signing in", async () => {
		const { setToken } = await import("../lib/token");
		mockMutate.mockResolvedValueOnce({
			data: { resetPassword: { reset: true } },
		});

		const { result } = renderHook(() => useAuth());

		let response: unknown;
		await act(async () => {
			response = await result.current.resetPassword({
				email: faker.internet.email(),
				code: faker.string.numeric(6),
				newPassword: faker.internet.password(),
			});
		});

		expect(response).toEqual({ reset: true });
		expect(setToken).not.toHaveBeenCalled();
		expect(mockRefetch).not.toHaveBeenCalled();
	});

	it("changePassword stores the session token that replaces the revoked one", async () => {
		const { setToken } = await import("../lib/token");
		const token = faker.string.alphanumeric(40);
		mockMutate.mockResolvedValueOnce({
			data: {
				changePassword: { changed: true, token },
			},
		});

		const { result } = renderHook(() => useAuth());

		let response: unknown;
		await act(async () => {
			response = await result.current.changePassword({
				currentPassword: faker.internet.password(),
				newPassword: faker.internet.password(),
			});
		});

		expect(response).toEqual({ changed: true, token });
		expect(setToken).toHaveBeenCalledWith(token);
	});
});
