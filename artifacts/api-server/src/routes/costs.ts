import { Router, type IRouter, type Request, type Response } from "express";
import { db, costLogsTable, type InsertCostLog } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// ─── Shared empty response (when DB is not configured) ────────────────────────
const EMPTY_SUMMARY = {
  daily:   [] as DailyRow[],
  byModel: [] as ModelRow[],
  totals: {
    week_cost: 0, month_cost: 0, week_saved: 0,
    total_saved: 0, week_requests: 0, total_requests: 0,
  },
};

// ─── Types (match what the raw SQL aggregations return) ───────────────────────
interface DailyRow {
  day: string;
  total_cost: number;
  total_saved: number;
  request_count: number;
  input_tokens: number;
  output_tokens: number;
}

interface ModelRow {
  model: string;
  provider: string;
  request_count: number;
  total_cost: number;
  total_saved: number;
  input_tokens: number;
  output_tokens: number;
}

// ─── POST /api/costs/log ─────────────────────────────────────────────────────
// Record a single AI API call. Called from wallet actions and (optionally) the
// browser extension. Silently skips when DB is not configured.
router.post("/costs/log", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!db) { res.json({ ok: true, skipped: true }); return; }

  const {
    model, provider, inputTokens = 0, outputTokens = 0,
    cost, saved = 0, optimized = false, label,
  } = req.body as Partial<InsertCostLog>;

  if (!model || !provider || cost == null) {
    res.status(400).json({ error: "model, provider and cost are required" });
    return;
  }

  try {
    const [row] = await db
      .insert(costLogsTable)
      .values({
        userId: req.user.id,
        model:        String(model),
        provider:     String(provider),
        inputTokens:  Number(inputTokens),
        outputTokens: Number(outputTokens),
        cost:         Number(cost),
        saved:        Number(saved),
        optimized:    Boolean(optimized),
        label:        label ? String(label) : undefined,
      })
      .returning({ id: costLogsTable.id });

    res.json({ ok: true, id: row.id });
  } catch (err) {
    console.error("[costs/log]", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ─── GET /api/costs/summary ──────────────────────────────────────────────────
// Returns daily spend (7 days), per-model breakdown (30 days), and totals.
// Returns zeros when DB is not configured so the frontend always gets a shape.
router.get("/costs/summary", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!db) { res.json(EMPTY_SUMMARY); return; }

  const userId       = req.user.id;
  const now          = new Date();
  const d7           = new Date(now.getTime() - 7  * 86_400_000);
  const d30          = new Date(now.getTime() - 30 * 86_400_000);

  try {
    const [dailyRes, byModelRes, totalsRes] = await Promise.all([
      // ── Daily breakdown — last 7 days ──
      db.execute(sql`
        SELECT
          DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::text AS day,
          COALESCE(SUM(cost),         0)::float AS total_cost,
          COALESCE(SUM(saved),        0)::float AS total_saved,
          COUNT(*)::int                         AS request_count,
          COALESCE(SUM(input_tokens), 0)::int   AS input_tokens,
          COALESCE(SUM(output_tokens),0)::int   AS output_tokens
        FROM ai_cost_logs
        WHERE user_id = ${userId} AND created_at >= ${d7}
        GROUP BY 1
        ORDER BY 1 ASC
      `),
      // ── Per-model — last 30 days ──
      db.execute(sql`
        SELECT
          model,
          provider,
          COUNT(*)::int                          AS request_count,
          COALESCE(SUM(cost),         0)::float  AS total_cost,
          COALESCE(SUM(saved),        0)::float  AS total_saved,
          COALESCE(SUM(input_tokens), 0)::int    AS input_tokens,
          COALESCE(SUM(output_tokens),0)::int    AS output_tokens
        FROM ai_cost_logs
        WHERE user_id = ${userId} AND created_at >= ${d30}
        GROUP BY model, provider
        ORDER BY total_cost DESC
      `),
      // ── Totals ──
      db.execute(sql`
        SELECT
          COALESCE(SUM(CASE WHEN created_at >= ${d7}  THEN cost  END), 0)::float AS week_cost,
          COALESCE(SUM(CASE WHEN created_at >= ${d30} THEN cost  END), 0)::float AS month_cost,
          COALESCE(SUM(CASE WHEN created_at >= ${d7}  THEN saved END), 0)::float AS week_saved,
          COALESCE(SUM(saved), 0)::float                                          AS total_saved,
          COUNT(CASE WHEN created_at >= ${d7}  THEN 1 END)::int                  AS week_requests,
          COUNT(*)::int                                                            AS total_requests
        FROM ai_cost_logs
        WHERE user_id = ${userId}
      `),
    ]);

    res.json({
      daily:   dailyRes.rows  as DailyRow[],
      byModel: byModelRes.rows as ModelRow[],
      totals:  totalsRes.rows[0] ?? EMPTY_SUMMARY.totals,
    });
  } catch (err) {
    console.error("[costs/summary]", err);
    // Never 500 the dashboard — return empty data
    res.json(EMPTY_SUMMARY);
  }
});

export default router;
