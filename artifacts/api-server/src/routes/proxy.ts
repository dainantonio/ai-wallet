import { Router, type IRouter, type Request, type Response } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { db, costLogsTable } from "@workspace/db";

const router: IRouter = Router();

// ─── Rates mirror wallet.ts PROVIDER_META exactly ────────────────────────────
const RATES: Record<string, { inRate: number; outRate: number; defaultModel: string; dbProvider: string }> = {
  openai:    { inRate: 0.000050,  outRate: 0.000150,  defaultModel: "gpt-4o",                     dbProvider: "OpenAI"    },
  anthropic: { inRate: 0.000075,  outRate: 0.000240,  defaultModel: "claude-3-5-sonnet-20241022",  dbProvider: "Anthropic" },
  gemini:    { inRate: 0.0000125, outRate: 0.0000375, defaultModel: "gemini-1.5-pro",              dbProvider: "Google"    },
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
  }).catch((err: unknown) => {
    console.error("[proxy] DB cost log failed (non-fatal):", err);
  });
}

// ─── POST /api/proxy/chat ─────────────────────────────────────────────────────
router.post("/proxy/chat", async (req: Request, res: Response) => {
  const { provider, model, messages, userId, taskLabel } = req.body as {
    provider?: string;
    model?: string;
    messages?: { role: string; content: string }[];
    userId?: string;
    taskLabel?: string;
  };

  if (!provider || !["openai", "anthropic", "gemini"].includes(provider)) {
    res.status(400).json({ error: "provider must be one of: openai, anthropic, gemini" });
    return;
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required and must not be empty" });
    return;
  }

  const resolvedUserId = userId ?? (req.isAuthenticated() ? req.user.id : "anonymous");
  const label = taskLabel ?? `${provider} chat request`;
  const rates = RATES[provider]!;
  const resolvedModel = model ?? rates.defaultModel;

  try {
    // ── OpenAI ──────────────────────────────────────────────────────────────
    if (provider === "openai") {
      if (!process.env.OPENAI_API_KEY) {
        res.status(400).json({ error: "Provider not configured" });
        return;
      }

      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await client.chat.completions.create({
        model: resolvedModel,
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      });

      const content = completion.choices[0]?.message?.content ?? "";
      const inputTokens  = completion.usage?.prompt_tokens     ?? 0;
      const outputTokens = completion.usage?.completion_tokens ?? 0;
      const cost = calcCost("openai", inputTokens, outputTokens);

      logCostToDb(resolvedUserId, "openai", resolvedModel, inputTokens, outputTokens, cost, label);

      res.json({ content, usage: { input_tokens: inputTokens, output_tokens: outputTokens }, cost });
      return;
    }

    // ── Anthropic ───────────────────────────────────────────────────────────
    if (provider === "anthropic") {
      if (!process.env.ANTHROPIC_API_KEY) {
        res.status(400).json({ error: "Provider not configured" });
        return;
      }

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

      logCostToDb(resolvedUserId, "anthropic", resolvedModel, inputTokens, outputTokens, cost, label);

      res.json({ content, usage: { input_tokens: inputTokens, output_tokens: outputTokens }, cost });
      return;
    }

    // ── Gemini ──────────────────────────────────────────────────────────────
    if (provider === "gemini") {
      if (!process.env.GEMINI_API_KEY) {
        res.status(400).json({ error: "Provider not configured" });
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role:  m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

      const result = await ai.models.generateContent({
        model: resolvedModel,
        contents,
      });

      const content      = result.text ?? "";
      const inputTokens  = result.usageMetadata?.promptTokenCount     ?? 0;
      const outputTokens = result.usageMetadata?.candidatesTokenCount ?? 0;
      const cost = calcCost("gemini", inputTokens, outputTokens);

      logCostToDb(resolvedUserId, "gemini", resolvedModel, inputTokens, outputTokens, cost, label);

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
