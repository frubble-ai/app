import { sql } from "drizzle-orm";
import {
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { DateTime } from "luxon";
import { user } from "./auth";
import { organization } from "./organizations";

/** The outside tools an organization can connect. */
export const integrationProviderEnum = pgEnum("integration_provider", [
	"github",
	"linear",
	"slack",
]);

export type TIntegrationProvider =
	(typeof integrationProviderEnum.enumValues)[number];

/**
 * `pending` until the provider's consent finishes, then `active`. `retiring`: replaced, failed or
 * abandoned, kept until Composio confirms the account is removed, so its tokens are never orphaned.
 */
export const integrationStatusEnum = pgEnum("integration_status", [
	"pending",
	"active",
	"retiring",
]);

/** One attempt or connection of an organization to a provider; the tokens stay at Composio. */
export const integrationConnection = pgTable(
	"integration_connection",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		provider: integrationProviderEnum("provider").notNull(),
		status: integrationStatusEnum("status").default("pending").notNull(),
		composioConnectedAccountId: text("composio_connected_account_id")
			.notNull()
			.unique(),
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
