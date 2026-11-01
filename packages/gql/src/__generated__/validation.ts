import { z } from 'zod'
import { UserRole } from './types'
import type { ChangePasswordInput, RequestPasswordResetInput, RequestSignUpCodeInput, ResetPasswordInput, SignInInput, SignUpInput } from './types'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const UserRoleSchema: z.ZodType<UserRole> = z.nativeEnum(UserRole);

export function ChangePasswordInputSchema(): z.ZodObject<Properties<ChangePasswordInput>> {
  return z.object({
    currentPassword: z.string(),
    newPassword: z.string()
  })
}

export function RequestPasswordResetInputSchema(): z.ZodObject<Properties<RequestPasswordResetInput>> {
  return z.object({
    email: z.string()
  })
}

export function RequestSignUpCodeInputSchema(): z.ZodObject<Properties<RequestSignUpCodeInput>> {
  return z.object({
    email: z.string()
  })
}

export function ResetPasswordInputSchema(): z.ZodObject<Properties<ResetPasswordInput>> {
  return z.object({
    code: z.string(),
    email: z.string(),
    newPassword: z.string()
  })
}

export function SignInInputSchema(): z.ZodObject<Properties<SignInInput>> {
  return z.object({
    email: z.string(),
    password: z.string()
  })
}

export function SignUpInputSchema(): z.ZodObject<Properties<SignUpInput>> {
  return z.object({
    code: z.string(),
    email: z.string(),
    name: z.string(),
    password: z.string()
  })
}
