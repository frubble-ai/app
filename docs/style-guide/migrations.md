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

This holds while only stg exists (below). Once a database must keep its data, constants change
through new custom migrations instead.

## While only stg exists

No database has to keep its data yet, so a schema change may rewrite migrations stg already ran
(regenerate them, rename a column in place, squash them) instead of adding a forward migration.
`0000_auth`, Better Auth's, stays as it is unless auth changes.

Such a change resets stg after its deploy with `db-reset.yml`
([deployment](../deployment.md#resetting-the-database)), which drops every account, session and
integration connection there; its pull request says so under _Risk and rollback_. Once a database
must keep its data, every change is a new forward migration.
