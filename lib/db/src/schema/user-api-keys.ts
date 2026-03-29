import {
  pgTable, uuid, text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── user_api_keys — one row per (user, provider, project, key_name) ─────────
// Keys are stored AES-256-GCM encrypted; raw keys are never persisted.
//
// To create this table run:
//   CREATE TABLE user_api_keys (
//     id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id      TEXT NOT NULL,
//     provider     TEXT NOT NULL,           -- "openai" | "anthropic" | "google"
//     encrypted_key TEXT NOT NULL,
//     key_name      TEXT NOT NULL DEFAULT 'default',
//     project_id    UUID NULL,
//     created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
//     updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
//   );
//   CREATE UNIQUE INDEX user_api_keys_scope_idx
//     ON user_api_keys (user_id, provider, project_id, key_name);

export const userApiKeys = pgTable(
  "user_api_keys",
  {
    id:           uuid("id").primaryKey().defaultRandom(),
    userId:       text("user_id").notNull(),
    provider:     text("provider").notNull(),      // "openai" | "anthropic" | "google"
    encryptedKey: text("encrypted_key").notNull(), // base64(iv):base64(tag):base64(ciphertext)
    keyName:      text("key_name").notNull().default("default"),
    projectId:    uuid("project_id"),
    createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("user_api_keys_scope_idx").on(t.userId, t.provider, t.projectId, t.keyName),
  ],
);

export type UserApiKey       = typeof userApiKeys.$inferSelect;
export type InsertUserApiKey = typeof userApiKeys.$inferInsert;
