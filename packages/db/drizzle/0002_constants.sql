-- Custom SQL migration file, put your code below! --
-- Database constants: reference rows the app reads at runtime, separate from the table schema.
-- Must remain the last migration, so every table it fills exists (docs/style-guide/migrations.md,
-- "Constants").

-- The tools an organization can connect. A new one also needs its Composio auth config
-- (docs/integrations.md).
INSERT INTO "integration_provider" ("key") VALUES
	('github'),
	('linear'),
	('slack')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
-- A connection's lifecycle: pending until consent finishes, active, then retiring until Composio
-- confirms its account is removed.
INSERT INTO "integration_status" ("key") VALUES
	('pending'),
	('active'),
	('retiring')
ON CONFLICT ("key") DO NOTHING;
