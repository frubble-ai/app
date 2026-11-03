import { sql } from "drizzle-orm";
import {
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { DateTime } from "luxon";
import { user } from "./auth";
import { organization } from "./organizations";

/** The outside tools an organization can connect: rows of `integration_provider`. */
export const INTEGRATION_PROVIDERS = ["github", "linear", "slack"] as const;

export type TIntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

/**
 * `pending` until the provider's consent finishes, then `active`. `retiring`: replaced, failed or
 * abandoned, kept until Composio confirms the account is removed. Rows of `integration_status`.
 */
export const INTEGRATION_STATUSES = ["pending", "active", "retiring"] as const;

export type TIntegrationStatus = (typeof INTEGRATION_STATUSES)[number];

// Reference tables: their rows live in the constants migration (docs/style-guide/migrations.md).

export const integrationProvider = pgTable("integration_provider", {
	key: varchar("key", { length: 32 }).primaryKey(),
});

export const integrationStatus = pgTable("integration_status", {
	key: varchar("key", { length: 32 }).primaryKey(),
});

/** One attempt or connection of an organization to a provider; the tokens stay at Composio. */
export const integrationConnection = pgTable(
	"integration_connection",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		provider: varchar("provider", { length: 32 })
			.$type<TIntegrationProvider>()
			.notNull()
			.references(() => integrationProvider.key),
		status: varchar("status", { length: 32 })
			.$type<TIntegrationStatus>()
			.default("pending")
			.notNull()
			.references(() => integrationStatus.key),
		// Null while Composio is still creating the account: the row exists first, so a disconnect
		// in the meantime sees and retires it.
		composioConnectedAccountId: text("composio_connected_account_id").unique(),
		connectedById: text("connected_by_id").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => DateTime.utc().toJSDate())
			.notNull(),
	},
	(table) => [
		index("integration_connection_organization_id_idx").on(
			table.organizationId,
		),
		// One live connection per organization and provider.
		uniqueIndex("integration_connection_active_idx")
			.on(table.organizationId, table.provider)
			.where(sql`${table.status} = 'active'`),
	],
);
