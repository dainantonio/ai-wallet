import { Router, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, userApiKeys } from "@workspace/db";
import { encrypt, decrypt } from "../lib/encrypt";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

const VALID_PROVIDERS = ["openai", "anthropic", "google"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

// ─── GET /api/settings/keys ───────────────────────────────────────────────────
// Returns [{provider, hasKey}] — the raw key is NEVER returned to the client.
router.get("/settings/keys", authMiddleware, async (req: Request, res: Response) => {
  if (!db) {
    return res.json(VALID_PROVIDERS.map(p => ({ provider: p, hasKey: false })));
  }
  try {
    const userId = req.user!.id;
    const rows = await db
      .select({ provider: userApiKeys.provider })
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, userId));

    const configured = new Set(rows.map(r => r.provider));
    res.json(VALID_PROVIDERS.map(p => ({ provider: p, hasKey: configured.has(p) })));
  } catch (err) {
    console.error("[settings] GET /settings/keys:", err);
    res.status(500).json({ error: "Failed to load key status" });
  }
});

// ─── POST /api/settings/keys ──────────────────────────────────────────────────
// Body: { provider: string, apiKey: string }
// Upserts the encrypted key for the authenticated user.
router.post("/settings/keys", authMiddleware, async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ error: "Database unavailable" });
  try {
    const { provider, apiKey } = req.body as { provider?: string; apiKey?: string };

    if (!provider || !VALID_PROVIDERS.includes(provider as Provider)) {
      return res.status(400).json({ error: "provider must be one of: openai, anthropic, google" });
    }
    if (!apiKey?.trim()) {
      return res.status(400).json({ error: "apiKey is required" });
    }

    const userId = req.user!.id;
    const encryptedKey = encrypt(apiKey.trim());

    // Delete existing entry for this (user, provider) pair then insert fresh.
    await db.delete(userApiKeys).where(
      and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider)),
    );
    await db.insert(userApiKeys).values({ userId, provider, encryptedKey });

    res.json({ success: true });
  } catch (err) {
    console.error("[settings] POST /settings/keys:", err);
    res.status(500).json({ error: "Failed to save key" });
  }
});

// ─── DELETE /api/settings/keys/:provider ─────────────────────────────────────
router.delete("/settings/keys/:provider", authMiddleware, async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ error: "Database unavailable" });
  try {
    const { provider } = req.params;
    const userId = req.user!.id;
    await db.delete(userApiKeys).where(
      and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider)),
    );
    res.json({ success: true });
  } catch (err) {
    console.error("[settings] DELETE /settings/keys/:provider:", err);
    res.status(500).json({ error: "Failed to remove key" });
  }
});

// ─── Internal helper called by proxy.ts ───────────────────────────────────────
// Returns the decrypted key for (userId, provider), or null if none stored.
export async function getUserApiKey(userId: string, provider: string): Promise<string | null> {
  if (!db) return null;
  try {
    const rows = await db
      .select({ encryptedKey: userApiKeys.encryptedKey })
      .from(userApiKeys)
      .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider)))
      .limit(1);
    if (!rows[0]) return null;
    return decrypt(rows[0].encryptedKey);
  } catch (err) {
    console.error("[settings] getUserApiKey error (non-fatal):", err);
    return null;
  }
}

export default router;
