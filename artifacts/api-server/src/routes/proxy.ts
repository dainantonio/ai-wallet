import { Router, type IRouter, type Request, type Response } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

import { db, costLogsTable } from "@workspace/db";
import { getUserApiKey } from "./settings";

const router: IRouter = Router();
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

// ─── Rates mirror wallet.ts PROVIDER_META exactly ────────────────────────────
const RATES: Record<string, { inRate: number; outRate: number; defaultModel: string; dbProvider: string }> = {
  openai:    { inRate: 0.000050,  outRate: 0.000150,  defaultModel: "gpt-4o",                     dbProvider: "OpenAI"    },
  anthropic: { inRate: 0.000075,  outRate: 0.000240,  defaultModel: "claude-3-5-sonnet-20241022",  dbProvider: "Anthropic" },
  gemini:    { inRate: 0.0000125, outRate: 0.0000375, defaultModel: "gemini-2.0-flash",             dbProvider: "Google"    },
};

function calcCost(provider: string, inputTokens: number, outputTokens: number): number {
  const r = RATES[provider];
  if (!r) return 0;
  return +(inputTokens * r.inRate + outputTokens * r.outRate).toFixed(6);
}

// Fire-and-forget DB write — never blocks the response
function logCostToDb(
  userId: string,
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cost: number,
  label: string,
  projectId?: string | null,
): void {
  if (!db || !process.env.DATABASE_URL) return;
  const dbProvider = RATES[provider]?.dbProvider ?? provider;
  db.insert(costLogsTable).values({
    userId,
    model,
    provider: dbProvider,
    inputTokens,
    outputTokens,
    cost,
    saved: 0,
    optimized: false,
    label,
    ...(projectId ? { projectId } : {}),
  }).catch((err: unknown) => {
    console.error("[proxy] DB cost log failed (non-fatal):", err);
  });
}

// Sanitise a request body for logging — strips nothing sensitive here, but
// truncates long message content so logs stay readable.
function sanitiseBody(body: Record<string, unknown>): Record<string, unknown> {
  const msgs = body.messages;
  return {
    ...body,
    messages: Array.isArray(msgs)
      ? msgs.map((m: unknown) => {
          if (typeof m !== "object" || m === null) return m;
          const { role, content } = m as { role?: unknown; content?: unknown };
          return {
            role,
            content: typeof content === "string" && content.length > 120
              ? content.slice(0, 120) + `…(${content.length} chars)`
              : content,
          };
        })
      : msgs,
  };
}

