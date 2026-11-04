# Migrations

`packages/db/drizzle/` holds the migrations the migration job runs in order, each with its
snapshot in `meta/`.

## Rules

1. **Never edit a generated migration.** What `yarn workspace @frubble/db db:generate` writes stays
   as written: no added comments, statements or rows. Regenerating it must reproduce it byte for
   byte.
2. **Anything Drizzle Kit can't infer goes in a custom migration**, made right after the generated
   one, with a comment saying why it is hand-written:

   ```sh
   yarn workspace @frubble/db drizzle-kit generate --custom --name=<what_it_does>
   ```

3. **Commit each migration with its snapshot and its `meta/_journal.json` entry.**
4. **One schema change per migration**, and read the generated SQL before committing.

## Constants

Reference rows the app reads at runtime (the integration providers and statuses) live in one
custom migration, `drizzle/*_constants.sql`, and it is always the **last** migration, so every
table it fills already exists. A value is a row of a reference table, never a pg enum: adding one
is a new row there. Change a constant by editing its row in that file, never with a `DELETE` or
`UPDATE` in another migration.

When a schema change needs a new migration, keep the constants last:

1. Set the constants file aside, and remove it, its snapshot and its `meta/_journal.json` entry.
2. Generate the new migration (and any custom one it needs).
3. `drizzle-kit generate --custom --name=constants`, then put the constants SQL back in the new
   file, with any new rows.

This holds while no long-lived database has to keep its applied migrations: stg is reset by
`db-reset.yml` ([deployment](../deployment.md)). Once a database must keep them, constants
change through new custom migrations instead.

## Rewriting history while only stg exists

**Decision:** until a database must keep its data (production), a schema change may rewrite
migrations that already ran on stg (regenerate them, rename a column in place, squash them) instead
of adding a forward migration, and stg is then reset with `db-reset.yml`
([deployment](../deployment.md#resetting-the-database)). Every stg account, session and
integration connection goes with the reset; that is accepted, since stg holds no data worth a
backfill.

- **Why:** the migrations stay one readable schema, not a trail of renames and backfills nobody
  will run against real data. PR #27 (integrations behind a broker) is an example: it regenerated
  `0001_organizations_integrations` and `0002_constants` and resets stg.
- **What it asks of a PR:** say in its _Risk and rollback_ that stg needs DB - Reset after the
  deploy, and keep `0000_auth` (Better Auth's) as it is unless auth itself changes.
- **Review:** a rewritten, already-applied migration with a planned stg reset is not a finding. Do
  not ask for a forward migration, a backfill or a data-preserving rename for it.
- **When it ends:** the first database that must keep its data. From then on every change is a new
  forward migration, constants included (see [Constants](#constants)), and this section is
  replaced.
