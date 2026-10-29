# Third-Party Integrations

Where the code that talks to an outside library or service lives: analytics, payments, email,
a cloud SDK.

> `src/` here means per app or package: `apps/backend/src/`.

## Rules

1. **Each third-party library gets its own folder, `src/<library>/`**, such as
   `src/posthog/` or `src/stripe/`. The rest of the code imports the wrapper, never the
   library itself, so replacing the library touches one folder.

2. **Inside it, mirror the app's domain folders.** If the app has `users/` and `orders/`,
   the integration has `src/<library>/users/` and `src/<library>/orders/`.

   ```
   src/
   ├── users/
   ├── orders/
   └── posthog/
       ├── users/      # user events
       └── orders/     # order events
   ```

3. **Code used by several domains goes in `src/shared/<library>/`**, such as the configured
   client every domain sends through.

4. **The [placement rule](./placement-rule.md) decides.** One domain uses it → it stays in
   that domain's folder; several do → `src/shared/<library>/`.
