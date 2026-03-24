import { Router, type IRouter } from "express";
import { GetUsageResponse, RunOptimizationResponse } from "@workspace/api-zod";

const router: IRouter = Router();

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

const optimizationMessages = [
  { label: "Smart route: GPT-4o → Claude 3.5", value: "-$0.022" },
  { label: "Cache hit: repeated prompt skipped", value: "-$0.031" },
  { label: "Semantic deduplicate batch", value: "-$0.015" },
  { label: "Model downgrade: GPT-4o-mini used", value: "-$0.027" },
  { label: "Prompt compression applied", value: "-$0.009" },
];

router.get("/usage", (_req, res) => {
  const data = GetUsageResponse.parse({
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
    activity: activityLog.slice(0, 10),
  });
  res.json(data);
});

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
