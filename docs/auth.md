# Sign-in

Email and password accounts, with a 6-digit emailed code at sign-up and for password reset.
The API exposes it over GraphQL at `/graphql` (`packages/gql/schema/auth.graphql`); the
worker sends the emails.

## Flow

1. `requestSignUpCode(email)`. The API mints a code, stores only its SHA-256 (with the flow
   prefix and the address) in Better Auth's `verification` table with 15 minutes to live, and
   publishes a `signup.code_requested` message. A registered address answers `FORBIDDEN` with
   a generic message, so the app can offer sign-in instead.
2. The worker receives the message from Pub/Sub, renders the template in
   `@frubble/emails` and sends it through the provider in `EMAIL_PROVIDER`.
3. `signUp(email, code, name, password)`. The code is verified without being consumed, the
   account is created through Better Auth, `email_verified` is set, and only then is the code
   burned: a refused password leaves it usable for a retry. Five wrong guesses burn it.
4. `signIn(email, password)` answers `AuthPayload { user, token }`. The client sends `token`
   as `Authorization: Bearer <token>` from then on; `me` reads it, `signOut` ends it.
5. `requestPasswordReset(email)` always answers `sent: true` and emails a code only when an
   account exists. `resetPassword(email, code, newPassword)` sets the password and revokes
   every session. `changePassword` needs the current password and revokes the other sessions.

Better Auth's own HTTP routes are not mounted. Resolvers validate input, call use cases, and
use cases call `ctx.auth.api.*`; the session lookup goes through an in-process cache keyed by
the token's hash (30 s, evicted on sign-out).

## Roles

`user.role` is `customer` or `system_admin`, set by the server only. An admin is invited with
`yarn workspace @frubble/backend create-admin <email>`, which emails a code with 72 hours to
live under a different prefix; signing up with it creates a `system_admin`.

## Rate limits

Every unauthenticated flow counts attempts per address (10 in 15 minutes) and per client
IP (50 in 15 minutes) in the `rate_limit` table, so the limit holds across instances. Over
it, the API answers `TOO_MANY_REQUESTS` with `retryAfterSeconds` in the error's extensions.
The client IP is the last `X-Forwarded-For` entry, the one the load balancer appended.

## Without an email provider

With `EMAIL_PROVIDER=none` (local, and stg until its provider is set up) the worker logs each
email instead of sending it, and the API accepts the fixed code `111111` beside the emailed
one, while a code was requested and is live. prd refuses to start that way.
