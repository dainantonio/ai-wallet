import { Router, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, userApiKeys, projectsTable } from "@workspace/db";
import { encrypt, decrypt } from "../lib/encrypt";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

const VALID_PROVIDERS = ["openai", "anthropic", "google"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

// ─── GET /api/settings/keys ───────────────────────────────────────────────────
// Returns [{provider, hasKey}] — the raw key is NEVER returned to the client.
router.get("/settings/keys", authMiddleware, async (req: Request, res: Response) => {
  if (!db) {
    return res.json(VALID_PROVIDERS.map(p => ({ provider: p, hasKey: false, count: 0, keys: [] })));
  }
  try {
    const userId = req.user!.id;
    const rows = await db
      .select({
        id: userApiKeys.id,
        provider: userApiKeys.provider,
        keyName: userApiKeys.keyName,
        projectId: userApiKeys.projectId,
        projectName: projectsTable.name,
      })
      .from(userApiKeys)
      .leftJoin(projectsTable, eq(userApiKeys.projectId, projectsTable.id))
      .where(eq(userApiKeys.userId, userId));

    const byProvider = new Map<string, { id: string; keyName: string; projectId: string | null; projectName: string | null }[]>();
    rows.forEach((r) => {
      const list = byProvider.get(r.provider) ?? [];
      list.push({
        id: r.id,
        keyName: r.keyName,
        projectId: r.projectId ?? null,
        projectName: r.projectName ?? null,
      });
      byProvider.set(r.provider, list);
    });

    res.json(VALID_PROVIDERS.map(p => {
      const keys = byProvider.get(p) ?? [];
      return { provider: p, hasKey: keys.length > 0, count: keys.length, keys };
    }));
  } catch (err) {
    console.error("[settings] GET /settings/keys:", err);
    res.status(500).json({ error: "Failed to load key status" });
  }
});

// ─── POST /api/settings/keys ──────────────────────────────────────────────────
// Body: { provider: string, apiKey: string, keyName?: string, projectId?: string|null }
// Upserts one scoped encrypted key for the authenticated user.
router.post("/settings/keys", authMiddleware, async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ error: "Database unavailable" });
  try {
    const { provider, apiKey, keyName, projectId } = req.body as {
      provider?: string; apiKey?: string; keyName?: string; projectId?: string | null;
    };

    if (!provider || !VALID_PROVIDERS.includes(provider as Provider)) {
      return res.status(400).json({ error: "provider must be one of: openai, anthropic, google" });
    }
    if (!apiKey?.trim()) {
      return res.status(400).json({ error: "apiKey is required" });
    }

    const userId = req.user!.id;
    const safeKeyName = (keyName?.trim() || "default").slice(0, 64);
    const encryptedKey = encrypt(apiKey.trim());

    // Replace existing key only for exact scope.
    await db.delete(userApiKeys).where(
      and(
        eq(userApiKeys.userId, userId),
        eq(userApiKeys.provider, provider),
        eq(userApiKeys.keyName, safeKeyName),
        eq(userApiKeys.projectId, projectId ?? null),
      ),
    );
    await db.insert(userApiKeys).values({
      userId,
      provider,
      encryptedKey,
      keyName: safeKeyName,
      projectId: projectId ?? null,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("[settings] POST /settings/keys:", err);
    res.status(500).json({ error: "Failed to save key" });
  }
});

// ─── DELETE /api/settings/keys/:id ───────────────────────────────────────────
router.delete("/settings/keys/:id", authMiddleware, async (req: Request, res: Response) => {
  if (!db) return res.status(503).json({ error: "Database unavailable" });
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    await db.delete(userApiKeys).where(
      and(eq(userApiKeys.userId, userId), eq(userApiKeys.id, id)),
    );
    res.json({ success: true });
  } catch (err) {
    console.error("[settings] DELETE /settings/keys/:id:", err);
    res.status(500).json({ error: "Failed to remove key" });
  }
});

// ─── Internal helper called by proxy.ts ───────────────────────────────────────
// Returns project-scoped key if available, else default (projectId null).
export async function getUserApiKey(
  userId: string,
  provider: string,
  projectId?: string | null,
): Promise<string | null> {
  if (!db) return null;
  try {
    const scoped = projectId
      ? await db
      .select({ encryptedKey: userApiKeys.encryptedKey })
      .from(userApiKeys)
      .where(and(
        eq(userApiKeys.userId, userId),
        eq(userApiKeys.provider, provider),
        eq(userApiKeys.projectId, projectId),
      ))
      .limit(1)
      : [];
    if (scoped[0]) return decrypt(scoped[0].encryptedKey);

    const fallback = await db
      .select({ encryptedKey: userApiKeys.encryptedKey })
      .from(userApiKeys)
      .where(and(
        eq(userApiKeys.userId, userId),
        eq(userApiKeys.provider, provider),
        eq(userApiKeys.projectId, null),
      ))
      .limit(1);
    if (!fallback[0]) return null;
    return decrypt(fallback[0].encryptedKey);
  } catch (err) {
    console.error("[settings] getUserApiKey error (non-fatal):", err);
    return null;
  }
}

export default router;
