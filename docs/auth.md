# Sign-in

Email and password accounts, with a 6-digit emailed code at sign-up and for password reset.
The API exposes it over GraphQL at `/graphql` (`packages/gql/schema/auth.graphql`); the
worker sends the emails.

## Flow

1. `requestSignUpCode(input: { email })`. The API mints a code, stores only its SHA-256 (with the flow
   prefix and the address) in Better Auth's `verification` table with 15 minutes to live, and
   publishes a `signup.code_requested` message. A registered address answers `FORBIDDEN` with
   a generic message, so the app can offer sign-in instead.
2. The worker receives the message from Pub/Sub, renders the template in
   `@frubble/emails` and sends it through the provider in `EMAIL_PROVIDER`.
3. `signUp(input: { email, code, name, password })`. The code is verified without being consumed, the
   account is created through Better Auth, `email_verified` is set, and only then is the code
   burned: a refused password leaves it usable for a retry. Five wrong guesses burn it.
4. `signIn(input: { email, password })` answers `AuthPayload { user, token }`. The client sends `token`
   as `Authorization: Bearer <token>` from then on; `me` reads it, `signOut` ends it.
5. `requestPasswordReset(input: { email })` always answers `sent: true` and emails a code only
   when an account exists. `resetPassword(input: { email, code, newPassword })` sets the
   password and revokes every session. `changePassword(input: { currentPassword, newPassword })`
   needs the current password, revokes every session and returns the caller's new `token`.

Better Auth's own HTTP routes are not mounted. Resolvers validate input, call use cases, and
use cases call `ctx.auth.api.*`; the session lookup goes through an in-process cache keyed by
the token's hash (30 s, evicted on sign-out).

## Roles

`user.role` has one value, `application_user`, which every account gets at sign-up: Better Auth
writes the column's default and takes no role from the client (`input: false`). The schema's
`Me.role` is `APPLICATION_USER`. There is no admin role, and nothing to invite one with yet; the
enum is where another role would go.

## Rate limits

Every unauthenticated flow counts attempts per address (10 in 15 minutes) and per client
IP (50 in 15 minutes) in the `rate_limit` table, so the limit holds across instances. Over
it, the API answers `TOO_MANY_REQUESTS` with `retryAfterSeconds` in the error's extensions.
The client IP comes from `X-Forwarded-For`: Google's load balancer appends the client's
address and then its own, so the client is the entry before the last `TRUSTED_PROXIES`
(default 1) entries, and anything a client put in the header itself is ignored.

Every environment sends real email: the worker needs its provider's key and sending domain to
start, locally too. The seed creates two local users, so accounts exist before any code is
emailed.
