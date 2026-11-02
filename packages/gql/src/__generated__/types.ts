export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, ISO 8601. */
  DateTime: { input: string; output: string; }
  /**
   * A Better Auth user id: 16 to 64 characters of letters, digits, `_` and `-`.
   * Wider than Better Auth's default so an id-format change does not break the schema.
   */
  UserId: { input: string; output: string; }
};

/** A session: `token` goes in `Authorization: Bearer <token>` on every later request. */
export type AuthPayload = {
  __typename?: 'AuthPayload';
  token: Scalars['String']['output'];
  user: Me;
};

export type ChangePasswordInput = {
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};

/**
 * Every session was revoked, the caller's too: `token` replaces the one the
 * request was made with.
 */
export type ChangePasswordPayload = {
  __typename?: 'ChangePasswordPayload';
  changed: Scalars['Boolean']['output'];
  token: Scalars['String']['output'];
};

/** The signed-in user. */
export type Me = {
  __typename?: 'Me';
  email: Scalars['String']['output'];
  id: Scalars['UserId']['output'];
  name: Scalars['String']['output'];
  role: UserRole;
};

export type Mutation = {
  __typename?: 'Mutation';
  _empty?: Maybe<Scalars['String']['output']>;
  /**
   * Change the calling user's password. Needs the current one; every session is
   * revoked and the payload carries the caller's new token.
   */
  changePassword: ChangePasswordPayload;
  /**
   * Email a 6-digit password-reset code. Always answers `sent: true`, so the
   * response never says whether an account exists for the address.
   */
  requestPasswordReset: RequestCodePayload;
  /**
   * Email a 6-digit sign-up code to an address that has no account yet. A
   * registered address gets `FORBIDDEN` with a generic message, so the app can
   * offer sign-in instead.
   */
  requestSignUpCode: RequestCodePayload;
  /**
   * Set a new password with the code from `requestPasswordReset`. An invalid,
   * expired or locked code answers `BAD_USER_INPUT`.
   */
  resetPassword: ResetPasswordPayload;
  signIn: AuthPayload;
  signOut: SignOutPayload;
  signUp: AuthPayload;
};


export type MutationChangePasswordArgs = {
  input: ChangePasswordInput;
};


export type MutationRequestPasswordResetArgs = {
  input: RequestPasswordResetInput;
};


export type MutationRequestSignUpCodeArgs = {
  input: RequestSignUpCodeInput;
};


export type MutationResetPasswordArgs = {
  input: ResetPasswordInput;
};


export type MutationSignInArgs = {
  input: SignInInput;
};


export type MutationSignUpArgs = {
  input: SignUpInput;
};

export type Query = {
  __typename?: 'Query';
  health: Scalars['Boolean']['output'];
  me?: Maybe<Me>;
};

export type RequestCodePayload = {
  __typename?: 'RequestCodePayload';
  sent: Scalars['Boolean']['output'];
};

export type RequestPasswordResetInput = {
  email: Scalars['String']['input'];
};

export type RequestSignUpCodeInput = {
  email: Scalars['String']['input'];
};

/**
 * Finish a password reset with the 6-digit code emailed by `requestPasswordReset`.
 * Every existing session of the account is revoked.
 */
export type ResetPasswordInput = {
  code: Scalars['String']['input'];
  email: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};

export type ResetPasswordPayload = {
  __typename?: 'ResetPasswordPayload';
  reset: Scalars['Boolean']['output'];
};

export type SignInInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type SignOutPayload = {
  __typename?: 'SignOutPayload';
  signedOut: Scalars['Boolean']['output'];
};

/** Create the account with the 6-digit code emailed by `requestSignUpCode`. */
export type SignUpInput = {
  code: Scalars['String']['input'];
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export enum UserRole {
  Customer = 'CUSTOMER',
  SystemAdmin = 'SYSTEM_ADMIN'
}
