# Use cases

Where the backend's work happens (`apps/backend/src/use-cases`).

## The boundary

1. **The context is setup, not behaviour.** `TUseCaseContext` carries configured clients:
   `db`, `auth`, `messages`, `composio`, `config`, `logger`. Nothing on it runs a flow of its own;
   a client is the library's own, set up once at boot (`build-use-case-context`).
2. **Only a use case receives the context.** Anything that needs `ctx` is a use case in `cases/`,
   one file each, defined with `defineUseCase`. A use case may call another use case.
3. **`lib/` takes parts of the context, never the context.** A function there receives what it
   needs as arguments: `ctx.db`, `ctx.composio`, a config value. It never imports
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
    ├── composio/               # Composio's tools as Frubble uses them
    │   ├── github/
    │   ├── linear/
    │   └── slack/
    ├── integrations/
    ├── organizations/
    └── shared/
```

## Third-party clients

A library that is a client the use cases call (Composio) lives on the context as the
library's own client, set up in `src/<library>/`. The use cases call it directly, so what talks
to the outside is visible in the use case; `lib/<library>/` holds the pieces they share, such as
one provider's tool and how its result is read. Libraries that are not called per request keep
the [third-party integrations](./third-party-integrations.md) wrapper.
