# Docs

How the Frubble workspace is put together.

| Page                                                | What it covers                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [Getting started](getting-started.md)               | Running it locally, the commands, the container                                        |
| [Monorepo](monorepo.md)                             | The layout, apps vs packages, source-first exports, and how to add an app or a package |
| [Style Guide](style-guide/index.md)                 | Placement, imports, packages, third-party integrations, and how tests are written      |
| [TypeScript Conventions](typescript/conventions.md) | Type prefixes, no single-letter names, dates and times with Luxon                      |
| [Dependencies](dependencies.md)                     | Why each `resolutions` override exists and when it can go                              |
| [Deployment](deployment.md)                         | What a push to `stg` does, how to roll back, and the GitHub configuration it needs     |
| [Sign-in](auth.md)                                  | The email and password flow, its codes, its role and rate limits                       |
| [Integrations](integrations.md)                     | Organizations, their roles and invitations, and connecting GitHub, Linear and Slack    |
| [App](app/index.md)                                 | The web app: its stack, structure, tests and how to run it                             |
| [GraphQL](graphql/index.md)                         | The schema, codegen and the client SDK                                                 |
| [Environment](environment.md)                       | Every variable the API, the worker, the migration and the app read                     |
