# Use cases

Where the backend's work happens (`apps/backend/src/use-cases`).

## The boundary

1. **The context is setup, not behaviour.** `TUseCaseContext` carries what is configured once at
   boot (`build-use-case-context`): `db`, `auth`, `messages`, `integrations`, `config`, `logger`.
   Nothing on it runs a flow of its own. Each is a library's own client, or a vendor behind a type
   of ours, as the brokers in `integrations` are ([third-party clients](#third-party-clients)).
2. **Only a use case receives the context.** Anything that needs `ctx` is a use case in `cases/`,
   one file each, defined with `defineUseCase`. A use case may call another use case.
3. **`lib/` takes parts of the context, never the context.** A function there receives what it
   needs as arguments: `ctx.db`, a broker, a config value. It never imports
   `@/use-cases` or calls a use case. `@frubble/use-case-lib` enforces both.
4. **Resolvers, HTTP routes, scripts and the worker call use cases**, never `lib/` or a client:
   `yarn db:seed` runs `seed-local-users`. The migration script is not one of them: it runs
   before the API's configuration exists, from the database variables alone, through
   `@frubble/db/migrate`, and never builds the context.

```
use-cases/
├── index.ts                    # TUseCaseContext, defineUseCase
├── build-use-case-context/     # the clients, built once at boot
├── cases/                      # one use case per file
└── lib/
    ├── auth/                   # code and rate-limit helpers taking `db`
    ├── integrations/
    ├── organizations/
    └── shared/
```

## Third-party clients

A vendor the use cases call per request and that we may replace goes on the context behind a
type named for what the use cases need, defined by us. The integration
brokers are the one so far: `ctx.integrations` holds a `TConnectionBroker` per broker
(`src/integrations/`), each implemented in the vendor's folder (`src/composio/`). The use case
still shows what talks to the outside, `ctx.integrations.brokers[row.broker].run(…)`, and no
vendor name, id or status reaches it. Only the vendor's folder imports its library; a lint rule
enforces it ([integrations](../integrations.md#brokers)).

The actions' outputs are defined by us in Osiris's OpenAPI spec, Osiris being our own service, and
generated from it (`src/integrations/`).

Libraries that are not called per request keep the
[third-party integrations](./third-party-integrations.md) wrapper.
