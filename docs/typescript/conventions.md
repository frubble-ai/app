# TypeScript Conventions

How we name things and handle dates in every app and package.

## Naming

1. **Shared, exported, cross-module types take a prefix: `I` for interfaces, `T` for type
   aliases.** This is the public type surface of a package or a shared module: what
   `src/shared/` or a package's root entry exports. At an unfamiliar call site the prefix
   tells the reader what kind of thing it is before they open its definition.

   ```ts
   // Shared and exported: prefixed.
   export interface IUser {
   	id: string;
   	email: string;
   }

   export type TConfig = {
   	port: number;
   	environment: "local" | "stg" | "prd";
   };
   ```

2. **Local, module-scoped types need no prefix.** A handler's `Props`, a query's `Row`, a
   module's internal record: anything used only inside its own file or module reads fine
   without one.

   ```ts
   // Used only in this file: no prefix.
   interface Row {
   	id: string;
   	createdAt: string;
   }

   type Props = { userId: string };
   ```

3. **Stay consistent within a file.** Do not change existing code only to add or remove a
   prefix. Generated code (`__generated__/`, codegen output) follows its generator's naming
   and is exempt.

4. **No single-letter names** for variables, parameters, catch bindings or generics. A name
   says what a value is.

   ```ts
   // good
   app.get("/health", (context) => context.json({ status: "ok" }));
   try { await connect(); } catch (error) { log(error); }
   for (let attempt = 1; attempt <= retries; attempt++) {}
   function first<TResult>(items: TResult[]): TResult | undefined {}

   // bad
   app.get("/health", (c) => c.json({ status: "ok" }));
   try { await connect(); } catch (e) { log(e); }
   function first<T>(items: T[]): T | undefined {}
   ```

   `_` marks a value that is deliberately unused: `const [_, second] = pair`. `t` is allowed
   for a translation function, by convention. `id-length` in
   [`eslint.config.mjs`](../../eslint.config.mjs) enforces this (minimum 2, with `t` and `_`
   as the exceptions) on every TypeScript file.

## Dates and times

5. **Dates and times are Luxon `DateTime` everywhere**: arithmetic, comparison, formatting
   and parsing. A JavaScript `Date` appears only where a library insists on one, and it is
   converted at that boundary, in both directions. Timestamps are UTC until they are shown
   to a person, and only then converted to that person's zone.

   ```ts
   import { DateTime } from "luxon";

   // good
   const expiresAt = DateTime.utc().plus({ days: 7 });
   if (expiresAt < DateTime.utc()) {}
   const row = { expiresAt: expiresAt.toJSDate() }; // the driver wants a Date
   const shown = DateTime.fromJSDate(row.expiresAt).setZone(user.timeZone).toFormat("dd/MM/yyyy");

   // bad
   const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
   if (expiresAt.getTime() < Date.now()) {}
   ```

   Luxon is not installed yet; the first workspace that handles a date adds it.
