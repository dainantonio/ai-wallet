import { Router, type IRouter } from "express";
import { sql, desc, sum, count } from "drizzle-orm";
import { GetUsageResponse, RunOptimizationResponse } from "@workspace/api-zod";
import { db, costLogsTable } from "@workspace/db";

const router: IRouter = Router();

// ── Mock fallback data ────────────────────────────────────────────────────────

const mockActivity = [
  { id: "1", type: "usage" as const, label: "GPT-4o request", value: "$0.032", timestamp: "2 min ago" },
  { id: "2", type: "optimization" as const, label: "Route switched to Claude 3.5", value: "-$0.018", timestamp: "5 min ago" },
  { id: "3", type: "alert" as const, label: "Budget threshold reached 80%", value: "$128.00", timestamp: "12 min ago" },
  { id: "4", type: "usage" as const, label: "Gemini 1.5 Pro request", value: "$0.007", timestamp: "18 min ago" },
  { id: "5", type: "optimization" as const, label: "Semantic cache hit", value: "-$0.012", timestamp: "25 min ago" },
  { id: "6", type: "usage" as const, label: "Claude 3.5 Sonnet request", value: "$0.024", timestamp: "31 min ago" },
];

let activityLog = [...mockActivity];

const mockModels = [
  { model: "GPT-4o", requests: 1240, percentage: 52, avgLatency: 1.4, cost: 82.50 },
  { model: "Claude 3.5 Sonnet", requests: 740, percentage: 31, avgLatency: 1.1, cost: 49.20 },
  { model: "Gemini 1.5 Pro", requests: 400, percentage: 17, avgLatency: 0.9, cost: 26.80 },
];

const mockResponse = {
  totalRequests: 2380,
  avgLatency: 1.2,
  totalSpend: 158.50,
  savings: 34.20,
  savingsPercent: 21.6,
  autopilotSaved: 34.20,
  credits: 841.50,
  avgCost: 0.067,
  topTool: "GPT-4o",
  models: mockModels,
  activity: mockActivity.slice(0, 10),
  savingsInsights: {
    topSavings: [
      { label: "Model switching (GPT-4o → Claude 3.5)", savedAmount: 18.40, category: "routing" },
      { label: "Semantic cache hits (312 requests)", savedAmount: 9.60, category: "caching" },
      { label: "Prompt compression (avg 28% reduction)", savedAmount: 6.20, category: "compression" },
    ],
    wastedSpend: 22.30,
    recommendation: "Switch 30% of GPT-4o usage to GPT-4o-mini for simple tasks — estimated additional savings of $19/mo.",
  },
};

const optimizationMessages = [
  { label: "Smart route: GPT-4o → Claude 3.5", value: "-$0.022" },
  { label: "Cache hit: repeated prompt skipped", value: "-$0.031" },
  { label: "Semantic deduplicate batch", value: "-$0.015" },
  { label: "Model downgrade: GPT-4o-mini used", value: "-$0.027" },
  { label: "Prompt compression applied", value: "-$0.009" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

// ── GET /api/usage ────────────────────────────────────────────────────────────

router.get("/usage", async (_req, res) => {
  try {
    if (!db) {
      res.json(GetUsageResponse.parse(mockResponse));
      return;
    }

    // 1. Aggregated totals
    const [totals] = await db
      .select({
        totalSpend:    sql<number>`COALESCE(SUM(${costLogsTable.cost}), 0)`,
        totalSaved:    sql<number>`COALESCE(SUM(${costLogsTable.saved}), 0)`,
        totalRequests: sql<number>`COUNT(*)`,
        avgCost:       sql<number>`COALESCE(AVG(${costLogsTable.cost}), 0)`,
      })
      .from(costLogsTable);

    const totalRequests = Number(totals.totalRequests);

    // Fall back to mock when table is empty
    if (totalRequests === 0) {
      res.json(GetUsageResponse.parse(mockResponse));
      return;
    }

    const totalSpend  = Number(totals.totalSpend);
    const totalSaved  = Number(totals.totalSaved);
    const avgCostVal  = Number(totals.avgCost);
    const savingsPct  = totalSpend + totalSaved > 0
      ? (totalSaved / (totalSpend + totalSaved)) * 100
      : 0;

    // 2. Per-model breakdown
    const modelRows = await db
      .select({
        model:    costLogsTable.model,
        requests: sql<number>`COUNT(*)`,
        cost:     sql<number>`COALESCE(SUM(${costLogsTable.cost}), 0)`,
      })
      .from(costLogsTable)
      .groupBy(costLogsTable.model);

    const models = modelRows.map((row) => ({
      model:      row.model,
      requests:   Number(row.requests),
      cost:       Math.round(Number(row.cost) * 100) / 100,
      percentage: totalRequests > 0
        ? Math.round((Number(row.requests) / totalRequests) * 100)
        : 0,
      avgLatency: 1.2,
    }));

    const topModel = models.reduce(
      (best, m) => (m.requests > best.requests ? m : best),
      models[0],
    );

    // 3. Last 10 rows as activity log
    const recentRows = await db
      .select()
      .from(costLogsTable)
      .orderBy(desc(costLogsTable.createdAt))
      .limit(10);

    const activity = recentRows.map((row) => ({
      id:        row.id,
      type:      "usage" as const,
      label:     row.label ?? `${row.model} request`,
      value:     `$${row.cost.toFixed(3)}`,
      timestamp: formatRelativeTime(new Date(row.createdAt)),
    }));

    const data = GetUsageResponse.parse({
      totalRequests,
      avgLatency:    1.2,
      totalSpend:    Math.round(totalSpend * 100) / 100,
      savings:       Math.round(totalSaved * 100) / 100,
      savingsPercent: Math.round(savingsPct * 10) / 10,
      autopilotSaved: Math.round(totalSaved * 100) / 100,
      credits:       1000 - Math.round(totalSpend * 100) / 100,
      avgCost:       Math.round(avgCostVal * 1000) / 1000,
      topTool:       topModel?.model ?? "N/A",
      models,
      activity,
      savingsInsights: mockResponse.savingsInsights,
    });

    res.json(data);
  } catch (err) {
    // On any DB error, serve mock so the UI never breaks
    console.error("[usage] DB query failed, falling back to mock:", err);
    res.json(GetUsageResponse.parse(mockResponse));
  }
});

// ── POST /api/optimize ────────────────────────────────────────────────────────

router.post("/optimize", (_req, res) => {
  const pick = optimizationMessages[Math.floor(Math.random() * optimizationMessages.length)];
  const newItem = {
    id: Date.now().toString(),
    type: "optimization" as const,
    label: pick.label,
    value: pick.value,
    timestamp: "just now",
  };

  activityLog = [newItem, ...activityLog].slice(0, 10);

  const data = RunOptimizationResponse.parse({
    success: true,
    newItems: [newItem],
    totalActivity: activityLog,
  });
  res.json(data);
});

export default router;
