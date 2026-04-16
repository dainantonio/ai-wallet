import { Shell } from "@/components/layout/Shell";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders, TrendingDown, TrendingUp, DollarSign,
  Calendar, ArrowRight, Zap, GitMerge, CheckCircle2,
  AlertTriangle, Cpu, ChevronRight, Sparkles,
} from "lucide-react";

// ─── Routing Simulation ───────────────────────────────────────────────────────

type Complexity = "simple" | "moderate" | "complex";

interface RoutingModel {
  id: string;
  label: string;
  tier: Complexity;
  inputPer1k: number;
  outputPer1k: number;
  description: string;
}

const ROUTING_MODELS: RoutingModel[] = [
  { id: "gemini-flash",   label: "Gemini 1.5 Flash", tier: "simple",   inputPer1k: 0.000075, outputPer1k: 0.0003,  description: "Ultra-cheap, fast, great for Q&A and lookup"    },
  { id: "claude-haiku",   label: "Claude Haiku",     tier: "moderate", inputPer1k: 0.00025,  outputPer1k: 0.00125, description: "Balanced, handles summaries and light reasoning" },
  { id: "gpt-4o",         label: "GPT-4o",           tier: "complex",  inputPer1k: 0.0025,   outputPer1k: 0.010,   description: "Premium, for code, analysis, long-form tasks"   },
];

const COMPLEX_KEYWORDS = [
  "analyze", "analyse", "compare", "contrast", "explain", "implement", "debug",
  "code", "algorithm", "refactor", "architecture", "design", "reason",
  "calculate", "comprehensive", "detailed", "summarize", "translate", "write",
  "generate", "optimize", "evaluate", "research", "plan",
];

function classifyPrompt(text: string): {
  complexity: Complexity;
  reasons: string[];
  charCount: number;
  estimatedInputTokens: number;
} {
  const trimmed = text.trim();
  const charCount = trimmed.length;
  const lower = trimmed.toLowerCase();
  const reasons: string[] = [];

  const matchedKeywords = COMPLEX_KEYWORDS.filter(k => lower.includes(k));
  const isLong = charCount > 600;
  const isMedium = charCount >= 200 && charCount <= 600;
  const hasComplexKeywords = matchedKeywords.length > 0;

  let complexity: Complexity = "simple";

  if (isLong || (hasComplexKeywords && charCount >= 200)) {
    complexity = "complex";
    if (isLong) reasons.push(`Long prompt (${charCount} chars > 600)`);
    if (hasComplexKeywords) reasons.push(`Complex keywords: "${matchedKeywords.slice(0, 3).join('", "')}"`);
  } else if (isMedium || (hasComplexKeywords && charCount < 200)) {
    complexity = "moderate";
    if (isMedium) reasons.push(`Medium length (${charCount} chars, 200–600)`);
    if (hasComplexKeywords) reasons.push(`Detected: "${matchedKeywords[0]}"`);
  } else {
    reasons.push(`Short (${charCount} chars < 200)`);
    reasons.push("No complex task keywords found");
  }

  // Rough token estimate: ~0.75 tokens per char
  const estimatedInputTokens = Math.max(Math.round(charCount * 0.75), 50);

  return { complexity, reasons, charCount, estimatedInputTokens };
}

function routeModel(complexity: Complexity): RoutingModel {
  return ROUTING_MODELS.find(m => m.tier === complexity)!;
}

// "Actual" = if we sent everything to GPT-4o (the premium model)
const PREMIUM_MODEL = ROUTING_MODELS.find(m => m.id === "gpt-4o")!;

function calcSingleCost(model: RoutingModel, inputTokens: number): number {
  // Assume output ≈ 40% of input tokens
  const outputTokens = Math.round(inputTokens * 0.4);
  return (inputTokens / 1000) * model.inputPer1k + (outputTokens / 1000) * model.outputPer1k;
}

const PRESET_PROMPTS = [
  { label: "Simple query", text: "What time is it in Tokyo?" },
  { label: "Lookup",       text: "What is the capital of France?" },
  { label: "Summary",      text: "Summarize the following meeting notes in three bullet points: the team discussed Q3 goals, budget allocation, and resource planning." },
  { label: "Code task",    text: "Implement a binary search algorithm in TypeScript and explain the time complexity, including edge cases for empty arrays and single-element arrays." },
  { label: "Analysis",     text: "Analyze the competitive landscape for AI coding assistants. Compare GitHub Copilot, Cursor, and Tabnine across pricing, accuracy, IDE support, and enterprise readiness. Provide a recommendation." },
];

