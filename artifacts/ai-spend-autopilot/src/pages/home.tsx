import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Shell } from "@/components/layout/Shell";
import { StatCard } from "@/components/ui/StatCard";
import { useUsageData } from "@/hooks/use-app-data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useAuthContext } from "@/App";
import {
  Wallet, BrainCircuit, Sparkles, Zap,
  TrendingDown, ArrowRightLeft, Database, Scissors,
  Lightbulb, AlertTriangle, ChevronRight,
  MessageSquare, Image, Bot, Target, CheckCircle2,
  TriangleAlert, XCircle, Gauge, Leaf, Flame,
  CreditCard, Receipt, ArrowDownRight, ArrowUpRight,
  Play, Plus, RefreshCw, X, ShieldCheck, FlaskConical, Copy,
  Minimize2, Maximize2, Globe, Calendar, Send,
} from "lucide-react";
import { motion, AnimatePresence, animate as motionAnimate } from "framer-motion";
import type { UsageData } from "@workspace/api-client-react/src/generated/api.schemas";

// ─── Types ────────────────────────────────────────────────────────────────────
type SpendMode = "saver" | "balanced" | "performance";

interface WalletTx {
  id: string;
  label: string;
  amount: number;
  timestamp: number;
  type: "optimization" | "usage" | "mode_switch" | "deposit";
  provider: string;
}

interface WalletState {
  balance: number;
  totalSaved: number;
  spendMode: SpendMode;
  transactions: WalletTx[];
}

// ─── Spend mode config ────────────────────────────────────────────────────────
const MODES: {
  id: SpendMode; label: string; desc: string; icon: React.ReactNode;
  switchPct: number; color: string; savingsTag: string;
}[] = [
  { id: "saver",       label: "Saver",       desc: "Max savings, slight latency increase", icon: <Leaf className="w-4 h-4" />,  switchPct: 0.50, color: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10", savingsTag: "saving more" },
  { id: "balanced",    label: "Balanced",    desc: "Smart mix of cost and performance",    icon: <Gauge className="w-4 h-4" />, switchPct: 0.30, color: "text-primary border-primary/40 bg-primary/10",             savingsTag: "balanced approach" },
  { id: "performance", label: "Performance", desc: "Best models, full speed",             icon: <Flame className="w-4 h-4" />, switchPct: 0.00, color: "text-orange-400 border-orange-400/40 bg-orange-400/10",    savingsTag: "max performance" },
];

const GPT4O_COST = 0.0665;
const MINI_COST  = 0.0166;
const GPT4O_REQS = 1240;

const COST_LABELS = [
  "GPT-4o API request batch", "Image generation call",
  "Embedding computation", "Chat completion request",
  "Code analysis run", "Document summarization", "Agent pipeline execution",
];

const SPEND_CATEGORIES = [
  { label: "Writing & Chat",   description: "Drafts, summaries, Q&A",     icon: <MessageSquare className="w-4 h-4" />, pct: 48, amount: 76.10, color: "bg-blue-400",    textColor: "text-blue-400" },
  { label: "Image Generation", description: "Visuals, thumbnails, assets", icon: <Image className="w-4 h-4" />,        pct: 31, amount: 49.10, color: "bg-violet-400",  textColor: "text-violet-400" },
  { label: "Automation",       description: "Pipelines, agents, scripts",  icon: <Bot className="w-4 h-4" />,          pct: 21, amount: 33.30, color: "bg-emerald-400", textColor: "text-emerald-400" },
];

const FUNDS_OPTIONS = [10, 25, 50, 100];

// ─── Pre-flight provider pool (tier = cost multiplier vs OpenAI baseline) ─────
const PROVIDERS: { name: string; cheaper: string; company: string; tier: number }[] = [
  { name: "OpenAI GPT-4o",               cheaper: "GPT-4o mini",       company: "OpenAI",    tier: 1.00 },
  { name: "Anthropic Claude 3.5 Sonnet", cheaper: "Claude 3 Haiku",    company: "Anthropic", tier: 1.40 },
  { name: "Google Gemini 1.5 Pro",       cheaper: "Gemini 1.5 Flash",  company: "Gemini",    tier: 0.70 },
  { name: "Meta Llama 3.1 70B",          cheaper: "Llama 3.1 8B",      company: "Meta",      tier: 0.80 },
  { name: "Mistral Large",               cheaper: "Mistral 7B",        company: "Mistral",   tier: 0.75 },
];

// Cost tier label shown in comparison table
const TIER_LABEL: Record<string, string> = {
  "Gemini": "lower", "Meta": "lower", "Mistral": "lower",
  "OpenAI": "medium",
  "Anthropic": "higher",
};

const USAGE_PROVIDERS = ["OpenAI", "Anthropic", "Gemini"];

// ─── Client-side cost rates (mirrors wallet.ts PROVIDER_META) ─────────────────
const PROMPT_COST_RATES = [
  { provider: "OpenAI",    model: "GPT-4o",            inRate: 0.000050,  outRate: 0.000150  },
  { provider: "Anthropic", model: "Claude 3.5 Sonnet", inRate: 0.000075,  outRate: 0.000240  },
  { provider: "Gemini",    model: "Gemini 2.5 Flash",  inRate: 0.0000125, outRate: 0.0000375 },
];

function fmtCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.0001) return `$${cost.toFixed(7)}`;
  if (cost < 0.01)   return `$${cost.toFixed(5)}`;
  return `$${cost.toFixed(4)}`;
}

function estimatePromptCosts(text: string) {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  if (words === 0) return null;
  const inputTokens  = Math.round(words * 1.3);
  const outputTokens = Math.round(inputTokens * 0.5);
  return PROMPT_COST_RATES.map(r => ({
    provider: r.provider,
    model:    r.model,
    cost: +(inputTokens * r.inRate + outputTokens * r.outRate).toFixed(7),
    inputTokens,
  })).sort((a, b) => a.cost - b.cost);
}

// ─── Provider badge colors ────────────────────────────────────────────────────
const PROVIDER_COLOR: Record<string, string> = {
  "OpenAI":    "text-blue-400 bg-blue-400/10",
  "Anthropic": "text-orange-400 bg-orange-400/10",
  "Gemini":    "text-green-400 bg-green-400/10",
  "Google":    "text-green-400 bg-green-400/10",  // legacy alias
  "Meta":      "text-sky-400 bg-sky-400/10",
  "Mistral":   "text-purple-400 bg-purple-400/10",
  "AI Wallet": "text-violet-400 bg-violet-400/10",
  "Wallet":    "text-emerald-400 bg-emerald-400/10",
};

const CLIENT_TASK_LABELS = [
  "Ran: Code explanation task", "Ran: Email draft generation",
  "Ran: Data extraction pipeline", "Ran: Sentiment analysis batch",
  "Ran: Image captioning task", "Ran: Chat completion request",
  "Ran: Document Q&A session", "Ran: Translation pipeline",
  "Ran: Summarization task",
];
const CLIENT_SAVE_LABELS = [
  "Smart routing: GPT-4o → mini", "Semantic cache hit",
  "Batch compression savings", "Model downgrade applied",
  "Duplicate request merged", "Token budget optimization",
];
const CLIENT_COST_LABELS = [
  "GPT-4o API request batch", "Image generation call",
  "Embedding computation", "Chat completion request",
  "Code analysis run", "Document summarization",
  "Agent pipeline execution",
];
const CLIENT_SAVINGS_TIPS = [
  "Switch 60% of GPT-4o calls to GPT-4o mini — same quality, 80% cheaper.",
  "Enable semantic caching — similar prompts share responses automatically.",
  "Batch your embedding calls — up to 10× cheaper than individual requests.",
  "Set a max_tokens limit on all completions to prevent runaway costs.",
  "Route summarization tasks to a lighter model — 3× cheaper than full GPT-4o.",
  "Deduplicate identical requests within 60 s — free cache hits, zero spend.",
  "Compress images before sending to vision models — cuts token usage by 40%.",
  "Use streaming for long completions — reduces timeouts and wasted tokens.",
  "Pre-process prompts to strip boilerplate — fewer input tokens = lower cost.",
];

function defaultClientWallet(): WalletState {
  return {
    balance: 158.50,
    totalSaved: 34.20,
    spendMode: "balanced",
    transactions: [
      { id: "init-1", label: "Semantic cache hit",            amount:  12.40, timestamp: Date.now() - 2  * 60000, type: "optimization", provider: "AI Wallet" },
      { id: "init-2", label: "GPT-4o API request batch",     amount: -0.032, timestamp: Date.now() - 5  * 60000, type: "usage",        provider: "OpenAI"    },
      { id: "init-3", label: "Smart routing: GPT-4o → mini", amount:   9.60, timestamp: Date.now() - 10 * 60000, type: "optimization", provider: "AI Wallet" },
      { id: "init-4", label: "Document summarization",       amount: -0.018, timestamp: Date.now() - 20 * 60000, type: "usage",        provider: "Anthropic" },
      { id: "init-5", label: "Token budget optimization",    amount:   6.20, timestamp: Date.now() - 40 * 60000, type: "optimization", provider: "AI Wallet" },
    ],
  };
}

