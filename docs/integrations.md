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
`pending` while the provider's consent is open, `active` after it. One active row per
organization and provider.

1. `startIntegrationConnect` creates a pending row and asks Composio for a link back to
   `<API>/integrations/callback?connection=<row id>`.
2. The browser goes through the provider's consent and Composio sends it to that callback.
3. The callback asks Composio for the account's state: live replaces any previous connection to
   that provider (and removes it at Composio), failed drops the attempt. Either way it redirects
   to `<APP_URL>/?integration=<provider>&integration_status=connected|pending|failed`.

`integrationPreview` runs one read per provider to prove a connection works: GitHub
organizations, Linear teams, Slack channels. The tools' versions are pinned in
`src/composio/lib/preview-tools.ts`.

## Composio setup

Per environment, a Composio project with one auth config per provider, each on our own OAuth
app with the redirect URI `https://backend.composio.dev/api/v3/toolkits/auth/callback`. The API
reads the project key as `COMPOSIO_API_KEY` and the auth configs as `COMPOSIO_AUTH_CONFIG_IDS`
([environment](environment.md#api-srcservicesapi)). A new provider needs its auth config, its
pair in that variable, a value in the `integration_provider` enum and a preview tool.
