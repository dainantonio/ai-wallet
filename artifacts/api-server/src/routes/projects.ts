import { Router, type IRouter, type Request, type Response } from "express";
import { db, projectsTable } from "@workspace/db";
import { sql, eq, and } from "drizzle-orm";

const router: IRouter = Router();

// ─── GET /api/projects ────────────────────────────────────────────────────────
router.get("/projects", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!db) { res.json([]); return; }

  try {
    const rows = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.userId, req.user.id))
      .orderBy(projectsTable.createdAt);
    res.json(rows);
  } catch (err) {
    console.error("[projects] GET /api/projects", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// ─── POST /api/projects ───────────────────────────────────────────────────────
router.post("/projects", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!db) { res.json({ ok: true, skipped: true }); return; }

  const { name, clientName, color } = req.body as {
    name?: string; clientName?: string; color?: string;
  };

  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  try {
    const [row] = await db
      .insert(projectsTable)
      .values({
        userId:     req.user.id,
        name:       name.trim(),
        clientName: clientName?.trim() || null,
        color:      color || "#6366f1",
      })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error("[projects] POST /api/projects", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// ─── GET /api/projects/:id/costs ──────────────────────────────────────────────
router.get("/projects/:id/costs", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!db) { res.json({ totals: { total_cost: 0, total_saved: 0, request_count: 0 }, byModel: [] }); return; }

  const { id } = req.params;
  const userId = req.user.id;

  try {
    const [totals] = await db.execute<{
      total_cost: number; total_saved: number; request_count: number;
    }>(sql`
      SELECT
        COALESCE(SUM(cost), 0)           AS total_cost,
        COALESCE(SUM(saved), 0)          AS total_saved,
        COUNT(*)::int                    AS request_count
      FROM ai_cost_logs
      WHERE user_id = ${userId}
        AND project_id = ${id}::uuid
    `);

    const byModel = await db.execute<{
      model: string; provider: string; request_count: number;
      total_cost: number; total_saved: number;
    }>(sql`
      SELECT
        model,
        provider,
        COUNT(*)::int   AS request_count,
        SUM(cost)       AS total_cost,
        SUM(saved)      AS total_saved
      FROM ai_cost_logs
      WHERE user_id = ${userId}
        AND project_id = ${id}::uuid
      GROUP BY model, provider
      ORDER BY total_cost DESC
    `);

    res.json({ totals, byModel });
  } catch (err) {
    console.error("[projects] GET /api/projects/:id/costs", err);
    res.status(500).json({ error: "Failed to fetch project costs" });
  }
});

// ─── DELETE /api/projects/:id ─────────────────────────────────────────────────
router.delete("/projects/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!db) { res.json({ ok: true }); return; }

  const { id } = req.params;

  try {
    await db
      .delete(projectsTable)
      .where(and(
        eq(projectsTable.id, id),
        eq(projectsTable.userId, req.user.id),
      ));
    res.json({ ok: true });
  } catch (err) {
    console.error("[projects] DELETE /api/projects/:id", err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
