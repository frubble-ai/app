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

Composio connects each organization's GitHub, Linear and Slack and keeps their tokens fresh.
`src/composio/` is the only code that imports its SDK; use cases reach it as
`ctx.integrations`. Each connected account belongs to the organization id at Composio.

`integration_connection` records which connected account an organization uses per provider:
`pending` while the provider's consent is open, `active` after it, `retiring` once replaced,
failed or abandoned. A retiring row stays until Composio confirms the account is removed, and
every list of the organization's tools tries the removal again; while Composio keeps failing,
the account stays there. One active row per organization and provider.

1. `startIntegrationConnect` writes a pending row, then asks Composio for an account and a link
   back to `<API>/integrations/callback?connection=<row id>`, and records the account on the row.
   The row comes first, so a disconnect meanwhile retires it; the connect then fails and the
   new account is removed.
2. The browser goes straight to the provider's consent for our OAuth app (`initiate`, not
   `link`, which would show Composio's hosted page first), and Composio sends it to that callback.
3. The callback asks Composio for the account's state: live replaces any previous connection to
   that provider (which retires), failed retires the attempt, and still pending or Composio
   unreachable leaves it pending. Either way it redirects to
   `<APP_URL>/?integration=<provider>&integration_status=connected|pending|failed`.
4. Listing the organization's tools settles every pending row again, so a connection that went
   live after its callback shows.

Disconnecting retires every row for that provider, an unfinished attempt included, so an
earlier consent's callback cannot bring the connection back. It answers success only once Composio
confirms each removal; otherwise it fails, the provider is already off for the organization, and
the removal is retried.

`integrationPreview` runs one read per provider to prove a connection works: GitHub
organizations, Linear teams, Slack channels. The tools' versions are pinned in
`src/composio/lib/preview-tools.ts`.

## Composio setup

Per environment, a Composio project with one auth config per provider, each on our own OAuth
app with the redirect URI `https://backend.composio.dev/api/v3/toolkits/auth/callback`. The API
reads the project key as `COMPOSIO_API_KEY` and the auth configs as `COMPOSIO_AUTH_CONFIG_IDS`
([environment](environment.md#api-srcservicesapi)). A new provider needs its auth config, its
pair in that variable, a row in the constants migration's `integration_provider`
([migrations](style-guide/migrations.md#constants)), `INTEGRATION_PROVIDERS` and a preview tool.
