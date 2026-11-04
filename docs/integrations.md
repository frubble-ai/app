# Organizations and integrations

## Organizations

Better Auth's organization plugin holds them (`organization`, `member`, `invitation`). The
creator is the `owner`; an invitation grants `admin` or `member`. Owners and admins invite,
connect and disconnect; every member reads.

The API takes the organization id on each call and the use case checks membership
(`use-cases/lib/organizations/membership.ts`): not a member answers `NOT_FOUND`, a member
without the role `FORBIDDEN`. The session's active organization is not used. The web app keeps
the one last picked in `localStorage`.

An invitation is created through Better Auth, and the use case queues the
`organization.invitation_sent` email with a link to `<APP_URL>/invitations/<id>`. Only the
address it went to can accept it, once verified.

## Integrations

A broker connects each organization's GitHub, Linear and Slack, keeps their tokens fresh and runs
actions with them. Composio is the one we use. Use cases reach it only through
`ctx.integrations` ([brokers](#brokers)), so the flow below is the same for any broker; where it
says what Composio does, that lives in `src/composio/`.

`integration_connection` records which account at which broker an organization uses per provider
(`broker`, `external_account_ref`): `pending` while the provider's consent is open, `active` after
it, `retiring` once replaced, failed or abandoned. A retiring row stays until its broker confirms
the account is removed, and every list of the organization's tools tries the removal again; while
the broker keeps failing, the account stays there. One active row per organization and provider.

1. `startIntegrationConnect` writes a pending row on the broker new connections go through
   (`ctx.integrations.connectThrough`), then asks that broker to `startConnect` with the row id as
   the attempt and a callback to `<API>/integrations/callback?connection=<row id>`, and records
   the account on the row. The row comes first, so a disconnect meanwhile retires it; the connect
   then fails and the new account is removed.
2. The browser goes straight to the provider's consent for our OAuth app, and the broker sends it
   to that callback.
3. The callback asks the row's broker for the account's state: live replaces any previous
   connection to that provider (which retires), failed retires the attempt, and still pending or
   the broker unreachable leaves it pending. Either way it redirects to
   `<APP_URL>/?integration=<provider>&integration_status=connected|pending|failed`.
4. Listing the organization's tools settles every pending row again, so a connection that went
   live after its callback shows.

The callback is public: whoever holds the link can only make the API look again. The connection
id is a random UUID that finds one row; the callback never takes a provider state or an account
id from the request, and asks the broker instead. Opening it again after the row settled answers
the same outcome and changes nothing.

A row whose account never arrived (the broker's answer to `startConnect` was lost) is looked up at
its broker by its attempt, the row id (`findAccountsByAttempt`), for an hour after the attempt;
then it is dropped. No broker documents an expiry for an unfinished connection, so the hour is
ours.

Disconnecting retires every row for that provider, an unfinished attempt included, so an
earlier consent's callback cannot bring the connection back. It answers success only once the
broker confirms the removal of each account it knows of; otherwise it fails, the provider is already
off for the organization, and the removal is retried. An attempt whose account has not arrived yet
does not hold the answer back: its connect removes the account when the broker's answer comes, and
until then the sweep looks for it by its attempt, as above.

## Brokers

`src/integrations/` is what the use cases need from a broker, in our terms
(`TConnectionBroker`):

| Method                  | Does                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `startConnect`          | opens the provider's consent; answers the account and the page to send the user to   |
| `accountState`          | `pending`, `active` or `failed`; throws when the broker cannot say, or `signal` aborts |
| `removeAccount`         | removes the account; one already gone counts as removed                              |
| `findAccountsByAttempt` | the accounts made for an attempt whose `startConnect` answer was lost                |
| `run`                   | runs one action with a connection and answers its checked output                     |

Actions are ours too (`TIntegrationActions`): an id such as `github.listOrganizations`, its input
and its output type. Each broker maps them onto its own tools.

`ctx.integrations` holds every broker by its key (`integration_broker`) and the one new
connections go through. Each row keeps the broker it was made on, and every use case reaches the
row's own broker (`ctx.integrations.brokers[row.broker]`), so two brokers serve side by side while
one replaces the other: an organization's existing connection stays where its tokens are until it
reconnects.

Only a broker's own folder imports its library: everywhere else in `apps/backend/src/`, ESLint
refuses each broker's library and any path into its folder but its index, by `import` or
`import("…")`. The brokers it knows are `BROKERS` in `eslint.config.mjs`. Codegen, outside
`src/`, is the exception: `codegen/composio-tools.ts` reads Composio's tool schemas with its SDK.

To add a broker:

1. Its folder, `src/<broker>/`, exporting a function that returns a `TConnectionBroker`.
2. Its row in the constants migration's `integration_broker`
   ([migrations](style-guide/migrations.md#constants)), and its key in `INTEGRATION_BROKERS`.
3. Its entry in `brokers` in `build-use-case-context`; moving new connections to it is
   `connectThrough`.
4. Its entry in `BROKERS` in `eslint.config.mjs`: its folder and its libraries, so the rest of
   `src/` may not import them.
5. Its contract test: `describeConnectionBrokerContract` (`src/testing/`) with a harness that
   makes it answer, as `src/composio/__tests__/` does for Composio.

The use-case tests run on an in-memory broker (`src/testing/mock-connection-broker.ts`), and the
same contract holds it to what the real ones do.

## Reading

Each provider has its own read: `githubOrganizations`, `linearTeams`, `slackChannels`, each a
use case that runs one action through the organization's connection.

At Composio, an action is one tool run in a session opened for the organization with its
connected account. Sessions choose the toolkit version.

Every result is checked against the tool's own output schema, fetched from Composio and built
into Zod with `@composio/json-schema-to-zod` (`src/composio/lib/output-schema.ts`); a response the
schema refuses fails the read. Where Composio's schema is wrong, the provider's folder in
`src/composio/` patches only that schema, with the date and the reason. The provider's folder then
reads the result into our output type.

The same schemas, with the same patches, generate each tool's `data` type
(`codegen/composio-tools.ts`, part of the backend's `codegen`, into `src/__generated__/composio/`,
not committed), so the reads use no hand-written shapes. Codegen needs `COMPOSIO_API_KEY`: locally
from `apps/backend/.env.local`, in CI the repository secret, in the image build a BuildKit secret. A
new tool is one line in its `TOOLS`, and a new action is its entry in `TIntegrationActions` plus its
tool in `src/composio/`.

## Composio setup

Per environment, a Composio project with one auth config per provider, each on our own OAuth
app with the redirect URI `https://backend.composio.dev/api/v3/toolkits/auth/callback`.
Composio's `startConnect` calls `connectedAccounts.initiate` on that auth config with
`config: { authScheme: "OAUTH2", val: { status: "INITIALIZING", long_redirect_url: true } }`, so
the `redirectUrl` it returns is the provider's own consent URL rather than a Composio short link,
and the attempt id as the account's alias, which `findAccountsByAttempt` looks for across every
page of the organization's accounts. Each organization is a Composio user, by its id. The API
reads the project key as `COMPOSIO_API_KEY` and the auth configs as `COMPOSIO_AUTH_CONFIG_IDS`
([environment](environment.md#api-srcservicesapi)). A new provider needs its auth config, its
pair in that variable, its toolkit in `src/composio/`, a row in the constants migration's
`integration_provider` ([migrations](style-guide/migrations.md#constants)),
`INTEGRATION_PROVIDERS`, and its own read.

Each auth config asks only for the scopes the tools we call need, read-only, from the tool's own
`scope_requirements` at Composio:

| Provider | Scopes                                      | For                                                    |
| -------- | ------------------------------------------- | ------------------------------------------------------ |
| GitHub   | `read:org`                                  | `GITHUB_LIST_ORGANIZATIONS_FOR_THE_AUTHENTICATED_USER` |
| Linear   | `read`                                      | `LINEAR_LIST_LINEAR_TEAMS`                             |
| Slack    | user `channels:read`, `groups:read`; no bot | `SLACK_LIST_ALL_CHANNELS`, public and private channels |

A new tool adds its scopes to the auth config. Set them with the auth config's `PATCH`
(`{"type":"custom","credentials":{"scopes":[…]}}`, plus `user_scopes` for Slack): it keeps the
client id and secret. An account connected before a change keeps its old scopes until it
reconnects.
