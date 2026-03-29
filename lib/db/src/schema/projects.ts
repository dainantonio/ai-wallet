import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

// ─── projects — one row per client project ───────────────────────────────────
export const projectsTable = pgTable("projects", {
  id:         uuid("id").primaryKey().defaultRandom(),
  userId:     text("user_id").notNull(),
  name:       text("name").notNull(),
  clientName: text("client_name"),
  color:      text("color").notNull().default("#6366f1"),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Project       = typeof projectsTable.$inferSelect;
export type InsertProject = typeof projectsTable.$inferInsert;