// Mock traffic batch: a realistic mix of prompt types
interface BatchItem {
  label: string;
  prompt: string;
}

const BATCH_PROMPTS: BatchItem[] = [
  { label: "Status check",       prompt: "Is the API down?" },
  { label: "Simple lookup",      prompt: "What is JWT?" },
  { label: "Summarize email",    prompt: "Summarize this email thread and highlight action items." },
  { label: "Code review",        prompt: "Review and debug this Python function that calculates Fibonacci numbers recursively." },
  { label: "Short greeting",     prompt: "Say hello in Spanish." },
  { label: "Architecture plan",  prompt: "Design a microservices architecture for an e-commerce platform with high availability and explain trade-offs." },
  { label: "Quick fact",         prompt: "How many days in a leap year?" },
  { label: "Data analysis",      prompt: "Analyze this CSV dataset and identify trends, outliers, and recommend visualizations." },
];

// ─── Token rates mirrored from wallet.ts PROVIDER_META ────────────────────────
const MODELS = [
  { id: "openai",    label: "GPT-4o",         inputPer1k: 0.0025,  outputPer1k: 0.010  },
  { id: "anthropic", label: "Claude Sonnet",   inputPer1k: 0.003,   outputPer1k: 0.015  },
  { id: "google",    label: "Gemini Pro",      inputPer1k: 0.00125, outputPer1k: 0.005  },
] as const;

// Approximate token counts per prompt length (input + expected output)
const PROMPT_LENGTHS = [
  { id: "short",  label: "Short  (~100 words)",  inputTokens: 130,  outputTokens: 65   },
  { id: "medium", label: "Medium (~400 words)",  inputTokens: 520,  outputTokens: 260  },
  { id: "long",   label: "Long   (~1500 words)", inputTokens: 1950, outputTokens: 975  },
] as const;

type ModelId  = (typeof MODELS)[number]["id"];
type LengthId = (typeof PROMPT_LENGTHS)[number]["id"];

// ─── Calculation helpers ──────────────────────────────────────────────────────
function calcMonthly(modelId: ModelId, lengthId: LengthId, perDay: number): number {
  const m = MODELS.find(x => x.id === modelId)!;
  const l = PROMPT_LENGTHS.find(x => x.id === lengthId)!;
  const perPrompt = (l.inputTokens / 1000) * m.inputPer1k + (l.outputTokens / 1000) * m.outputPer1k;
  return perPrompt * perDay * 30;
}

function fmt(n: number): string {
  if (n >= 10_000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 100)    return `$${n.toFixed(0)}`;
  if (n >= 1)      return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function InputLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
      {children}
    </label>
  );
}