function demoWallet(): WalletState {
  return {
    balance: 25.00,
    totalSaved: 4.20,
    spendMode: "balanced",
    transactions: [
      { id: "demo-1", label: "Chat completion request",      amount: -0.032, timestamp: Date.now() - 1  * 60000, type: "usage",        provider: "OpenAI"    },
      { id: "demo-2", label: "Semantic cache hit",           amount:  1.80,  timestamp: Date.now() - 3  * 60000, type: "optimization", provider: "AI Wallet" },
      { id: "demo-3", label: "Ran: Email draft generation",  amount: -0.045, timestamp: Date.now() - 8  * 60000, type: "usage",        provider: "Anthropic" },
      { id: "demo-4", label: "Smart routing: GPT-4o → mini", amount:  2.40, timestamp: Date.now() - 15 * 60000, type: "optimization", provider: "AI Wallet" },
      { id: "demo-5", label: "Embedding computation",        amount: -0.008, timestamp: Date.now() - 25 * 60000, type: "usage",        provider: "OpenAI"    },
    ],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeId() { return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return +(Math.random() * (max - min) + min).toFixed(2); }
function formatRelTime(ts: number) {
  const d = Date.now() - ts;
  if (d < 60000)    return "just now";
  if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`;
  return `${Math.floor(d / 3600000)}h ago`;
}
function formatLastUpdated(ts: number) {
  const d = Date.now() - ts;
  if (d < 8000)    return "just now";
  if (d < 60000)   return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  return `${Math.floor(d / 3600000)}h ago`;
}

// ─── Animated number ──────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevRef = useRef(value);
  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    if (!ref.current || from === value) return;
    const ctrl = motionAnimate(from, value, {
      duration: 0.7, ease: "easeOut",
      onUpdate(v) { if (ref.current) ref.current.textContent = prefix + v.toFixed(decimals) + suffix; },
    });
    return () => ctrl.stop();
  }, [value, prefix, suffix, decimals]);
  return <span ref={ref}>{prefix}{value.toFixed(decimals)}{suffix}</span>;
}

function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
      <motion.div className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }} />
    </div>
  );
}

// ─── Efficiency Score ─────────────────────────────────────────────────────────
function calcEfficiencyScore(
  avgCost: number,
  savingsPct: number,
  topProvider: string,
  optimizedFraction: number,
): number {
  let score = 100;
  if (avgCost > 0.05)           score -= 10;
  if (savingsPct < 20)          score -= 15;
  if (topProvider === "OpenAI") score -= 10;
  if (optimizedFraction > 0.30) score += 10;
  return Math.min(100, Math.max(0, score));
}

function scoreColor(score: number) {
  if (score >= 80) return { stroke: "#34d399", text: "text-emerald-400", badge: "bg-emerald-400/15 text-emerald-400", label: "Excellent" };
  if (score >= 50) return { stroke: "#fbbf24", text: "text-amber-400",   badge: "bg-amber-400/15 text-amber-400",   label: "Moderate"  };
  return              { stroke: "#f87171", text: "text-red-400",     badge: "bg-red-400/15 text-red-400",       label: "Needs Work" };
}

function scoreSuggestions(
  avgCost: number,
  savingsPct: number,
  topProvider: string,
  optimizedFraction: number,
): string[] {
  const tips: string[] = [];
  if (avgCost > 0.05)            tips.push("Switch to lighter models — avg cost is above $0.05/request.");
  if (savingsPct < 20)           tips.push("Enable Smart Routing to push your savings rate above 20%.");
  if (topProvider === "OpenAI")  tips.push("Route GPT-4o calls to Gemini Flash — same quality, 30% cheaper.");
  if (optimizedFraction <= 0.30) tips.push("Use Optimize Spend more often to boost your optimized ratio.");
  const fallbacks = [
    "Set Saver Mode to maximize smart routing savings.",
    "Use Cost Preview to compare providers before running tasks.",
    "Add a monthly budget limit to prevent overruns.",
  ];
  for (const f of fallbacks) {
    if (tips.length >= 3) break;
    tips.push(f);
  }
  return tips.slice(0, 3);
}

function EfficiencyScoreCard({
  avgCost, savingsPct, topProvider, optimizedFraction,
}: {
  avgCost: number;
  savingsPct: number;
  topProvider: string;
  optimizedFraction: number;
}) {
  const score       = calcEfficiencyScore(avgCost, savingsPct, topProvider, optimizedFraction);
  const { stroke, text, badge, label } = scoreColor(score);
  const suggestions = scoreSuggestions(avgCost, savingsPct, topProvider, optimizedFraction);

  const r    = 38;
  const circ = 2 * Math.PI * r;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45, ease: [0.23, 1, 0.32, 1] }}
      className="glass-panel rounded-2xl p-5 relative overflow-hidden group stat-card-premium"
    >
      {/* Ambient orb */}
      <div
        className="absolute top-0 right-0 w-36 h-36 rounded-full blur-[50px] -translate-y-1/3 translate-x-1/3 group-hover:opacity-80 transition-opacity duration-500 pointer-events-none opacity-60"
        style={{ background: stroke + "28" }}
      />
      {/* Hover gradient sweep */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-350 pointer-events-none rounded-2xl" />

      <h3 className="text-sm font-medium text-muted-foreground mb-4 relative z-10">Efficiency Score</h3>

      {/* Ring + score */}
      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className="relative flex-shrink-0 w-[88px] h-[88px]">
          <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
            {/* Track */}
            <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
            {/* Filled arc */}
            <motion.circle
              cx="44" cy="44" r={r}
              fill="none"
              stroke={stroke}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={String(circ)}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ - (score / 100) * circ }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
            />
          </svg>
          {/* Score number overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-black font-mono leading-none ${text}`}>
              <AnimatedNumber value={score} decimals={0} />
            </span>
            <span className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wide mt-0.5">/ 100</span>
          </div>
        </div>

        <div className="min-w-0">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge}`}>{label}</span>
          <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
            Based on cost, savings rate &amp; provider mix
          </p>
        </div>
      </div>

      {/* Suggestions */}
      <div className="relative z-10">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
          Improve your score by…
        </p>
        <div className="space-y-1.5">
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: stroke }}
              />
              <p className="text-xs text-muted-foreground leading-snug">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

const categoryIcon = (cat: string) => {
  if (cat === "routing")     return <ArrowRightLeft className="w-4 h-4" />;
  if (cat === "caching")     return <Database className="w-4 h-4" />;
  if (cat === "compression") return <Scissors className="w-4 h-4" />;
  return <TrendingDown className="w-4 h-4" />;
};
const categoryColor = (cat: string) => {
  if (cat === "routing")     return "text-blue-400 bg-blue-400/10";
  if (cat === "caching")     return "text-emerald-400 bg-emerald-400/10";
  if (cat === "compression") return "text-violet-400 bg-violet-400/10";
  return "text-primary bg-primary/10";
};

// ─── Action Button ────────────────────────────────────────────────────────────
interface ActionBtnProps {
  icon: React.ReactNode;
  label: string;
  desc: string;
  loading: boolean;
  accent: string;           // tailwind text color e.g. "text-orange-400"
  border: string;           // tailwind border color e.g. "border-orange-400/30"
  bg: string;               // tailwind bg e.g. "bg-orange-400/8"
  iconBg: string;           // icon container bg
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
}
function ActionBtn({ icon, label, desc, loading, accent, border, bg, iconBg, onClick, disabled, badge }: ActionBtnProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={loading || disabled}
      whileTap={{ scale: 0.93 }}
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={`relative flex flex-col items-center gap-2 sm:gap-2.5 px-2 sm:px-4 py-4 rounded-2xl border ${border} ${bg} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-center overflow-hidden group w-full min-h-[88px] btn-pulse-active`}
    >
      {/* Shine on hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/4 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-250 pointer-events-none" />
      {/* Bottom rim glow on hover */}
      <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-250 pointer-events-none" style={{ color: "currentcolor" }} />

      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-110 ${accent}`}>
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : icon}
      </div>
      <div>
        <div className="flex items-center justify-center gap-1.5">
          <p className={`text-sm font-bold ${loading ? "text-muted-foreground" : accent}`}>{label}</p>
          {badge && !loading && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${iconBg} ${accent}`}>{badge}</span>
          )}
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-tight">{loading ? "Working…" : desc}</p>
      </div>
    </motion.button>
  );
}

// ─── Cost Preview Panel ───────────────────────────────────────────────────────
interface OptimizeResult {
  optimizedText:      string;
  actualCost:         number;
  actualInputTokens:  number;
  actualOutputTokens: number;
}

function CostPreviewPanel({ avgCost }: { avgCost: number }) {
  const [text, setText]             = useState("");
  const [debounced, setDebounced]   = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null);
  const [optimizeError, setOptimizeError]   = useState<string | null>(null);
  const [copied, setCopied]         = useState(false);

  // Debounce for live estimates
  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 300);
    return () => clearTimeout(t);
  }, [text]);

  // Clear optimization result when the user edits the prompt
  useEffect(() => {
    setOptimizeResult(null);
    setOptimizeError(null);
  }, [text]);

  const estimates = useMemo(() => estimatePromptCosts(debounced), [debounced]);
  const cheapest   = estimates?.[0];
  const priciest   = estimates?.[estimates.length - 1];
  const openAiEst  = estimates?.find(e => e.provider === "OpenAI");
  const aboveAvg   = avgCost > 0 && openAiEst != null && openAiEst.cost > avgCost;
  const hasSavings = cheapest && priciest && cheapest.provider !== priciest.provider;
  const savings    = hasSavings ? priciest!.cost - cheapest!.cost : 0;
  const savingsPct = hasSavings ? Math.round((savings / priciest!.cost) * 100) : 0;

  // Re-estimate costs for the optimized prompt to show token/cost delta
  const optimizedEstimates = useMemo(
    () => optimizeResult ? estimatePromptCosts(optimizeResult.optimizedText) : null,
    [optimizeResult],
  );
  const origTokens    = estimates?.[0]?.inputTokens ?? 0;
  const newTokens     = optimizedEstimates?.[0]?.inputTokens ?? 0;
  const origOpenAiCost = openAiEst?.cost ?? 0;
  const newOpenAiCost  = optimizedEstimates?.find(e => e.provider === "OpenAI")?.cost ?? 0;
  const costSaved      = Math.max(0, origOpenAiCost - newOpenAiCost);

  const handleOptimize = async () => {
    if (!text.trim() || optimizing) return;
    setOptimizing(true);
    setOptimizeError(null);
    setOptimizeResult(null);
    try {
      const res = await fetch("/api/proxy/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "gemini",
          model: "gemini-2.5-flash",
          messages: [{
            role: "user",
            content: `Shorten this prompt to use fewer tokens while keeping the same meaning. Return only the shortened prompt, nothing else: ${text}`,
          }],
          taskLabel: "Prompt optimization",
        }),
      });
      const data = await res.json() as {
        content?: string;
        usage?: { input_tokens: number; output_tokens: number };
        cost?: number;
        error?: string;
      };
      if (!res.ok || data.error) {
        setOptimizeError(data.error ?? "Optimization failed — check your API key");
      } else {
        setOptimizeResult({
          optimizedText:      data.content ?? "",
          actualCost:         data.cost ?? 0,
          actualInputTokens:  data.usage?.input_tokens ?? 0,
          actualOutputTokens: data.usage?.output_tokens ?? 0,
        });
      }
    } catch {
      setOptimizeError("Network error — could not reach the server");
    } finally {
      setOptimizing(false);
    }
  };

  const handleCopy = async () => {
    if (!optimizeResult?.optimizedText) return;
    await navigator.clipboard.writeText(optimizeResult.optimizedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}
      className="glass-panel rounded-2xl p-5 mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-primary" />
        <p className="text-sm font-bold text-foreground tracking-tight">Live Cost Preview</p>
        <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
          client-side · no API calls
        </span>
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type or paste a prompt to estimate cost across providers…"
        rows={3}
        className="w-full bg-secondary/40 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 resize-none transition-all duration-200"
      />

      {/* Optimize button — appears once there's text */}
      <AnimatePresence>
        {text.trim().length > 0 && (
          <motion.div key="opt-btn"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <motion.button
              onClick={handleOptimize}
              disabled={optimizing}
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-500/15 border border-violet-500/30 hover:bg-violet-500/22 text-sm font-bold text-violet-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {optimizing
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Optimizing…</>
                : <><Sparkles className="w-3.5 h-3.5" />Optimize Prompt</>
              }
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live cost estimates */}
      <AnimatePresence>
        {estimates ? (
          <motion.div key="results"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-2">
              {/* Token count */}
              <p className="text-[10px] text-muted-foreground/60 font-medium tracking-wide">
                ~{estimates[0].inputTokens} input tokens · ~{Math.round(estimates[0].inputTokens * 0.5)} estimated output tokens
              </p>

              {/* Provider rows — sorted cheapest first */}
              {estimates.map((e, i) => {
                const isCheapest = i === 0;
                return (
                  <div key={e.provider}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-colors ${
                      isCheapest ? "bg-emerald-400/8 border-emerald-400/25" : "bg-secondary/30 border-border/30"
                    }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PROVIDER_COLOR[e.provider] ?? "text-muted-foreground bg-secondary"}`}>
                        {e.provider}
                      </span>
                      <span className="text-xs text-muted-foreground">{e.model}</span>
                      {isCheapest && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full">
                          cheapest
                        </span>
                      )}
                    </div>
                    <span className={`text-sm font-bold font-mono tabular-nums ${isCheapest ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {fmtCost(e.cost)}
                    </span>
                  </div>
                );
              })}

              {/* Cheaper-alternative suggestion */}
              {hasSavings && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-400/6 border border-amber-400/20">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground leading-snug">
                    This prompt may cost{" "}
                    <span className="font-bold font-mono text-foreground">{fmtCost(priciest!.cost)}</span>
                    {" "}on <span className="font-semibold">{priciest!.provider}</span>
                    {" "}— switching to{" "}
                    <span className="font-semibold text-emerald-400">{cheapest!.model}</span>
                    {" "}saves{" "}
                    <span className="font-bold text-emerald-400 font-mono">~{fmtCost(savings)}</span>
                    {" "}<span className="text-emerald-400/80">({savingsPct}% cheaper)</span>
                  </p>
                </motion.div>
              )}

              {/* Above-average cost warning */}
              {aboveAvg && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 p-3.5 rounded-xl bg-orange-400/6 border border-orange-400/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground leading-snug">
                    This prompt is above your average request cost of{" "}
                    <span className="font-bold font-mono text-orange-400">{fmtCost(avgCost)}</span>
                    {" "}— consider simplifying or routing to a lighter model.
                  </p>
                </motion.div>
              )}

              {/* ── Optimization result / error ── */}
              <AnimatePresence>
                {optimizeError && (
                  <motion.div key="opt-error"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/8 border border-red-500/20">
                    <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400 leading-snug">{optimizeError}</p>
                  </motion.div>
                )}

                {optimizeResult && (
                  <motion.div key="opt-result"
                    initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    className="rounded-xl border border-violet-500/25 bg-violet-500/8 overflow-hidden"
                  >
                    {/* Result header with token comparison */}
                    <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5 border-b border-violet-500/15">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                        <p className="text-xs font-bold text-violet-300">Optimized Prompt</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-mono">
                        <span className="line-through text-muted-foreground/50">{origTokens}t</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
                        <span className="text-emerald-400 font-bold">{newTokens}t</span>
                        {origTokens > newTokens && (
                          <span className="text-emerald-400/80 ml-0.5">(-{origTokens - newTokens}t)</span>
                        )}
                      </div>
                    </div>

                    {/* The optimized text */}
                    <p className="px-3.5 py-3 text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {optimizeResult.optimizedText}
                    </p>

                    {/* Footer: savings + copy button */}
                    <div className="flex items-center justify-between px-3.5 pb-3 pt-2 border-t border-violet-500/15 gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground/70 mb-0.5">Saves on OpenAI</p>
                          <p className="text-sm font-bold font-mono text-emerald-400">
                            {costSaved > 0 ? `~${fmtCost(costSaved)}` : "—"}
                          </p>
                        </div>
                        <div className="w-px h-8 bg-border/30" />
                        <div>
                          <p className="text-[10px] text-muted-foreground/70 mb-0.5">Haiku call cost</p>
                          <p className="text-xs font-mono text-muted-foreground">{fmtCost(optimizeResult.actualCost)}</p>
                        </div>
                      </div>
                      <motion.button
                        onClick={handleCopy}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 hover:bg-violet-500/30 text-xs font-bold transition-colors flex-shrink-0"
                      >
                        {copied
                          ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                          : <><Copy className="w-3.5 h-3.5 text-violet-300" /><span className="text-violet-300">Use this prompt</span></>
                        }
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-[11px] text-muted-foreground/40 mt-3 text-center">
            Start typing to see live cost estimates across providers
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Hero Cost Estimator (horizontal pill layout) ────────────────────────────
function HeroCostEstimator({ avgCost }: { avgCost: number }) {
  const [text, setText]                     = useState("");
  const [debounced, setDebounced]           = useState("");
  const [optimizing, setOptimizing]         = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null);
  const [optimizeError, setOptimizeError]   = useState<string | null>(null);
  const [copied, setCopied]                 = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 300);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => { setOptimizeResult(null); setOptimizeError(null); }, [text]);

  const estimates    = useMemo(() => estimatePromptCosts(debounced), [debounced]);
  const cheapest     = estimates?.[0];
  const priciest     = estimates?.[estimates.length - 1];
  const hasSavings   = cheapest && priciest && cheapest.provider !== priciest.provider;
  const savings      = hasSavings ? priciest!.cost - cheapest!.cost : 0;

  const optEstimates  = useMemo(() => optimizeResult ? estimatePromptCosts(optimizeResult.optimizedText) : null, [optimizeResult]);
  const origTokens    = estimates?.[0]?.inputTokens ?? 0;
  const newTokens     = optEstimates?.[0]?.inputTokens ?? 0;
  const origOpenAi    = estimates?.find(e => e.provider === "OpenAI")?.cost ?? 0;
  const newOpenAi     = optEstimates?.find(e => e.provider === "OpenAI")?.cost ?? 0;
  const costSaved     = Math.max(0, origOpenAi - newOpenAi);

  const handleOptimize = async () => {
    if (!text.trim() || optimizing) return;
    setOptimizing(true); setOptimizeError(null); setOptimizeResult(null);
    try {
      const res = await fetch("/api/proxy/chat", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "gemini", model: "gemini-2.5-flash",
          messages: [{ role: "user", content: `Shorten this prompt to use fewer tokens while keeping the same meaning. Return only the shortened prompt, nothing else: ${text}` }],
          taskLabel: "Prompt optimization",
        }),
      });
      const data = await res.json() as { content?: string; usage?: { input_tokens: number; output_tokens: number }; cost?: number; error?: string };
      if (!res.ok || data.error) setOptimizeError(data.error ?? "Optimization failed");
      else setOptimizeResult({ optimizedText: data.content ?? "", actualCost: data.cost ?? 0, actualInputTokens: data.usage?.input_tokens ?? 0, actualOutputTokens: data.usage?.output_tokens ?? 0 });
    } catch { setOptimizeError("Network error — could not reach the server"); }
    finally { setOptimizing(false); }
  };

  const handleCopy = async () => {
    if (!optimizeResult?.optimizedText) return;
    await navigator.clipboard.writeText(optimizeResult.optimizedText);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-white/50" />
        <p className="text-sm font-semibold text-white/70">Estimate prompt cost</p>
        <span className="ml-auto text-[10px] font-bold text-white/30 bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-full">
          client-side · no API calls
        </span>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type or paste a prompt to compare costs across providers…"
        rows={3}
        className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 resize-none transition-all duration-200"
      />

      {/* Horizontal provider pills */}
      <AnimatePresence>
        {estimates && (
          <motion.div key="pills"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
            className="flex gap-2 mt-3 flex-wrap items-center">
            {estimates.map((e, i) => {
              const isCheapest = i === 0;
              const provColor = PROVIDER_COLOR[e.provider]?.split(" ")[0] ?? "text-white/80";
              return (
                <div key={e.provider}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                    isCheapest ? "bg-emerald-400/15 border-emerald-400/40 text-emerald-300" : "bg-white/[0.06] border-white/[0.10] text-white/60"
                  }`}>
                  <span className={`font-bold ${provColor}`}>{e.provider}</span>
                  <span className="font-mono">{fmtCost(e.cost)}</span>
                  {isCheapest && <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wide">cheapest</span>}
                </div>
              );
            })}
            {hasSavings && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 text-xs text-amber-300 font-semibold">
                <Lightbulb className="w-3 h-3" />
                Save {fmtCost(savings)} vs {priciest!.provider}
              </div>
            )}
            <span className="text-[10px] text-white/30 pl-1">~{estimates[0].inputTokens} tokens</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optimize button */}
      <AnimatePresence>
        {text.trim().length > 0 && (
          <motion.div key="opt-btn"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
            className="overflow-hidden mt-3">
            <motion.button onClick={handleOptimize} disabled={optimizing}
              whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-500/20 border border-violet-500/35 hover:bg-violet-500/28 text-sm font-bold text-violet-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {optimizing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Optimizing…</> : <><Sparkles className="w-3.5 h-3.5" />Optimize Prompt</>}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {optimizeError && (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/25">
            <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{optimizeError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optimized result */}
      <AnimatePresence>
        {optimizeResult && (
          <motion.div key="result"
            initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="mt-3 rounded-xl border border-violet-500/25 bg-violet-500/8 overflow-hidden">
            <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5 border-b border-violet-500/15">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <p className="text-xs font-bold text-violet-300">Optimized Prompt</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <span className="line-through text-white/30">{origTokens}t</span>
                <ChevronRight className="w-3 h-3 text-white/20" />
                <span className="text-emerald-400 font-bold">{newTokens}t</span>
              </div>
            </div>
            <p className="px-3.5 py-3 text-xs text-white/80 leading-relaxed whitespace-pre-wrap">{optimizeResult.optimizedText}</p>
            <div className="flex items-center justify-between px-3.5 pb-3 pt-2 border-t border-violet-500/15 gap-3 flex-wrap">
              <div>
                <p className="text-[10px] text-white/40 mb-0.5">Saves on OpenAI</p>
                <p className="text-sm font-bold font-mono text-emerald-400">{costSaved > 0 ? `~${fmtCost(costSaved)}` : "—"}</p>
              </div>
              <motion.button onClick={handleCopy} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 hover:bg-violet-500/30 text-xs font-bold transition-colors">
                {copied
                  ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                  : <><Copy className="w-3.5 h-3.5 text-violet-300" /><span className="text-violet-300">Use this prompt</span></>
                }
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Intelligence Feed ────────────────────────────────────────────────────────

type InsightLevel = "info" | "warning" | "savings";

interface Insight {
  id: string;
  level: InsightLevel;
  icon: React.ElementType;
  text: string;
  generatedAt: number;
}

const INSIGHT_STYLES: Record<InsightLevel, { border: string; bg: string; iconCls: string; badge: string }> = {
  info:    { border: "border-blue-500/20",   bg: "bg-blue-500/5",   iconCls: "text-blue-400 bg-blue-400/12",   badge: "bg-blue-500/15 text-blue-400"    },
  warning: { border: "border-yellow-500/20", bg: "bg-yellow-500/5", iconCls: "text-yellow-400 bg-yellow-400/12", badge: "bg-yellow-500/15 text-yellow-400" },
  savings: { border: "border-success/20",    bg: "bg-success/5",    iconCls: "text-success bg-success/12",     badge: "bg-success/15 text-success"       },
};

const INDUSTRY_AVG_COST = 0.03;
const EXPENSIVE_PROVIDERS = new Set(["OpenAI", "Anthropic"]);

function buildInsights(
  transactions: WalletTx[],
  dataAvgCost: number,
  totalSaved: number,
  now: number,
): Insight[] {
  const usageTxs = transactions.filter(t => t.type === "usage");
  const optTxs   = transactions.filter(t => t.type === "optimization");

  // Derived stats
  const sessionAvgCost = usageTxs.length > 0
    ? usageTxs.reduce((s, t) => s + Math.abs(t.amount), 0) / usageTxs.length
    : dataAvgCost;

  const expensiveSmallCount = usageTxs.filter(
    t => EXPENSIVE_PROVIDERS.has(t.provider) && Math.abs(t.amount) < 0.025,
  ).length;
  const expPct = usageTxs.length > 0
    ? Math.round((expensiveSmallCount / usageTxs.length) * 100)
    : 0;

  const providerTotals: Record<string, number> = {};
  usageTxs.forEach(t => {
    if (t.provider && t.provider !== "AI Wallet" && t.provider !== "Wallet") {
      providerTotals[t.provider] = (providerTotals[t.provider] ?? 0) + Math.abs(t.amount);
    }
  });
  const topProvider = Object.entries(providerTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Monthly projection: session average × estimated 40 calls/day × 30 days
  const DAILY_CALL_EST = 40;
  const monthlyEst = sessionAvgCost * DAILY_CALL_EST * 30;

  const list: Insight[] = [];

  // 1. Expensive model for simple tasks
  list.push({
    id: "expensive-simple",
    level: expPct > 50 ? "warning" : expPct > 20 ? "info" : "savings",
    icon: BrainCircuit,
    text: usageTxs.length < 2
      ? `Not enough session data yet — run more tasks for model efficiency analysis.`
      : expPct > 50
      ? `You use expensive models (OpenAI/Anthropic) for ${expPct}% of low-cost tasks. Lighter models could handle these for less.`
      : expPct > 0
      ? `${expPct}% of your small tasks use premium models — a light model would cost ~60% less.`
      : `All your tasks this session matched cost-appropriate model tiers. Efficient!`,
    generatedAt: now,
  });

  // 2. Avg cost vs industry benchmark
  list.push({
    id: "avg-cost",
    level: sessionAvgCost > INDUSTRY_AVG_COST * 1.5 ? "warning"
         : sessionAvgCost > INDUSTRY_AVG_COST        ? "info"
         :                                              "savings",
    icon: sessionAvgCost > INDUSTRY_AVG_COST ? TrendingDown : CheckCircle2,
    text: sessionAvgCost > INDUSTRY_AVG_COST
      ? `Your average prompt costs $${sessionAvgCost.toFixed(3)} — the industry average is $${INDUSTRY_AVG_COST.toFixed(2)}. Consider lighter models for routine tasks.`
      : `Your average prompt costs $${sessionAvgCost.toFixed(3)} — below the $${INDUSTRY_AVG_COST.toFixed(2)} industry average. You're spending efficiently.`,
    generatedAt: now - 800,
  });

  // 3. Optimization activity
  list.push({
    id: "opt-count",
    level: optTxs.length > 0 ? "savings" : "info",
    icon: Zap,
    text: optTxs.length > 0
      ? `You've made ${optTxs.length} optimization move${optTxs.length > 1 ? "s" : ""} this session, saving $${totalSaved.toFixed(2)} in total.`
      : `No optimization moves yet this session. Click "Optimize Spend" to find savings.`,
    generatedAt: now - 1600,
  });

  // 4. Top spending provider
  list.push({
    id: "top-provider",
    level: topProvider === "OpenAI" || topProvider === "Anthropic" ? "warning" : "info",
    icon: ArrowUpRight,
    text: topProvider
      ? `Top spending provider this session: ${topProvider}. ${
          topProvider === "Gemini"
            ? "Gemini is among the most cost-efficient choices — well optimized."
            : topProvider === "OpenAI"
            ? "Routing ~30% of GPT-4o calls to Gemini Flash could cut costs significantly."
            : "Claude excels at complex tasks — reserve it for those to control spend."
        }`
      : `No provider data yet — run some tasks to see spend distribution.`,
    generatedAt: now - 2400,
  });

  // 5. Monthly projection
  list.push({
    id: "monthly-est",
    level: monthlyEst > 150 ? "warning" : monthlyEst > 60 ? "info" : "savings",
    icon: Calendar,
    text: `Estimated monthly cost at current rate: $${monthlyEst.toFixed(2)}${
      monthlyEst > 150 ? " — Saver Mode could reduce this by up to 50%." :
      monthlyEst > 60  ? " — enabling Smart Routing could trim this further." :
      " — you're on track for a low-spend month."
    }`,
    generatedAt: now - 3200,
  });

  return list;
}

function IntelligenceFeed({
  transactions, avgCost, totalSaved,
}: {
  transactions: WalletTx[];
  avgCost: number;
  totalSaved: number;
}) {
  const [refreshTs, setRefreshTs] = useState(() => Date.now());
  const [, setTickCount]          = useState(0);
  const prevLenRef                = useRef(transactions.length);

  // 60-second auto-refresh
  useEffect(() => {
    const t = setInterval(() => setRefreshTs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Refresh immediately when new transactions arrive
  useEffect(() => {
    if (transactions.length !== prevLenRef.current) {
      prevLenRef.current = transactions.length;
      setRefreshTs(Date.now());
    }
  }, [transactions.length]);

  // Tick every 15 s so "X ago" labels stay fresh
  useEffect(() => {
    const t = setInterval(() => setTickCount(v => v + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  const insightList = useMemo(
    () => buildInsights(transactions, avgCost, totalSaved, refreshTs),
    [transactions, avgCost, totalSaved, refreshTs],
  );

  function fmtAge(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 5)  return "just now";
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  }

  const secondsSince = Math.floor((Date.now() - refreshTs) / 1000);
  const nextRefreshIn = Math.max(0, 60 - secondsSince);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.52 }}
      className="glass-panel rounded-2xl p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display font-bold text-foreground">Intelligence Feed</h2>
          <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
            {insightList.length} insights
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
          {nextRefreshIn > 0 ? `refreshes in ${nextRefreshIn}s` : "refreshing…"} · {transactions.length} tx analyzed
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-2.5">
        <AnimatePresence mode="sync" initial={false}>
          {insightList.map((insight, i) => {
            const s    = INSIGHT_STYLES[insight.level];
            const Icon = insight.icon;
            return (
              <motion.div
                key={`${insight.id}-${refreshTs}`}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 14 }}
                transition={{ delay: i * 0.055, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className={`flex items-start gap-3.5 p-4 rounded-xl border transition-colors duration-300 ${s.border} ${s.bg}`}
              >
                <div className={`p-2.5 rounded-xl flex-shrink-0 mt-0.5 ${s.iconCls}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed">{insight.text}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                    {fmtAge(insight.generatedAt)}
                  </p>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${s.badge}`}>
                  {insight.level === "savings" ? "savings" : insight.level}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Agent Chat Widget ────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
  isAction?: boolean;
}

interface AgentChatProps {
  wallet: WalletState | null;
  data: UsageData;
  onOptimize: () => Promise<void>;
  onModeSwitch: (mode: SpendMode) => Promise<void>;
}

const QUICK_PROMPTS = [
  "How much am I spending?",
  "How can I reduce costs?",
  "Switch to Saver mode",
  "Run an optimization",
];

function buildSystemPrompt(wallet: WalletState | null, data: UsageData): string {
  if (!wallet) {
    return `You are an AI spending assistant for AI Wallet. The user's wallet data is still loading.
For every message, respond with exactly: "I can see your wallet is loading — try again in a moment."
Do not answer any other questions until wallet data is available.`;
  }

  const recentUsageTxns = wallet.transactions
    .filter(t => t.type === "usage")
    .slice(0, 5)
    .map(t => ({ label: t.label, amount: Math.abs(t.amount).toFixed(4), provider: t.provider }));

  const recentOptimizations = wallet.transactions
    .filter(t => t.type === "optimization")
    .slice(0, 3)
    .map(t => ({ label: t.label, saved: Math.abs(t.amount).toFixed(4) }));

  const walletState = {
    balance:           wallet.balance.toFixed(4),
    totalSaved:        wallet.totalSaved.toFixed(4),
    spendMode:         wallet.spendMode,
    recentSpend:       wallet.transactions.filter(t => t.type === "usage").reduce((s, t) => s + Math.abs(t.amount), 0).toFixed(4),
    optimizationCount: wallet.transactions.filter(t => t.type === "optimization").length,
    recentUsage:       recentUsageTxns,
    recentSavings:     recentOptimizations,
  };

  const usageState = {
    totalRequests:  data.totalRequests,
    avgCostPerCall: `$${data.avgCost.toFixed(4)}`,
    savingsPercent: `${data.savingsPercent}%`,
    totalSpend:     `$${data.totalSpend.toFixed(4)}`,
    autopilotSaved: `$${data.autopilotSaved.toFixed(4)}`,
    topTool:        data.topTool,
  };

  return `You are an AI API spending assistant embedded in AI Wallet. You have ONE job: help the user understand and reduce their AI API costs.

STRICT RULES:
1. ONLY answer questions about AI API costs, wallet balance, spending patterns, model selection, and cost optimization.
2. If the user asks ANYTHING unrelated to AI spending (weather, coding help, general advice, etc.), respond with EXACTLY: "I'm your AI spending assistant — I can only help with your API costs and wallet. Try asking: how much am I spending? or what's my efficiency score?"
3. Keep every response to 2-3 sentences max. No lists, no preamble.
4. Always reference the real numbers below when answering.

USER'S LIVE WALLET DATA:
${JSON.stringify(walletState, null, 2)}

USER'S LIVE USAGE STATS:
${JSON.stringify(usageState, null, 2)}

ACTIONS (only emit when user directly requests the action):
- To run optimization: prepend {"action":"optimize"} then one sentence confirming.
- To switch mode: prepend {"action":"mode","value":"saver"|"balanced"|"performance"} then one sentence confirming.
Never emit an action block unless the user explicitly asks to optimize or switch modes.`;
}

function parseAction(raw: string): { action: string; value?: string } | null {
  const m = raw.match(/\{"action"\s*:\s*"([^"]+)"(?:\s*,\s*"value"\s*:\s*"([^"]+)")?\}/);
  return m ? { action: m[1], value: m[2] } : null;
}

function stripAction(raw: string): string {
  return raw.replace(/\{"action"\s*:\s*"[^"]*"(?:\s*,\s*"value"\s*:\s*"[^"]*")?\}\s*/g, "").trim();
}

function AgentChat({ wallet, data, onOptimize, onModeSwitch }: AgentChatProps) {
  const [isOpen,   setIsOpen]   = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState("");
  const [typing,   setTyping]   = useState(false);
  const [unread,   setUnread]   = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Auto-scroll on new message / typing change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Focus input + clear unread when opened
  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  const addMsg = useCallback((msg: Omit<ChatMessage, "id" | "ts">) => {
    setMessages(prev => [
      ...prev.slice(-9),
      { ...msg, id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ts: Date.now() },
    ]);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    setInput("");
    addMsg({ role: "user", content: trimmed });
    setTyping(true);

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/proxy/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          provider: "gemini",
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: buildSystemPrompt(wallet, data) },
            ...history,
            { role: "user", content: trimmed },
          ],
        }),
      });

      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json() as { content?: string; error?: string };
      if (json.error) throw new Error(json.error);

      const raw         = json.content ?? "I couldn't generate a response right now.";
      const action      = parseAction(raw);
      const displayText = action ? stripAction(raw) : raw;

      if (action) {
        if (action.action === "optimize") {
          onOptimize().catch(() => {});
        } else if (action.action === "mode" && action.value) {
          onModeSwitch(action.value as SpendMode).catch(() => {});
        }
      }

      addMsg({ role: "assistant", content: displayText, isAction: !!action });
      if (!isOpen) setUnread(v => v + 1);

    } catch (err) {
      const msg = err instanceof Error && err.message.includes("configured")
        ? "Provider not configured — add your ANTHROPIC_API_KEY in settings."
        : "Couldn't reach the API right now. Please try again.";
      addMsg({ role: "assistant", content: msg });
    } finally {
      setTyping(false);
    }
  }, [typing, messages, wallet, data, addMsg, onOptimize, onModeSwitch, isOpen]);

  return (
    <>
      {/* ── FAB ── */}
      <motion.button
        onClick={() => setIsOpen(v => !v)}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, type: "spring", stiffness: 260, damping: 18 }}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{
          background:  "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          boxShadow:   "0 8px 28px rgba(99,102,241,0.50), 0 2px 6px rgba(0,0,0,0.4)",
        }}
        aria-label="Open AI spending assistant"
      >
        {/* Outer pulse ring when closed */}
        {!isOpen && (
          <motion.div
            className="absolute inset-0 rounded-2xl bg-primary/40"
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <AnimatePresence mode="wait">
          {isOpen
            ? <motion.span key="x"   initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90,  opacity: 0 }} transition={{ duration: 0.18 }}><X   className="w-5 h-5 text-white" /></motion.span>
            : <motion.span key="bot" initial={{ rotate: 90,  opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}><Bot className="w-5 h-5 text-white" /></motion.span>
          }
        </AnimatePresence>
        {unread > 0 && !isOpen && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-lg"
          >
            {unread}
          </motion.span>
        )}
      </motion.button>

      {/* ── Chat drawer ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="fixed bottom-[152px] right-6 z-50 flex flex-col rounded-2xl overflow-hidden"
            style={{
              width:           "360px",
              height:          "480px",
              background:      "rgba(7,7,18,0.97)",
              backdropFilter:  "blur(28px) saturate(160%)",
              boxShadow:       "0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(99,102,241,0.22) inset, 0 0 0 1px rgba(255,255,255,0.04) inset",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style={{
                background:  "linear-gradient(90deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 100%)",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              >
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-none">AI Spending Agent</p>
                <p className="text-[10px] text-white/35 mt-0.5">Powered by Claude Haiku · has wallet context</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-50" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                <span className="text-[10px] text-success/70 font-medium">online</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                  >
                    <BrainCircuit className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/80">How can I help you?</p>
                    <p className="text-xs text-white/35 mt-1 leading-snug">
                      I have access to your wallet balance,<br />transactions, and usage patterns.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {QUICK_PROMPTS.map(p => (
                      <button
                        key={p}
                        onClick={() => sendMessage(p)}
                        className="text-xs px-3 py-1.5 rounded-xl border text-white/60 hover:text-white hover:bg-primary/20 hover:border-primary/40 transition-all duration-150"
                        style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {/* Bot avatar */}
                      {msg.role === "assistant" && (
                        <div
                          className="w-6 h-6 rounded-lg flex-shrink-0 mb-0.5 flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                        >
                          <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}

                      <div
                        className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"
                        }`}
                        style={msg.role === "user"
                          ? { background: "rgba(99,102,241,0.28)", border: "1px solid rgba(99,102,241,0.35)", color: "rgba(255,255,255,0.90)" }
                          : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.82)" }
                        }
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.isAction && (
                          <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: "rgba(99,102,241,0.8)" }}>
                            <Zap className="w-2.5 h-2.5" />
                            Action executed
                          </p>
                        )}
                        <p className="text-[9px] mt-1 opacity-30">
                          {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  <AnimatePresence>
                    {typing && (
                      <motion.div
                        key="typing"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-end gap-2"
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex-shrink-0 mb-0.5 flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                        >
                          <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div
                          className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                        >
                          {[0, 1, 2].map(i => (
                            <motion.span
                              key={i}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: "rgba(255,255,255,0.45)" }}
                              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick-reply chips (after first message) */}
            {messages.length > 0 && !typing && (
              <div
                className="px-3 py-1.5 flex gap-1.5 overflow-x-auto flex-shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                {QUICK_PROMPTS.slice(0, 3).map(p => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="text-[10px] whitespace-nowrap px-2.5 py-1 rounded-lg flex-shrink-0 text-white/45 hover:text-white/80 hover:bg-primary/20 transition-all duration-150"
                    style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div
              className="px-3 pb-3 pt-2 flex-shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                  }}
                  placeholder="Ask about your AI spend…"
                  disabled={typing}
                  className="flex-1 bg-transparent text-sm outline-none disabled:opacity-40"
                  style={{ color: "rgba(255,255,255,0.80)" }}
                />
                <motion.button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || typing}
                  whileTap={{ scale: 0.85 }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-25 transition-opacity"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Browser Extension Widget ────────────────────────────────────────────────

interface ExtDetection {
  provider: string;
  model: string;
  cost: number;
  ts: number;
}

const EXT_MODELS: Record<string, string> = {
  OpenAI:    "GPT-4o",
  Anthropic: "Claude 3.5 Sonnet",
  Gemini:    "Gemini 1.5 Pro",
};

const EXT_PROVIDER_COLOR: Record<string, string> = {
  OpenAI:    "text-blue-400",
  Anthropic: "text-orange-400",
  Gemini:    "text-green-400",
};

function ExtensionWidget() {
  const [minimized,     setMinimized]     = useState(false);
  const [sessionCost,   setSessionCost]   = useState(0);
  const [lastDetection, setLastDetection] = useState<ExtDetection | null>(null);
  const [flash,         setFlash]         = useState(false);
  const [tabCount]                        = useState(() => Math.floor(Math.random() * 4) + 2); // 2-5 tabs

  // Simulate detecting a new AI call every 30 s
  useEffect(() => {
    const detect = () => {
      const provider = USAGE_PROVIDERS[Math.floor(Math.random() * USAGE_PROVIDERS.length)];
      const cost     = +(Math.random() * (0.08 - 0.01) + 0.01).toFixed(4);
      const model    = EXT_MODELS[provider] ?? "GPT-4o";
      setLastDetection({ provider, model, cost, ts: Date.now() });
      setSessionCost(prev => +(prev + cost).toFixed(4));
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    };

    // Fire once after a short delay so something shows immediately
    const init = setTimeout(detect, 2500);
    const tick = setInterval(detect, 30_000);
    return () => { clearTimeout(init); clearInterval(tick); };
  }, []);

  const elapsed = lastDetection
    ? Math.floor((Date.now() - lastDetection.ts) / 1000)
    : null;

  // Re-render the elapsed label every 5 s
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 5000);
    return () => clearInterval(t);
  }, []);

  function fmtElapsed(sec: number) {
    if (sec < 5)  return "just now";
    if (sec < 60) return `${sec}s ago`;
    return `${Math.floor(sec / 60)}m ago`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.2, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="fixed bottom-6 right-6 z-40 select-none"
      style={{ width: minimized ? "auto" : "260px" }}
    >
      {/* Flash ring on new detection */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0.5, scale: 0.95 }}
            animate={{ opacity: 0, scale: 1.08 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 rounded-2xl border-2 border-primary/60 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div
        className="rounded-2xl border border-white/[0.09] overflow-hidden"
        style={{
          background:    "rgba(8,8,20,0.92)",
          backdropFilter:"blur(24px) saturate(160%)",
          boxShadow:     "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
        }}
      >
        {/* ── Title bar ── */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-white/90 tracking-wide">AI Wallet</span>
            <span className="text-[9px] text-white/35 font-medium">ext</span>
          </div>
          <button
            onClick={() => setMinimized(v => !v)}
            className="p-1 rounded-md text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-colors"
          >
            {minimized
              ? <Maximize2 className="w-3 h-3" />
              : <Minimize2 className="w-3 h-3" />
            }
          </button>
        </div>

        {/* ── Body (hidden when minimized) ── */}
        <AnimatePresence initial={false}>
          {!minimized && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-3.5 py-3 space-y-3">

                {/* Status row */}
                <div className="flex items-center gap-2">
                  {/* Pulsing green dot */}
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                  </span>
                  <span className="text-[11px] text-white/70">
                    Tracking AI usage across{" "}
                    <span className="text-white/90 font-semibold">{tabCount} tabs</span>
                  </span>
                </div>

                {/* Session cost */}
                <div className="flex items-center justify-between bg-white/[0.04] rounded-xl px-3 py-2.5 border border-white/[0.06]">
                  <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider">
                    Session cost
                  </span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={sessionCost}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-black font-mono text-white tabular-nums"
                    >
                      ${sessionCost.toFixed(4)}
                    </motion.span>
                  </AnimatePresence>
                </div>

                {/* Last detected call */}
                <div>
                  <p className="text-[9px] font-bold text-white/35 uppercase tracking-wider mb-1.5">
                    Last detected call
                  </p>
                  {lastDetection ? (
                    <motion.div
                      key={lastDetection.ts}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className={`text-[11px] font-semibold ${EXT_PROVIDER_COLOR[lastDetection.provider] ?? "text-white/80"}`}>
                          {lastDetection.model}
                        </span>
                        <span className="text-[10px] text-white/35 ml-1.5">
                          {elapsed !== null ? fmtElapsed(Math.floor((Date.now() - lastDetection.ts) / 1000)) : ""}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold font-mono text-white/80 flex-shrink-0">
                        ${lastDetection.cost.toFixed(4)}
                      </span>
                    </motion.div>
                  ) : (
                    <p className="text-[11px] text-white/30 italic">Waiting for detection…</p>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="px-3.5 pb-3 pt-0.5 flex items-center justify-between">
                <span className="text-[9px] text-white/25">AI Wallet Extension v1.0</span>
                <span className="text-[9px] font-medium text-primary/70">● live</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Pre-Flight Modal ─────────────────────────────────────────────────────────
interface PreFlightModalProps {
  provider: string;
  cheaper: string;
  company: string;
  tier: number;
  estimatedCost: number;
  onContinue: () => void;
  onOptimize: () => void;
  onClose: () => void;
}
function PreFlightModal({ provider, cheaper, company, tier, estimatedCost, onContinue, onOptimize, onClose }: PreFlightModalProps) {
  const baseCost = estimatedCost / tier;
  const isGemini = company === "Gemini";

  // Three-provider cost comparison (sorted cheapest first)
  const comparison = [
    { name: "Gemini",    cost: +(baseCost * 0.70).toFixed(3) },
    { name: "OpenAI",    cost: +(baseCost * 1.00).toFixed(3) },
    { name: "Anthropic", cost: +(baseCost * 1.40).toFixed(3) },
  ].sort((a, b) => a.cost - b.cost);

  const lo = (estimatedCost * 0.85).toFixed(3);
  const hi = (estimatedCost * 1.20).toFixed(3);

  const optimizedCost = isGemini
    ? +(estimatedCost * 0.60).toFixed(3)    // already Gemini → model downgrade
    : +(baseCost * 0.70).toFixed(3);        // switch to Gemini
  const savedAmt = (estimatedCost - optimizedCost).toFixed(2);
  const savePct  = Math.round((1 - optimizedCost / estimatedCost) * 100);
  const optTarget = isGemini ? cheaper : "Gemini 1.5 Flash";
  const optBtnLabel = isGemini ? "Optimize & Continue" : "Switch to Gemini";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-400/15 text-orange-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Pre-Flight Cost Check</p>
              <p className="text-xs text-muted-foreground">Review before running</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Provider + cost range */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/40 border border-border/40">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Provider</p>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PROVIDER_COLOR[company] ?? ""}`}>{company}</span>
                <p className="text-sm font-bold text-foreground">{provider.replace(/^[^\s]+ /, "")}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Est. Cost</p>
              <p className="text-sm font-bold font-mono text-foreground">${lo} – ${hi}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{TIER_LABEL[company] ?? ""} tier</p>
            </div>
          </div>

          {/* Provider cost comparison */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cost Comparison</p>
            <div className="space-y-1.5">
              {comparison.map((p, i) => {
                const isCurrent  = p.name === company;
                const isCheapest = i === 0;
                return (
                  <div key={p.name}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${isCurrent ? "bg-primary/8 border border-primary/25" : "bg-secondary/30"}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PROVIDER_COLOR[p.name]}`}>{p.name}</span>
                      {isCurrent  && <span className="text-[10px] text-primary font-medium">current</span>}
                      {isCheapest && !isCurrent && <span className="text-[10px] text-emerald-400 font-medium">cheapest</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-foreground">${p.cost}</span>
                      <span className="text-[10px] text-muted-foreground w-12 text-right">{TIER_LABEL[p.name]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Optimization suggestion */}
          <div className="p-3.5 rounded-xl border border-amber-400/30 bg-amber-400/6">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-400/15 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-400 mb-1">
                  {isGemini ? "Optimization Available" : "Cheaper Provider Available"}
                </p>
                <p className="text-sm text-foreground leading-snug">
                  {isGemini
                    ? <>Switch to <span className="font-semibold text-emerald-400">{optTarget}</span> and save ~{savePct}%</>
                    : <>Route to <span className="font-semibold text-emerald-400">Gemini 1.5 Flash</span> and save ~{savePct}%</>
                  }
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground line-through font-mono">${estimatedCost.toFixed(3)}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-bold text-emerald-400 font-mono">${optimizedCost.toFixed(3)}</span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">-${savedAmt}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 px-5 pb-5">
          <button
            onClick={onContinue}
            className="flex-1 py-2.5 rounded-xl border border-border/50 bg-secondary/40 hover:bg-secondary/70 text-sm font-semibold text-foreground transition-colors"
          >
            Continue
          </button>
          <motion.button
            onClick={onOptimize}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-sm font-bold text-emerald-400 transition-colors flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {optBtnLabel}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Outer shell (loads usage data) ──────────────────────────────────────────
export default function Home() {
  const { data, isLoading } = useUsageData();
  if (isLoading || !data) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      </Shell>
    );
  }
  return <HomeInner data={data} />;
}

// ─── Inner (data + wallet state) ─────────────────────────────────────────────
function HomeInner({ data }: { data: UsageData }) {
  const { user, isDemo, logout } = useAuthContext();

  // ── Wallet state ────────────────────────────────────────────────────────
  const [wallet, setWallet]           = useState<WalletState | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);

  // ── Action loading states ───────────────────────────────────────────────
  const [isRunningTask, setIsRunningTask]   = useState(false);
  const [isAddingFunds, setIsAddingFunds]   = useState(false);
  const [isOptimizing, setIsOptimizing]     = useState(false);

  // ── Pre-flight modal ─────────────────────────────────────────────────────
  const [preFlight, setPreFlight] = useState<{ provider: string; cheaper: string; company: string; tier: number; estimatedCost: number } | null>(null);

  // ── Savings tip ─────────────────────────────────────────────────────────
  const [savingsTip, setSavingsTip]         = useState<string | null>(null);
  const tipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── New tx highlighting (ids expire after 3 s) ──────────────────────────
  const [newTxIds, setNewTxIds]             = useState<Set<string>>(new Set());
  const highlightTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Balance flash ───────────────────────────────────────────────────────
  const [balanceFlash, setBalanceFlash]     = useState<"up" | "down" | null>(null);
  const prevBalanceRef = useRef<number | null>(null);

  // ── Last updated + savings glow ─────────────────────────────────────────
  const [lastUpdated, setLastUpdated]       = useState<number>(Date.now());
  const [savingsGlow, setSavingsGlow]       = useState(false);
  const prevSavedRef                        = useRef<number | null>(null);
  const [, setRelTimeTick]                  = useState(0); // forces re-render for relative time

  // ── Funds amount selector ───────────────────────────────────────────────
  const [fundsAmt, setFundsAmt]             = useState(25);
  const [showFundsMenu, setShowFundsMenu]   = useState(false);

  // ── Local UI ────────────────────────────────────────────────────────────
  const [budget, setBudget]           = useState(200);
  const [budgetInput, setBudgetInput] = useState("200");
  const [editingBudget, setEditingBudget] = useState(false);

  // ── Load wallet ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo) {
      const w = demoWallet();
      setWallet(w);
      prevBalanceRef.current = w.balance;
      prevSavedRef.current   = w.totalSaved;
      setWalletLoading(false);
      return;
    }
    fetch("/api/wallet", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<WalletState> : Promise.reject(r.status))
      .then((w) => { setWallet(w); prevBalanceRef.current = w.balance; prevSavedRef.current = w.totalSaved; })
      .catch(() => {
        const fallback = defaultClientWallet();
        setWallet(fallback);
        prevBalanceRef.current = fallback.balance;
        prevSavedRef.current   = fallback.totalSaved;
      })
      .finally(() => setWalletLoading(false));
  }, [isDemo]);

  // ── Apply wallet update + side effects ──────────────────────────────────
  const applyWalletUpdate = useCallback((updated: WalletState, newIds?: string[]) => {
    setWallet(prev => {
      const prevBal = prev?.balance ?? null;
      if (prevBal !== null && prevBal !== updated.balance) {
        const dir = updated.balance > prevBal ? "up" : "down";
        setBalanceFlash(dir);
        setTimeout(() => setBalanceFlash(null), 900);
      }
      prevBalanceRef.current = updated.balance;
      return updated;
    });

    // "Last updated" timestamp
    setLastUpdated(Date.now());

    // Savings glow when totalSaved increases
    if (prevSavedRef.current !== null && updated.totalSaved > prevSavedRef.current) {
      setSavingsGlow(true);
      setTimeout(() => setSavingsGlow(false), 1800);
    }
    prevSavedRef.current = updated.totalSaved;

    if (newIds?.length) {
      setNewTxIds(prev => {
        const next = new Set(prev);
        newIds.forEach(id => next.add(id));
        return next;
      });
      newIds.forEach(id => {
        if (highlightTimers.current.has(id)) clearTimeout(highlightTimers.current.get(id)!);
        const t = setTimeout(() => {
          setNewTxIds(prev => { const n = new Set(prev); n.delete(id); return n; });
          highlightTimers.current.delete(id);
        }, 3000);
        highlightTimers.current.set(id, t);
      });
    }
  }, []);

  // ── Tick relative time display every 15 s ────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setRelTimeTick(v => v + 1), 15000);
    return () => clearInterval(t);
  }, []);

  // ── Close funds menu on outside click ────────────────────────────────────
  useEffect(() => {
    if (!showFundsMenu) return;
    const close = () => setShowFundsMenu(false);
    const id = setTimeout(() => window.addEventListener("click", close, { once: true }), 0);
    return () => { clearTimeout(id); window.removeEventListener("click", close); };
  }, [showFundsMenu]);

  // ── Wallet ref — lets the tick closure always see the latest state ────────
  const walletRef = useRef<WalletState | null>(null);
  useEffect(() => { walletRef.current = wallet; }, [wallet]);

  // ── Auto-tick: live activity simulation, 10–15 s random interval ─────────
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    const schedule = () => {
      const delay = 10000 + Math.random() * 5000; // 10–15 s
      timerId = setTimeout(tick, delay);
    };

    const tick = () => {
      const w = walletRef.current;
      if (!document.hidden && w) {
        const tickCostRange: Record<SpendMode, [number, number]> = { saver: [0.04, 0.20], balanced: [0.08, 0.65], performance: [0.20, 1.20] };
        const [lo, hi] = tickCostRange[w.spendMode];
        const cost = +rand(lo, hi);
        const tx: WalletTx = { id: makeId(), label: pick(COST_LABELS), amount: -cost, timestamp: Date.now(), type: "usage", provider: pick(USAGE_PROVIDERS) };
        applyWalletUpdate({ ...w, balance: +(w.balance + cost).toFixed(2), transactions: [tx, ...w.transactions].slice(0, 10) });
      }
      schedule(); // reschedule after each tick regardless
    };

    schedule();
    return () => clearTimeout(timerId);
  }, [applyWalletUpdate]); // runs once; wallet accessed via ref

  // ── Show savings tip ─────────────────────────────────────────────────────
  const showTip = useCallback((tip: string) => {
    setSavingsTip(tip);
    if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
    tipTimerRef.current = setTimeout(() => setSavingsTip(null), 10000);
  }, []);

  // ── Action: Run AI Task — opens pre-flight modal ─────────────────────────
  const handleRunTask = useCallback(() => {
    if (isRunningTask || !wallet) return;
    const taskCostRange: Record<SpendMode, [number, number]> = { saver: [0.01, 0.04], balanced: [0.02, 0.10], performance: [0.05, 0.20] };
    const [lo, hi] = taskCostRange[wallet.spendMode];
    const baseCost = +rand(lo, hi);
    const { name, cheaper, company, tier } = pick(PROVIDERS);
    const estimatedCost = +(baseCost * tier).toFixed(3);
    setPreFlight({ provider: name, cheaper, company, tier, estimatedCost });
  }, [isRunningTask, wallet]);

  // ── Confirm task (from modal) ────────────────────────────────────────────
  const handleConfirmTask = useCallback(async (optimized: boolean) => {
    if (!preFlight || !wallet) return;
    const { cheaper, company, tier, estimatedCost } = preFlight;
    setPreFlight(null);
    setIsRunningTask(true);

    await new Promise(r => setTimeout(r, 440));

    const isGemini = company === "Gemini";
    let finalCost: number;
    let usedProvider: string;
    let savingsLabel: string | null = null;

    if (optimized) {
      if (isGemini) {
        // Already Gemini — model downgrade
        finalCost   = +(estimatedCost * 0.60).toFixed(3);
        usedProvider = "Gemini";
        savingsLabel = `Saved $${(estimatedCost - finalCost).toFixed(2)} using ${cheaper}`;
      } else {
        // Switch to Gemini
        finalCost   = +((estimatedCost / tier) * 0.70).toFixed(3);
        usedProvider = "Gemini";
        savingsLabel = `Saved $${(estimatedCost - finalCost).toFixed(2)} routing to Gemini 1.5 Flash`;
      }
    } else {
      finalCost   = estimatedCost;
      usedProvider = company;
    }

    const txs: WalletTx[] = [];
    txs.push({ id: makeId(), label: pick(CLIENT_TASK_LABELS), amount: -finalCost, timestamp: Date.now(), type: "usage", provider: usedProvider });
    if (optimized && savingsLabel) {
      const savedAmt = +(estimatedCost - finalCost).toFixed(2);
      txs.push({ id: makeId(), label: savingsLabel, amount: savedAmt, timestamp: Date.now() - 50, type: "optimization", provider: "AI Wallet" });
    }

    const net = txs.reduce((s, t) => s + t.amount, 0);
    applyWalletUpdate(
      { ...wallet, balance: +Math.max(0, wallet.balance + net).toFixed(2), transactions: [...txs, ...wallet.transactions].slice(0, 10) },
      txs.map(t => t.id),
    );
    setIsRunningTask(false);
  }, [preFlight, wallet, applyWalletUpdate]);

  // ── Action: Add Funds ────────────────────────────────────────────────────
  const handleAddFunds = useCallback(async (amount: number) => {
    if (isAddingFunds || !wallet) return;
    setIsAddingFunds(true);
    setShowFundsMenu(false);
    let handled = false;
    try {
      const res = await fetch("/api/wallet/funds", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const { wallet: updated, newTransaction } = await res.json() as { wallet: WalletState; newTransaction: WalletTx };
        applyWalletUpdate(updated, [newTransaction.id]);
        handled = true;
      }
    } catch { /* fall through to simulation */ }
    if (!handled) {
      await new Promise(r => setTimeout(r, 380));
      const tx: WalletTx = { id: makeId(), label: `Funds added — $${amount.toFixed(2)} top-up`, amount, timestamp: Date.now(), type: "deposit", provider: "Wallet" };
      applyWalletUpdate(
        { ...wallet, balance: +(wallet.balance + amount).toFixed(2), transactions: [tx, ...wallet.transactions].slice(0, 10) },
        [tx.id],
      );
    }
    setIsAddingFunds(false);
  }, [isAddingFunds, wallet, applyWalletUpdate]);

  // ── Action: Optimize Spend ───────────────────────────────────────────────
  const handleOptimize = useCallback(async () => {
    if (isOptimizing || !wallet) return;
    setIsOptimizing(true);
    let handled = false;
    try {
      const res = await fetch("/api/wallet/optimize", { method: "POST", credentials: "include" });
      if (res.ok) {
        const { wallet: updated, newTransactions, tip } = await res.json() as {
          wallet: WalletState; newTransactions: WalletTx[]; tip: string;
        };
        applyWalletUpdate(updated, newTransactions.map(t => t.id));
        if (tip) showTip(tip);
        handled = true;
      }
    } catch { /* fall through to simulation */ }
    if (!handled) {
      await new Promise(r => setTimeout(r, 700));
      const newTxs: WalletTx[] = [];
      const saveAmt = +rand(2.5, 9.0);
      newTxs.push({ id: makeId(), label: pick(CLIENT_SAVE_LABELS), amount: saveAmt, timestamp: Date.now(), type: "optimization", provider: "AI Wallet" });
      const numCosts = Math.random() > 0.45 ? 2 : 1;
      for (let i = 0; i < numCosts; i++) {
        newTxs.push({ id: makeId(), label: pick(CLIENT_COST_LABELS), amount: -+rand(0.40, 2.80), timestamp: Date.now() - (i + 1) * 800, type: "usage", provider: pick(USAGE_PROVIDERS) });
      }
      const net = newTxs.reduce((s, t) => s + t.amount, 0);
      applyWalletUpdate(
        {
          ...wallet,
          balance:      +Math.max(0, wallet.balance + net).toFixed(2),
          totalSaved:   +(wallet.totalSaved + saveAmt).toFixed(2),
          transactions: [...newTxs, ...wallet.transactions].slice(0, 10),
        },
        newTxs.map(t => t.id),
      );
      showTip(pick(CLIENT_SAVINGS_TIPS));
    }
    setIsOptimizing(false);
  }, [isOptimizing, wallet, applyWalletUpdate, showTip]);

  // ── Mode switch ─────────────────────────────────────────────────────────
  const handleModeSwitch = useCallback(async (mode: SpendMode) => {
    if (mode === wallet?.spendMode || !wallet) return;
    let handled = false;
    try {
      const res = await fetch("/api/wallet/mode", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        const { wallet: updated } = await res.json() as { wallet: WalletState };
        applyWalletUpdate(updated);
        handled = true;
      }
    } catch { /* fall through to simulation */ }
    if (!handled) {
      const modeLabels: Record<SpendMode, string> = { saver: "saving more", balanced: "balanced approach", performance: "max performance" };
      const tx: WalletTx = {
        id: makeId(),
        label: `Switched to ${mode[0].toUpperCase() + mode.slice(1)} Mode → ${modeLabels[mode]}`,
        amount: 0, timestamp: Date.now(), type: "mode_switch", provider: "AI Wallet",
      };
      applyWalletUpdate({ ...wallet, spendMode: mode, transactions: [tx, ...wallet.transactions].slice(0, 10) });
    }
  }, [wallet, applyWalletUpdate]);

  // ── Budget helpers ──────────────────────────────────────────────────────
  const commitBudget = () => {
    const v = parseFloat(budgetInput);
    if (!isNaN(v) && v > 0) setBudget(v);
    else setBudgetInput(String(budget));
    setEditingBudget(false);
  };

  // ── Derived values ──────────────────────────────────────────────────────
  const balance    = wallet?.balance    ?? data.totalSpend;
  const totalSaved = wallet?.totalSaved ?? data.autopilotSaved;
  const spendMode  = wallet?.spendMode  ?? "balanced";
  const transactions = wallet?.transactions ?? [];

  const activeMode  = MODES.find(m => m.id === spendMode)!;
  const switched    = Math.round(GPT4O_REQS * activeMode.switchPct);
  const extraSaved  = switched * (GPT4O_COST - MINI_COST);
  const projSpend   = +(balance - extraSaved).toFixed(2);
  const projSavings = +(totalSaved + extraSaved).toFixed(2);
  const origTotal   = data.totalSpend + data.savings;
  const projSavePct = +((projSavings / origTotal) * 100).toFixed(1);
  const isSimulated = spendMode !== "performance";

  // ── Efficiency score inputs ──────────────────────────────────────────────
  const scoreTxs = transactions.filter(tx => tx.type === "usage" || tx.type === "optimization");
  const optimizedFraction = scoreTxs.length > 0
    ? transactions.filter(tx => tx.type === "optimization").length / scoreTxs.length
    : 0;

  const usedPct = Math.min((balance / budget) * 100, 100);
  const budgetStatus =
    usedPct >= 90 ? { label: "You've hit your limit",      icon: <XCircle className="w-4 h-4" />,      color: "text-red-400",    barColor: "bg-red-400",    bg: "bg-red-400/8 border-red-400/25" }
  : usedPct >= 70 ? { label: "You're close to your limit", icon: <TriangleAlert className="w-4 h-4" />, color: "text-yellow-400", barColor: "bg-yellow-400", bg: "bg-yellow-400/8 border-yellow-400/25" }
  :                 { label: "You're on track",             icon: <CheckCircle2 className="w-4 h-4" />,  color: "text-success",    barColor: "bg-success",    bg: "bg-success/8 border-success/25" };

  const displayName = user?.firstName ? `${user.firstName}'s Wallet` : "My AI Wallet";

  // ── Spending Insights (derived from live transactions) ───────────────────
  const insights = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayTs = todayStart.getTime();
    const usageTxs = transactions.filter(tx => tx.type === "usage");

    const spentToday = transactions
      .filter(tx => tx.type === "usage" && tx.timestamp >= todayTs)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const avgCost = usageTxs.length > 0
      ? usageTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / usageTxs.length
      : 0;

    const providerCounts: Record<string, number> = {};
    usageTxs.forEach(tx => {
      if (tx.provider) providerCounts[tx.provider] = (providerCounts[tx.provider] ?? 0) + 1;
    });
    const topProvider = Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    return { spentToday, avgCost, topProvider };
  }, [transactions]);

  // ── Provider cost totals for breakdown gauges ────────────────────────────
  const providerTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    transactions.filter(t => t.type === "usage").forEach(t => {
      if (t.provider && t.provider !== "AI Wallet" && t.provider !== "Wallet") {
        totals[t.provider] = (totals[t.provider] ?? 0) + Math.abs(t.amount);
      }
    });
    return totals;
  }, [transactions]);
  const totalProviderSpend = Object.values(providerTotals).reduce((s, v) => s + v, 0);

  // ── Intelligence feed at HomeInner level ─────────────────────────────────
  const [insightRefreshTs, setInsightRefreshTs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setInsightRefreshTs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const homeInsights = useMemo(
    () => buildInsights(transactions, data.avgCost, totalSaved, insightRefreshTs),
    [transactions, data.avgCost, totalSaved, insightRefreshTs],
  );
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  if (walletLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      </Shell>
    );
  }

  const PROVIDER_BAR: Record<string, string> = { OpenAI: "bg-blue-400", Anthropic: "bg-orange-400", Gemini: "bg-green-400" };

  return (
    <Shell>
      {/* ── Demo Banner ── */}
      {isDemo && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-amber-400/30 bg-amber-400/8 mb-5">
          <div className="flex items-center gap-2.5">
            <FlaskConical className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-300">
              You are in <span className="font-bold">Demo Mode</span> — data is not saved
            </p>
          </div>
          <button onClick={logout}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-400/40 hover:border-amber-400/70 px-2.5 py-1 rounded-lg transition-colors flex-shrink-0">
            Exit Demo
          </button>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          LAYER 1 — HERO
          ════════════════════════════════════════════════════════════════════ */}
      {/* ── Hero Card ── */}

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="relative rounded-3xl overflow-hidden mb-6"
        style={{ background: "linear-gradient(135deg, #13111f 0%, #1e1b4b 20%, #2d2369 45%, #1a1740 70%, #0a0818 100%)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-500/25 rounded-full blur-[90px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/30 rounded-full blur-[70px] translate-x-1/3 translate-y-1/3 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/6 via-transparent to-white/2 pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="card-shine-inner absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/6 to-transparent" />
        </div>

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-inner">
                <CreditCard className="w-[18px] h-[18px] text-white/80" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-widest text-white/45 uppercase block">{displayName}</span>
                <span className="text-[10px] font-mono text-white/25 tracking-widest">•••• •••• •••• 4721</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button onClick={handleRunTask} disabled={isRunningTask}
                whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.05 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-400/15 border border-orange-400/30 text-orange-300 text-xs font-bold disabled:opacity-50 transition-colors hover:bg-orange-400/22">
                {isRunningTask ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Run Task
              </motion.button>
              <div className="relative">
                <motion.button onClick={() => setShowFundsMenu(v => !v)} disabled={isAddingFunds}
                  whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold disabled:opacity-50 transition-colors hover:bg-emerald-400/22">
                  {isAddingFunds ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  +${fundsAmt}
                </motion.button>
                <AnimatePresence>
                  {showFundsMenu && (
                    <motion.div initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 z-30 rounded-xl border border-border/50 bg-card shadow-xl p-2 flex flex-col gap-1 min-w-[80px]">
                      {FUNDS_OPTIONS.map(amt => (
                        <button key={amt} onClick={() => { setFundsAmt(amt); handleAddFunds(amt); }}
                          className={`text-sm font-semibold px-3 py-2 rounded-lg transition-colors text-left ${fundsAmt === amt ? "bg-emerald-400/20 text-emerald-400" : "hover:bg-secondary text-foreground"}`}>
                          +${amt}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <motion.button onClick={handleOptimize} disabled={isOptimizing}
                whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.05 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-400/15 border border-violet-400/30 text-violet-300 text-xs font-bold disabled:opacity-50 transition-colors hover:bg-violet-400/22">
                {isOptimizing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Optimize
              </motion.button>
            </div>
          </div>

          <div className="text-center mb-7">
            <p className="text-xs text-white/40 mb-2 font-semibold tracking-widest uppercase">Balance</p>
            <motion.div key={balance} initial={{ scale: 1.03 }} animate={{ scale: 1 }} transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative inline-block">
              <AnimatePresence>
                {balanceFlash && (
                  <motion.div key={balanceFlash} initial={{ opacity: 0.9, scale: 0.93 }} animate={{ opacity: 0, scale: 1.2 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.65 }}
                    className={`absolute inset-0 rounded-xl pointer-events-none ${balanceFlash === "up" ? "bg-emerald-400/25" : "bg-red-400/25"}`} />
                )}
              </AnimatePresence>
              <div className={`text-6xl md:text-7xl font-mono font-black tracking-tight transition-colors duration-300 ${
                balanceFlash === "up" ? "text-emerald-300" : balanceFlash === "down" ? "text-red-300" : "text-white"
              }`}>
                $<AnimatedNumber value={balance} decimals={2} />
              </div>
            </motion.div>
            <p className="text-sm text-white/35 mt-2 font-medium">this month's spend</p>
            <motion.p
              animate={savingsGlow ? { textShadow: "0 0 14px rgba(52,211,153,0.9)" } : { textShadow: "none" }}
              transition={{ duration: 0.4 }}
              className="text-sm font-semibold text-emerald-400 mt-1">
              +$<AnimatedNumber value={totalSaved} decimals={2} /> saved
              <AnimatePresence>
                {savingsGlow && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="ml-2 text-xs">updated</motion.span>
                )}
              </AnimatePresence>
            </motion.p>
          </div>

          <div className="flex rounded-2xl bg-white/[0.06] border border-white/[0.08] p-1 mb-7">
            {MODES.map(mode => {
              const active = spendMode === mode.id;
              return (
                <motion.button key={mode.id} onClick={() => handleModeSwitch(mode.id)} whileTap={{ scale: 0.96 }}
                  className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                    active
                      ? mode.id === "saver"       ? "bg-emerald-400/20 text-emerald-300 shadow-lg"
                      : mode.id === "performance" ? "bg-orange-400/20 text-orange-300 shadow-lg"
                      :                             "bg-primary/20 text-primary shadow-lg"
                      : "text-white/40 hover:text-white/70"
                  }`}>
                  {active && (
                    <motion.div layoutId="hero-mode-active"
                      className="absolute inset-0 rounded-xl border border-current opacity-30"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                  )}
                  {mode.icon}
                  <span>{mode.label}</span>
                </motion.button>
              );
            })}
          </div>

          {isSimulated && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-7 overflow-hidden">
              {[
                { label: "Projected Spend",   value: formatCurrency(projSpend),   delta: `-${formatCurrency(extraSaved)}` },
                { label: "Total Saved",        value: formatCurrency(projSavings), delta: `+${formatCurrency(extraSaved)}` },
                { label: "Savings Rate",       value: `${projSavePct}%`,           delta: `+${(projSavePct - data.savingsPercent).toFixed(1)}%` },
                { label: "Re-routed Requests", value: formatNumber(switched),      delta: "to mini" },
              ].map(item => (
                <div key={item.label} className="bg-white/[0.05] rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-white/40 mb-1 font-medium">{item.label}</p>
                  <p className="text-sm font-bold text-white">{item.value}</p>
                  <p className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-0.5">
                    <ChevronRight className="w-3 h-3" />{item.delta}
                  </p>
                </div>
              ))}
            </motion.div>
          )}

          <HeroCostEstimator avgCost={data.avgCost} />
        </div>

        <AnimatePresence>
          {savingsTip && (
            <motion.div key="tip" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28 }}
              className="border-t border-white/[0.08] overflow-hidden">
              <div className="flex items-start gap-3 px-6 md:px-8 py-4">
                <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-300 flex-1 leading-relaxed">{savingsTip}</p>
                <button onClick={() => setSavingsTip(null)} className="text-white/30 hover:text-white/70 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* LAYER 2 — COMMAND CENTER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard delay={0.1} title="Total Spend" value={`$${balance.toFixed(2)}`}
          icon={<CreditCard className="w-4 h-4" />} className="stat-card-premium" />
        <StatCard delay={0.15} title="Total Saved" value={`$${totalSaved.toFixed(2)}`}
          icon={<TrendingDown className="w-4 h-4" />} className="stat-card-premium" />
        <StatCard delay={0.2} title="Requests" value={formatNumber(data.totalRequests)}
          icon={<Zap className="w-4 h-4" />} className="stat-card-premium" />
        <EfficiencyScoreCard
          avgCost={insights.avgCost > 0 ? insights.avgCost : data.avgCost}
          savingsPct={data.savingsPercent}
          topProvider={insights.topProvider}
          optimizedFraction={optimizedFraction}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          className="glass-panel rounded-2xl p-6 lg:w-[60%] min-w-0">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-display font-bold text-foreground">Transactions</h2>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{transactions.length}/10</span>
            </div>
            <div className="flex items-center gap-2.5">
              <AnimatePresence mode="wait">
                <motion.span key={lastUpdated} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="text-xs text-muted-foreground/70">
                  Updated {formatLastUpdated(lastUpdated)}
                </motion.span>
              </AnimatePresence>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />Live
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {transactions.map(tx => {
                const isNew   = newTxIds.has(tx.id);
                const isSave  = tx.type === "optimization";
                const isMode  = tx.type === "mode_switch";
                const isDepos = tx.type === "deposit";
                const isSpend = tx.type === "usage";
                return (
                  <motion.div key={tx.id}
                    initial={{ opacity: 0, y: -20, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 24 }}
                    className={`tx-row justify-between border transition-colors duration-500 ${
                      isNew
                        ? isSave || isDepos ? "bg-emerald-400/8 border-emerald-400/35 shadow-[0_0_12px_rgba(52,211,153,0.10)]"
                        : "bg-primary/8 border-primary/35 shadow-[0_0_12px_rgba(139,92,246,0.10)]"
                        : "bg-card/20 border-border/25"
                    }`}>
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full ${
                      isSave ? "bg-success" : isDepos ? "bg-emerald-400" : isMode ? "bg-primary" : "bg-red-400/60"
                    }`} />
                    <div className="flex items-center gap-3 pl-1">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSave ? "bg-success/12 text-success" : isDepos ? "bg-emerald-400/12 text-emerald-300"
                        : isMode ? "bg-primary/12 text-primary" : "bg-secondary/80 text-muted-foreground"
                      }`}>
                        {isSave && <ArrowDownRight className="w-3.5 h-3.5" />}
                        {isDepos && <Plus className="w-3.5 h-3.5" />}
                        {isMode && <Sparkles className="w-3.5 h-3.5" />}
                        {isSpend && <ArrowUpRight className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground leading-snug">{tx.label}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <p className="text-xs text-muted-foreground">{formatRelTime(tx.timestamp)}</p>
                          {tx.provider && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PROVIDER_COLOR[tx.provider] ?? "text-muted-foreground bg-secondary"}`}>{tx.provider}</span>
                          )}
                          {isNew && (
                            <motion.span initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 2.8, duration: 0.4 }}
                              className="text-[10px] font-bold text-current px-1.5 py-0.5 rounded-full bg-current/10"
                              style={{ color: isSave || isDepos ? "#34d399" : "#8b5cf6" }}>NEW</motion.span>
                          )}
                        </div>
                      </div>
                    </div>
                    {tx.amount !== 0 ? (
                      <div className={`text-sm font-bold font-mono tabular-nums flex items-center gap-0.5 ${isSave || isDepos ? "text-success" : "text-red-400"}`}>
                        <span>{isSave || isDepos ? "+" : "-"}</span>
                        <span>${Math.abs(tx.amount).toFixed(3)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">mode</span>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {transactions.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No transactions yet — click Run Task above to get started.
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="glass-panel rounded-2xl p-6 lg:w-[40%] min-w-0 flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-display font-bold text-foreground">Provider Breakdown</h2>
            </div>
            {totalProviderSpend === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-muted-foreground/30" />
                </div>
                <p className="text-sm text-muted-foreground">No provider data yet</p>
                <p className="text-xs text-muted-foreground/60">Run a task to see spend by provider</p>
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(providerTotals).sort((a, b) => b[1] - a[1]).map(([provider, cost], i) => {
                  const pct = totalProviderSpend > 0 ? (cost / totalProviderSpend) * 100 : 0;
                  const barColor = PROVIDER_BAR[provider] ?? "bg-primary";
                  return (
                    <motion.div key={provider} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.32 + i * 0.07 }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PROVIDER_COLOR[provider] ?? "text-foreground bg-secondary"}`}>
                          {provider}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono font-bold text-foreground">{fmtCost(cost)}</span>
                          <span className="text-xs font-semibold text-muted-foreground/60 w-8 text-right">{Math.round(pct)}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                        <motion.div className={`h-full rounded-full ${barColor}`}
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.9, ease: "easeOut", delay: 0.38 + i * 0.07 }} />
                      </div>
                    </motion.div>
                  );
                })}
                <div className="pt-3 border-t border-border/30 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-semibold">Total session</span>
                  <span className="text-sm font-mono font-bold text-foreground">{fmtCost(totalProviderSpend)}</span>
                </div>
              </div>
            )}
          </div>

          <div className={`rounded-2xl p-4 border transition-colors duration-500 ${budgetStatus.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground">Monthly Budget</span>
              </div>
              {editingBudget ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">$</span>
                  <input autoFocus type="number" min={1} value={budgetInput}
                    onChange={e => setBudgetInput(e.target.value)} onBlur={commitBudget}
                    onKeyDown={e => { if (e.key === "Enter") commitBudget(); if (e.key === "Escape") { setBudgetInput(String(budget)); setEditingBudget(false); } }}
                    className="w-16 text-xs font-semibold bg-secondary border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
              ) : (
                <button onClick={() => { setBudgetInput(String(budget)); setEditingBudget(true); }}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  ${budget}/mo
                </button>
              )}
            </div>
            <div className="h-2.5 rounded-full bg-secondary overflow-hidden mb-2">
              <motion.div className={`h-full rounded-full transition-colors duration-500 ${budgetStatus.barColor}`}
                initial={{ width: 0 }} animate={{ width: `${usedPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-2">
              <span>{formatCurrency(balance)} used</span>
              <span>{usedPct.toFixed(0)}% of ${budget}</span>
              <span>{formatCurrency(Math.max(0, budget - balance))} left</span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${budgetStatus.color}`}>
              {budgetStatus.icon}
              <span>{budgetStatus.label}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* LAYER 3 — INTELLIGENCE */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}
        className="glass-panel rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-foreground">Intelligence Feed</h2>
            <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
              {homeInsights.length} insights
            </span>
          </div>
          <button onClick={() => setInsightsExpanded(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
            {insightsExpanded ? "Show less" : "View all insights"}
            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${insightsExpanded ? "rotate-90" : ""}`} />
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {homeInsights.slice(0, 3).map((insight, i) => {
            const s = INSIGHT_STYLES[insight.level];
            const Icon = insight.icon;
            return (
              <motion.div key={insight.id}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.38 + i * 0.07, duration: 0.3 }}
                className={`flex-shrink-0 w-72 flex items-start gap-3 p-4 rounded-xl border ${s.border} ${s.bg}`}>
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${s.iconCls}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground leading-relaxed">{insight.text}</p>
                  <span className={`mt-2 inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.badge}`}>
                    {insight.level}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {insightsExpanded && (
            <motion.div key="expanded"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}
              className="overflow-hidden">
              <div className="space-y-2.5 mt-4 pt-4 border-t border-border/30">
                {homeInsights.slice(3).map((insight, i) => {
                  const s = INSIGHT_STYLES[insight.level];
                  const Icon = insight.icon;
                  return (
                    <motion.div key={insight.id}
                      initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={`flex items-start gap-3.5 p-4 rounded-xl border ${s.border} ${s.bg}`}>
                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${s.iconCls}`}><Icon className="w-4 h-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed">{insight.text}</p>
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${s.badge}`}>{insight.level}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {preFlight && (
          <PreFlightModal
            key="preflight"
            provider={preFlight.provider}
            cheaper={preFlight.cheaper}
            company={preFlight.company}
            tier={preFlight.tier}
            estimatedCost={preFlight.estimatedCost}
            onContinue={() => handleConfirmTask(false)}
            onOptimize={() => handleConfirmTask(true)}
            onClose={() => setPreFlight(null)}
          />
        )}
      </AnimatePresence>

      <AgentChat wallet={wallet} data={data} onOptimize={handleOptimize} onModeSwitch={handleModeSwitch} />
      <ExtensionWidget />
    </Shell>
  );
}