// ─── POST /api/proxy/chat ─────────────────────────────────────────────────────
router.post("/proxy/chat", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { provider, model, messages, taskLabel, projectId } = req.body as {
    provider?: string;
    model?: string;
    messages?: { role: string; content: string }[];
    taskLabel?: string;
    projectId?: string | null;
  };

  if (!provider || !["openai", "anthropic", "gemini"].includes(provider)) {
    console.error("[proxy] 400 invalid provider — request body:", sanitiseBody(req.body as Record<string, unknown>));
    res.status(400).json({ error: "provider must be one of: openai, anthropic, gemini" });
    return;
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.error("[proxy] 400 empty/missing messages — request body:", sanitiseBody(req.body as Record<string, unknown>));
    res.status(400).json({ error: "messages array is required and must not be empty" });
    return;
  }

  const resolvedUserId = req.user.id;
  const now = Date.now();
  const bucket = rateLimitStore.get(resolvedUserId);
  if (!bucket || now > bucket.resetAt) {
    rateLimitStore.set(resolvedUserId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    if (bucket.count >= RATE_LIMIT_MAX) {
      res.status(429).json({ error: "Rate limit exceeded" });
      return;
    }
    bucket.count += 1;
  }
  const label = taskLabel ?? `${provider} chat request`;
  const rates = RATES[provider]!;
  const resolvedModel = model ?? rates.defaultModel;

  try {
    // ── OpenAI ──────────────────────────────────────────────────────────────
    if (provider === "openai") {
      const apiKey = (await getUserApiKey(resolvedUserId, "openai")) ?? process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error("[proxy] openai key missing — userId:", resolvedUserId, "OPENAI_API_KEY set:", !!process.env.OPENAI_API_KEY);
        res.status(503).json({ error: "Provider not configured: OPENAI_API_KEY is not set. Add it in Replit Secrets or .env" });
        return;
      }

      const client = new OpenAI({ apiKey });
      const completion = await client.chat.completions.create({
        model: resolvedModel,
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      });

      const content = completion.choices[0]?.message?.content ?? "";
      const inputTokens  = completion.usage?.prompt_tokens     ?? 0;
      const outputTokens = completion.usage?.completion_tokens ?? 0;
      const cost = calcCost("openai", inputTokens, outputTokens);

      logCostToDb(resolvedUserId, "openai", resolvedModel, inputTokens, outputTokens, cost, label, projectId);

      res.json({ content, usage: { input_tokens: inputTokens, output_tokens: outputTokens }, cost });
      return;
    }

    // ── Anthropic ───────────────────────────────────────────────────────────
    if (provider === "anthropic") {
      const apiKey = (await getUserApiKey(resolvedUserId, "anthropic")) ?? process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error("[proxy] anthropic key missing — userId:", resolvedUserId, "ANTHROPIC_API_KEY set:", !!process.env.ANTHROPIC_API_KEY);
        res.status(503).json({ error: "Provider not configured: ANTHROPIC_API_KEY is not set. Add it in Replit Secrets or .env" });
        return;
      }

      const client = new Anthropic({ apiKey });

      const systemMsg = messages.find((m) => m.role === "system")?.content;
      const chatMsgs  = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const response = await client.messages.create({
        model: resolvedModel,
        max_tokens: 8192,
        ...(systemMsg ? { system: systemMsg } : {}),
        messages: chatMsgs,
      });

      const block = response.content[0];
      const content = block?.type === "text" ? block.text : "";
      const inputTokens  = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const cost = calcCost("anthropic", inputTokens, outputTokens);

      logCostToDb(resolvedUserId, "anthropic", resolvedModel, inputTokens, outputTokens, cost, label, projectId);

      res.json({ content, usage: { input_tokens: inputTokens, output_tokens: outputTokens }, cost });
      return;
    }

    // ── Gemini ──────────────────────────────────────────────────────────────
    if (provider === "gemini") {
      // Accept GEMINI_API_KEY or GOOGLE_API_KEY (Replit exposes it under the latter name)
      const apiKey = (await getUserApiKey(resolvedUserId, "google"))
        ?? process.env.GEMINI_API_KEY
        ?? process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        console.error("[proxy] gemini key missing — userId:", resolvedUserId,
          "GEMINI_API_KEY set:", !!process.env.GEMINI_API_KEY,
          "GOOGLE_API_KEY set:", !!process.env.GOOGLE_API_KEY);
        res.status(503).json({ error: "Provider not configured: set GEMINI_API_KEY (or GOOGLE_API_KEY) in Replit Secrets or .env" });
        return;
      }

      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role:  m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents }),
        },
      );

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error("[proxy] gemini REST error:", geminiRes.status, errText);
        throw new Error(`Gemini API ${geminiRes.status}: ${errText}`);
      }

      const geminiJson = await geminiRes.json() as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };

      const content      = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const inputTokens  = geminiJson.usageMetadata?.promptTokenCount     ?? 0;
      const outputTokens = geminiJson.usageMetadata?.candidatesTokenCount ?? 0;
      const cost = calcCost("gemini", inputTokens, outputTokens);

      logCostToDb(resolvedUserId, "gemini", resolvedModel, inputTokens, outputTokens, cost, label, projectId);

      res.json({ content, usage: { input_tokens: inputTokens, output_tokens: outputTokens }, cost });
      return;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[proxy] ${provider} request failed:`, err);
    res.status(502).json({ error: `Upstream provider error: ${message}` });
    return;
  }

  res.status(400).json({ error: "Unsupported provider" });
});

export default router;
