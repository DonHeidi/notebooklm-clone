// Drizzle schema — single source of truth for the application's own tables.
// Supabase-managed schemas (auth, storage, vault) are NOT modeled here.

// Example table to validate the migration pipeline; replace with real domain
// tables once the scope is defined.
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const notebooks = pgTable("notebooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