function SelectInput({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { id: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors appearance-none cursor-pointer"
    >
      {options.map(o => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  );
}

function CostCard({
  title, cost, modelLabel, delay, dimmed,
}: {
  title: string;
  cost: number;
  modelLabel: string;
  delay: number;
  dimmed?: boolean;
}) {
  return (
    <motion.div
      key={`${cost}-${dimmed}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: dimmed ? 0.55 : 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="glass-panel p-5 rounded-2xl border border-border/40 stat-card-premium"
    >
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
      <p className="text-xs text-muted-foreground/70 mb-3">{modelLabel}</p>
      <AnimatePresence mode="wait">
        <motion.p
          key={cost.toFixed(6)}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
          className="font-display text-3xl font-bold text-foreground tracking-tight tabular-nums"
        >
          {fmt(cost)}
        </motion.p>
      </AnimatePresence>
      <p className="text-xs text-muted-foreground mt-1">/month</p>
    </motion.div>
  );
}

// ─── Complexity badge ─────────────────────────────────────────────────────────
const COMPLEXITY_CONFIG: Record<Complexity, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  simple:   { label: "Simple",   color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30", Icon: CheckCircle2   },
  moderate: { label: "Moderate", color: "text-amber-500 bg-amber-500/10 border-amber-500/30",       Icon: AlertTriangle  },
  complex:  { label: "Complex",  color: "text-rose-500 bg-rose-500/10 border-rose-500/30",          Icon: Cpu            },
};

// ─── Route Simulator component ────────────────────────────────────────────────
function RouteSimulator() {
  const [promptText, setPromptText] = useState("");
  const [reqPerDay, setReqPerDay]   = useState(100);

  const { complexity, reasons, charCount, estimatedInputTokens } = useMemo(
    () => (promptText.trim() ? classifyPrompt(promptText) : { complexity: "simple" as Complexity, reasons: [], charCount: 0, estimatedInputTokens: 50 }),
    [promptText]
  );

  const routedModel   = routeModel(complexity);
  const actualCost    = calcSingleCost(PREMIUM_MODEL, estimatedInputTokens);
  const optimizedCost = calcSingleCost(routedModel, estimatedInputTokens);
  const savingsAmount = actualCost - optimizedCost;
  const savingsPct    = actualCost > 0 ? (savingsAmount / actualCost) * 100 : 0;

  // Monthly projection
  const monthlyActual    = actualCost * reqPerDay * 30;
  const monthlyOptimized = optimizedCost * reqPerDay * 30;
  const monthlySavings   = monthlyActual - monthlyOptimized;

  const hasPrompt = promptText.trim().length > 0;
  const cfg = COMPLEXITY_CONFIG[complexity];
  const CfgIcon = cfg.Icon;

  // Batch simulation (always visible)
  const batchResults = useMemo(() =>
    BATCH_PROMPTS.map(item => {
      const analysis = classifyPrompt(item.prompt);
      const routed   = routeModel(analysis.complexity);
      const actual   = calcSingleCost(PREMIUM_MODEL, analysis.estimatedInputTokens);
      const optimized = calcSingleCost(routed, analysis.estimatedInputTokens);
      return { ...item, ...analysis, routed, actual, optimized, savings: actual - optimized };
    }), []
  );

  const batchTotalActual    = batchResults.reduce((s, r) => s + r.actual, 0);
  const batchTotalOptimized = batchResults.reduce((s, r) => s + r.optimized, 0);
  const batchTotalSavings   = batchTotalActual - batchTotalOptimized;
  const batchSavingsPct     = batchTotalActual > 0 ? (batchTotalSavings / batchTotalActual) * 100 : 0;

  // Scale batch to monthly
  const batchMonthlyActual    = batchTotalActual    * reqPerDay * 30;
  const batchMonthlyOptimized = batchTotalOptimized * reqPerDay * 30;
  const batchMonthlySavings   = batchMonthlyActual  - batchMonthlyOptimized;

  return (
    <div className="space-y-6">

      {/* ── Prompt input ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-2xl p-6 border border-border/40"
      >
        <div className="flex items-center gap-2 mb-4">
          <GitMerge className="w-4 h-4 text-primary" />
          <h2 className="font-display font-bold text-base">Analyze Your Prompt</h2>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full ml-auto">
            {charCount} chars
          </span>
        </div>

        <textarea
          value={promptText}
          onChange={e => setPromptText(e.target.value)}
          placeholder="Type or paste your prompt here…"
          rows={4}
          className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none transition-colors mb-3"
        />

        {/* Preset chips */}
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground self-center mr-1">
            Try:
          </span>
          {PRESET_PROMPTS.map(p => (
            <button
              key={p.label}
              onClick={() => setPromptText(p.text)}
              className="text-xs px-3 py-1.5 rounded-lg bg-secondary border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors font-medium"
            >
              {p.label}
            </button>
          ))}
          {promptText && (
            <button
              onClick={() => setPromptText("")}
              className="text-xs px-3 py-1.5 rounded-lg bg-secondary border border-border/40 text-muted-foreground hover:text-rose-400 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Routing decision + cost comparison ── */}
      <AnimatePresence mode="wait">
        {hasPrompt && (
          <motion.div
            key={complexity + charCount}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            {/* Routing decision */}
            <div className="glass-panel rounded-2xl p-5 border border-border/40 space-y-4">
              <div className="flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-bold text-sm">Routing Decision</h3>
              </div>

              <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border ${cfg.color}`}>
                <CfgIcon className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold">{cfg.label} prompt</p>
                  <p className="text-xs opacity-80">→ Routed to {routedModel.label}</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto opacity-60" />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Why this route?</p>
                <ul className="space-y-1.5">
                  {reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0 mt-1.5" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-border/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Model info</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{routedModel.description}</p>
              </div>
            </div>

            {/* Cost comparison */}
            <div className="glass-panel rounded-2xl p-5 border border-border/40 space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-bold text-sm">Per-Prompt Cost</h3>
                <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full ml-auto">
                  ~{estimatedInputTokens} input tokens
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-rose-500/8 border border-rose-500/20 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500/80 mb-1">Actual cost</p>
                  <p className="text-xs text-muted-foreground mb-2">{PREMIUM_MODEL.label} (always)</p>
                  <p className="text-2xl font-black font-mono tabular-nums text-foreground">
                    ${actualCost.toFixed(6)}
                  </p>
                </div>
                <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80 mb-1">Optimized cost</p>
                  <p className="text-xs text-muted-foreground mb-2">{routedModel.label}</p>
                  <p className="text-2xl font-black font-mono tabular-nums text-emerald-500">
                    ${optimizedCost.toFixed(6)}
                  </p>
                </div>
              </div>

              {/* Savings hero */}
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80 mb-0.5">Savings</p>
                    <p className="text-2xl font-black font-mono tabular-nums text-emerald-500">
                      ${savingsAmount.toFixed(6)}
                    </p>
                  </div>
                  <p className="text-3xl font-black text-emerald-500/70 tabular-nums">
                    {savingsPct.toFixed(0)}%
                  </p>
                </div>
                <div className="mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${savingsPct}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Requests per day slider ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel rounded-2xl p-5 border border-border/40"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">Daily request volume</span>
          </div>
          <span className="text-sm font-bold tabular-nums text-foreground">{reqPerDay.toLocaleString()} req/day</span>
        </div>
        <input
          type="range" min={1} max={5000} step={1} value={reqPerDay}
          onChange={e => setReqPerDay(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: "#6366f1" }}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1.5">
          <span>1</span><span>1,250</span><span>2,500</span><span>3,750</span><span>5,000</span>
        </div>
      </motion.div>

      {/* ── Batch traffic simulation ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-panel rounded-2xl border border-border/40 overflow-hidden"
      >
        <div className="p-5 border-b border-border/30">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">Traffic Batch Simulation</h3>
            <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full ml-auto">
              {BATCH_PROMPTS.length} sample requests
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            How smart routing handles a realistic mix of prompt types.
          </p>
        </div>

        {/* Batch rows */}
        <div className="divide-y divide-border/20">
          {batchResults.map((row, i) => {
            const c = COMPLEXITY_CONFIG[row.complexity];
            const RI = c.Icon;
            return (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="w-4 text-xs text-muted-foreground/50 font-mono tabular-nums flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{row.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{row.prompt}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold flex-shrink-0 ${c.color}`}>
                  <RI className="w-2.5 h-2.5" />
                  {row.routed.label}
                </div>
                <div className="text-right flex-shrink-0 w-24">
                  <p className="text-[10px] text-muted-foreground line-through tabular-nums">${row.actual.toFixed(6)}</p>
                  <p className="text-xs font-bold font-mono text-emerald-500 tabular-nums">${row.optimized.toFixed(6)}</p>
                </div>
                <div className="text-right flex-shrink-0 w-12">
                  <p className="text-xs font-bold text-emerald-500 tabular-nums">
                    -{((row.savings / row.actual) * 100).toFixed(0)}%
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Batch totals */}
        <div className="p-5 border-t border-border/40 bg-secondary/20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {[
              { label: "Actual cost",    value: `$${batchTotalActual.toFixed(5)}`,    sub: "all GPT-4o",              accent: "text-rose-500"    },
              { label: "Optimized cost", value: `$${batchTotalOptimized.toFixed(5)}`, sub: "smart routing",           accent: "text-emerald-500" },
              { label: "Savings",        value: `$${batchTotalSavings.toFixed(5)}`,   sub: `${batchSavingsPct.toFixed(0)}% cheaper`, accent: "text-emerald-500 font-black" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
                <p className={`text-2xl font-black font-mono tabular-nums ${s.accent}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Monthly projection at current volume */}
          <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
            <div className="p-2 rounded-lg bg-emerald-500/15 flex-shrink-0">
              <TrendingDown className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-emerald-500">
                Save ${batchMonthlySavings.toFixed(2)}/month at {reqPerDay.toLocaleString()} req/day
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Actual: ${batchMonthlyActual.toFixed(2)} → Optimized: ${batchMonthlyOptimized.toFixed(2)} &nbsp;·&nbsp; {batchSavingsPct.toFixed(0)}% reduction
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-500/60 flex-shrink-0" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Simulator() {
  const [activeTab,      setActiveTab]      = useState<"cost" | "route">("route");
  const [promptsPerDay,  setPromptsPerDay]  = useState(100);
  const [lengthId,       setLengthId]       = useState<LengthId>("medium");
  const [currentModel,   setCurrentModel]   = useState<ModelId>("openai");
  const [altModel,       setAltModel]       = useState<ModelId>("google");

  const currentMonthly  = useMemo(() => calcMonthly(currentModel, lengthId, promptsPerDay), [currentModel, lengthId, promptsPerDay]);
  const altMonthly      = useMemo(() => calcMonthly(altModel, lengthId, promptsPerDay),     [altModel, lengthId, promptsPerDay]);
  const monthlySavings  = currentMonthly - altMonthly;
  const annualSavings   = monthlySavings * 12;
  const savingsPct      = currentMonthly > 0 ? (monthlySavings / currentMonthly) * 100 : 0;
  const saving          = monthlySavings > 0;

  const currentLabel = MODELS.find(m => m.id === currentModel)!.label;
  const altLabel     = MODELS.find(m => m.id === altModel)!.label;

  return (
    <Shell>
      <header className="mb-8">
        <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight heading-gradient">
          What-If Simulator
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Estimate cost impact before switching models or routing strategies.
        </p>
      </header>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 p-1 bg-secondary/60 border border-border/40 rounded-2xl mb-8 w-fit">
        {([
          { key: "route", label: "Route Simulator", icon: <GitMerge className="w-3.5 h-3.5" /> },
          { key: "cost",  label: "Cost Simulator",  icon: <Sliders  className="w-3.5 h-3.5" /> },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.key
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "route" ? (
          <motion.div key="route" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            <RouteSimulator />
          </motion.div>
        ) : (
          <motion.div key="cost" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* ── Left: Inputs ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="lg:col-span-2"
        >
          <div className="glass-panel p-6 rounded-2xl border border-border/40 stat-card-premium space-y-6">
            <h2 className="font-display font-bold text-base flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              Simulation Inputs
            </h2>

            {/* Prompts per day */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <InputLabel>Prompts per day</InputLabel>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {promptsPerDay.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={1000}
                step={1}
                value={promptsPerDay}
                onChange={e => setPromptsPerDay(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: "#6366f1" }}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1.5">
                <span>1</span>
                <span>250</span>
                <span>500</span>
                <span>750</span>
                <span>1,000</span>
              </div>
            </div>

            {/* Prompt length */}
            <div>
              <InputLabel>Average prompt length</InputLabel>
              <SelectInput
                value={lengthId}
                onChange={v => setLengthId(v as LengthId)}
                options={PROMPT_LENGTHS}
              />
            </div>

            {/* Current model */}
            <div>
              <InputLabel>Current model</InputLabel>
              <SelectInput
                value={currentModel}
                onChange={v => setCurrentModel(v as ModelId)}
                options={MODELS}
              />
            </div>

            {/* Alternative model */}
            <div>
              <InputLabel>Alternative model</InputLabel>
              <SelectInput
                value={altModel}
                onChange={v => setAltModel(v as ModelId)}
                options={MODELS}
              />
            </div>

            {/* Token rate reference */}
            <div className="pt-2 border-t border-border/30">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Rate reference (per 1K tokens)
              </p>
              <div className="space-y-1.5">
                {MODELS.map(m => (
                  <div key={m.id} className="flex justify-between text-xs">
                    <span className={
                      m.id === currentModel || m.id === altModel
                        ? "text-foreground font-medium"
                        : "text-muted-foreground/60"
                    }>
                      {m.label}
                    </span>
                    <span className="text-muted-foreground/70 tabular-nums">
                      in&nbsp;${m.inputPer1k.toFixed(5)} · out&nbsp;${m.outputPer1k.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Right: Results ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Monthly cost comparison */}
          <div className="grid grid-cols-2 gap-4">
            <CostCard title="Current monthly" cost={currentMonthly} modelLabel={currentLabel} delay={0.05} />
            <CostCard title="Alternative monthly" cost={altMonthly} modelLabel={altLabel} delay={0.1} dimmed={!saving} />
          </div>

          {/* Monthly savings — hero card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className={`glass-panel p-6 rounded-2xl border stat-card-premium relative overflow-hidden ${
              saving
                ? "border-success/30 shadow-[0_0_32px_rgba(16,185,129,0.08)]"
                : "border-destructive/20"
            }`}
          >
            {/* Ambient glow */}
            <div
              className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[60px] opacity-30 -translate-y-1/3 translate-x-1/3 pointer-events-none transition-colors duration-500"
              style={{ background: saving ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.3)" }}
            />

            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Monthly savings
                </p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={monthlySavings.toFixed(6)}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.22 }}
                    className={`font-display text-5xl font-black tracking-tight ${
                      saving ? "text-success" : "text-destructive"
                    }`}
                  >
                    {saving ? "" : "−"}{fmt(Math.abs(monthlySavings))}
                  </motion.p>
                </AnimatePresence>
                {saving && (
                  <p className="text-sm text-success/80 font-medium mt-1">
                    {savingsPct.toFixed(1)}% cheaper than {currentLabel}
                  </p>
                )}
                {!saving && (
                  <p className="text-sm text-destructive/80 font-medium mt-1">
                    {Math.abs(savingsPct).toFixed(1)}% more expensive than {currentLabel}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-2xl ${saving ? "bg-success/15" : "bg-destructive/15"}`}>
                {saving
                  ? <TrendingDown className="w-6 h-6 text-success" />
                  : <TrendingUp   className="w-6 h-6 text-destructive" />
                }
              </div>
            </div>
          </motion.div>

          {/* Annual projection */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="glass-panel p-6 rounded-2xl border border-border/40 stat-card-premium"
          >
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-primary" />
              <h2 className="font-display font-bold text-base">Annual Projection</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current annual</p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={(currentMonthly * 12).toFixed(4)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="text-xl font-bold font-display text-foreground"
                  >
                    {fmt(currentMonthly * 12)}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Alternative annual</p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={(altMonthly * 12).toFixed(4)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="text-xl font-bold font-display text-foreground"
                  >
                    {fmt(altMonthly * 12)}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            {/* Break-even message */}
            <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${
              saving
                ? "bg-success/8 border-success/20"
                : "bg-destructive/8 border-destructive/20"
            }`}>
              <div className={`p-2 rounded-lg flex-shrink-0 ${saving ? "bg-success/20" : "bg-destructive/20"}`}>
                {saving
                  ? <Zap className="w-4 h-4 text-success" />
                  : <DollarSign className="w-4 h-4 text-destructive" />
                }
              </div>
              <div className="min-w-0">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={`${annualSavings.toFixed(2)}-${saving}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.22 }}
                    className={`text-sm font-semibold ${saving ? "text-success" : "text-destructive"}`}
                  >
                    {saving
                      ? `Switching to ${altLabel} saves you ${fmt(annualSavings)}/year`
                      : `${altLabel} would cost you ${fmt(Math.abs(annualSavings))} more/year`
                    }
                  </motion.p>
                </AnimatePresence>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Based on {promptsPerDay.toLocaleString()} prompts/day × 30 days
                </p>
              </div>
              <ArrowRight className={`w-4 h-4 flex-shrink-0 ${saving ? "text-success/60" : "text-destructive/60"}`} />
            </div>
          </motion.div>

          {/* Per-prompt breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="glass-panel p-5 rounded-2xl border border-border/40 stat-card-premium"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Per-prompt cost breakdown
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: currentLabel, modelId: currentModel },
                { label: altLabel,     modelId: altModel     },
              ].map(({ label, modelId }) => {
                const m = MODELS.find(x => x.id === modelId)!;
                const l = PROMPT_LENGTHS.find(x => x.id === lengthId)!;
                const perPrompt = (l.inputTokens / 1000) * m.inputPer1k + (l.outputTokens / 1000) * m.outputPer1k;
                return (
                  <div key={modelId} className="bg-secondary/40 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">{label}</p>
                    <p className="text-base font-bold font-mono text-foreground">${perPrompt.toFixed(6)}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">per prompt</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </div>
      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}
