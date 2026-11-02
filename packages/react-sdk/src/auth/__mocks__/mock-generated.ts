import { vi } from "vitest";

export const mockRefetch = vi.fn().mockResolvedValue(undefined);
/** Every mutation hook's mutate function. */
export const mockMutate = vi.fn();
export const mockUseMeQuery = vi.fn();

const mutationHook = () => vi.fn(() => [mockMutate]);

export function createMockGenerated() {
	return {
		useMeQuery: mockUseMeQuery,
		useRequestSignUpCodeMutation: mutationHook(),
		useRequestPasswordResetMutation: mutationHook(),
		useResetPasswordMutation: mutationHook(),
		useChangePasswordMutation: mutationHook(),
		useSignInMutation: mutationHook(),
		useSignUpMutation: mutationHook(),
	};
}
