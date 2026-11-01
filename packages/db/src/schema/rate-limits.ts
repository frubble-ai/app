import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Fixed-window counters for the unauthenticated auth flows, keyed by flow and email or IP. */
export const rateLimit = pgTable("rate_limit", {
	key: text("key").primaryKey(),
	count: integer("count").notNull(),
	windowStartedAt: timestamp("window_started_at", {
		withTimezone: true,
	}).notNull(),
});
