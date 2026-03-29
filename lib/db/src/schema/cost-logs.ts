import {
  pgTable, uuid, text, integer, real, boolean, timestamp, index,
} from "drizzle-orm/pg-core";


// ─── ai_cost_logs — one row per simulated/real AI API call ───────────────────
export const costLogsTable = pgTable(
  "ai_cost_logs",
  {
    id:           uuid("id").primaryKey().defaultRandom(),
    userId:       text("user_id").notNull(),

    // Model info
    model:        text("model").notNull(),        // e.g. "gpt-4o", "claude-3-5-sonnet"
    provider:     text("provider").notNull(),     // e.g. "OpenAI", "Anthropic"

    // Token counts
    inputTokens:  integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),

    // Cost in USD
    cost:         real("cost").notNull(),
    saved:        real("saved").notNull().default(0),  // amount saved by optimization
    optimized:    boolean("optimized").notNull().default(false),

    label:        text("label"),   // human-readable description
    projectId:    uuid("project_id"),

    createdAt:    timestamp("created_at", { withTimezone: true })
                    .notNull()
                    .defaultNow(),
  },
  (t) => [
    // Primary query pattern: all logs for a user ordered by time
    index("idx_cost_logs_user_created").on(t.userId, t.createdAt),
  ],
);

export type CostLog       = typeof costLogsTable.$inferSelect;
export type InsertCostLog = typeof costLogsTable.$inferInsert;
