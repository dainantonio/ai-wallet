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
  Play, Plus, RefreshCw, X, ShieldCheck, FlaskConical,
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

  if (walletLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* ── Demo Mode Banner ── */}
      {isDemo && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-amber-400/30 bg-amber-400/8 mb-5"
        >
          <div className="flex items-center gap-2.5">
            <FlaskConical className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-300">
              You are in <span className="font-bold">Demo Mode</span> — data is not saved
            </p>
          </div>
          <button
            onClick={logout}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-400/40 hover:border-amber-400/70 px-2.5 py-1 rounded-lg transition-colors flex-shrink-0"
          >
            Exit Demo
          </button>
        </motion.div>
      )}

      <header className="mb-6">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="text-3xl md:text-5xl font-display font-black tracking-tight heading-gradient">
          {displayName}
        </motion.h1>
        <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="text-muted-foreground mt-1.5 text-sm">
          Your AI spending, optimized and in control.
        </motion.p>
      </header>

      {/* ── Wallet Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="relative rounded-3xl overflow-hidden mb-5"
        style={{ background: "linear-gradient(135deg, #13111f 0%, #1e1b4b 20%, #2d2369 45%, #1a1740 70%, #0a0818 100%)" }}
      >
        {/* Top highlight line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Ambient glows */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-500/25 rounded-full blur-[90px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/30 rounded-full blur-[70px] translate-x-1/3 translate-y-1/3 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/6 via-transparent to-white/2 pointer-events-none" />

        {/* Shimmer sweep */}
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
                <span className="text-xs font-bold tracking-widest text-white/45 uppercase block">AI Spend Wallet</span>
                <span className="text-[10px] font-mono text-white/25 tracking-widest">•••• •••• •••• 4721</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${activeMode.color}`}>
                {activeMode.label} Mode
              </span>
              <Wallet className="w-5 h-5 text-white/25" />
            </div>
          </div>

          {/* Balance */}
          <div className="mb-8">
            <p className="text-xs text-white/40 mb-1.5 font-semibold tracking-widest uppercase">Balance</p>
            <motion.div
              key={balance}
              initial={{ scale: 1.03 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative inline-block"
            >
              {/* Flash ring */}
              <AnimatePresence>
                {balanceFlash && (
                  <motion.div
                    key={balanceFlash}
                    initial={{ opacity: 0.9, scale: 0.93 }}
                    animate={{ opacity: 0, scale: 1.2 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.65 }}
                    className={`absolute inset-0 rounded-xl pointer-events-none ${balanceFlash === "up" ? "bg-emerald-400/25" : "bg-red-400/25"}`}
                  />
                )}
              </AnimatePresence>
              <div className={`text-5xl md:text-6xl font-mono font-black tracking-tight transition-colors duration-300 ${
                balanceFlash === "up" ? "text-emerald-300" : balanceFlash === "down" ? "text-red-300" : "text-white"
              }`}>
                $<AnimatedNumber value={balance} decimals={2} />
              </div>
            </motion.div>
            <p className="text-xs text-white/35 mt-1.5 font-medium tracking-wide">this month's spend</p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 pt-5 border-t border-white/10 items-end">
            <div>
              <p className="text-[10px] text-white/40 mb-0.5 font-medium uppercase tracking-wider">Available Budget</p>
              <p className="text-xl font-bold text-white">${Math.max(0, budget - balance).toFixed(1)}</p>
            </div>
            <div className="w-px bg-white/10 self-stretch hidden sm:block" />
            <div>
              <p className="text-[10px] text-white/40 mb-0.5 font-medium uppercase tracking-wider">Total Saved</p>
              <motion.p
                animate={savingsGlow
                  ? { textShadow: "0 0 14px rgba(52,211,153,0.9), 0 0 28px rgba(52,211,153,0.4)" }
                  : { textShadow: "none" }
                }
                transition={{ duration: 0.4 }}
                className="text-xl font-bold text-emerald-400"
              >
                +$<AnimatedNumber value={totalSaved} decimals={2} />
              </motion.p>
              <AnimatePresence>
                {savingsGlow && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }}
                    className="text-[10px] text-emerald-400 font-semibold mt-0.5"
                  >
                    ↑ savings updated
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <div className="w-px bg-white/10 self-stretch hidden sm:block" />
            <div>
              <p className="text-[10px] text-white/40 mb-0.5 font-medium uppercase tracking-wider">Smart Spend</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <p className="text-sm font-semibold text-emerald-400">Active</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="mb-5">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">Quick Actions</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Run AI Task */}
          <ActionBtn
            icon={<Play className="w-4 h-4" />}
            label="Run AI Task"
            desc="Simulate API call"
            loading={isRunningTask}
            accent="text-orange-400"
            border="border-orange-400/25"
            bg="bg-orange-400/6 hover:bg-orange-400/12"
            iconBg="bg-orange-400/15"
            onClick={handleRunTask}
          />

          {/* Add Funds */}
          <div className="relative">
            <ActionBtn
              icon={<Plus className="w-4 h-4" />}
              label="Add Funds"
              desc={`+$${fundsAmt} top-up`}
              loading={isAddingFunds}
              accent="text-emerald-400"
              border="border-emerald-400/25"
              bg="bg-emerald-400/6 hover:bg-emerald-400/12"
              iconBg="bg-emerald-400/15"
              badge={`$${fundsAmt}`}
              onClick={() => setShowFundsMenu(v => !v)}
            />
            {/* Amount picker */}
            <AnimatePresence>
              {showFundsMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  className="absolute top-full left-0 right-0 mt-2 z-30 rounded-xl border border-border/50 bg-card shadow-xl backdrop-blur-sm p-2 flex flex-col gap-1"
                >
                  {FUNDS_OPTIONS.map(amt => (
                    <button key={amt}
                      onClick={() => { setFundsAmt(amt); handleAddFunds(amt); }}
                      className={`text-sm font-semibold px-3 py-2 rounded-lg transition-colors text-left ${
                        fundsAmt === amt
                          ? "bg-emerald-400/20 text-emerald-400"
                          : "hover:bg-secondary text-foreground"
                      }`}>
                      +${amt}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Optimize Spend */}
          <ActionBtn
            icon={<Zap className="w-4 h-4" />}
            label="Optimize Spend"
            desc="Find savings now"
            loading={isOptimizing}
            accent="text-violet-400"
            border="border-violet-400/25"
            bg="bg-violet-400/6 hover:bg-violet-400/12"
            iconBg="bg-violet-400/15"
            onClick={handleOptimize}
          />
        </div>
      </motion.div>

      {/* ── Savings Tip Banner ── */}
      <AnimatePresence>
        {savingsTip && (
          <motion.div
            key="savings-tip"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-400/30 bg-amber-400/8">
              <div className="w-8 h-8 rounded-xl bg-amber-400/15 flex items-center justify-center flex-shrink-0 text-amber-400 mt-0.5">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-1">Savings Tip</p>
                <p className="text-sm text-foreground leading-relaxed">{savingsTip}</p>
              </div>
              <button onClick={() => setSavingsTip(null)}
                className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Spend Mode Selector ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
        className="glass-panel rounded-2xl p-5 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Spend Mode</p>
          <span className="text-[11px] text-muted-foreground/70">— affects routing &amp; savings projection</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {MODES.map((mode) => {
            const active = spendMode === mode.id;
            return (
              <motion.button key={mode.id} onClick={() => handleModeSwitch(mode.id)}
                whileTap={{ scale: 0.96 }}
                className={`relative rounded-xl border p-3 text-left transition-all duration-200 ${
                  active ? mode.color : "border-border/40 bg-secondary/30 text-muted-foreground hover:border-border hover:bg-secondary/60"
                }`}>
                {active && (
                  <motion.div layoutId="mode-active"
                    className="absolute inset-0 rounded-xl border-2 border-current opacity-25"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                )}
                <div className="flex items-center gap-2 mb-1">
                  {mode.icon}
                  <span className="text-sm font-bold">{mode.label}</span>
                </div>
                <p className="text-xs opacity-70 leading-snug">{mode.desc}</p>
                {active && mode.switchPct > 0 && (
                  <p className="text-xs font-semibold mt-2 flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />Routing {Math.round(mode.switchPct * 100)}% to mini
                  </p>
                )}
              </motion.button>
            );
          })}
        </div>

        {isSimulated && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.25 }}
            className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 md:grid-cols-4 gap-2 overflow-hidden">
            {[
              { label: "Projected Balance",  value: formatCurrency(projSpend),   delta: `-${formatCurrency(extraSaved)}` },
              { label: "Total Saved",        value: formatCurrency(projSavings), delta: `+${formatCurrency(extraSaved)}` },
              { label: "Savings Rate",       value: `${projSavePct}%`,           delta: `+${(projSavePct - data.savingsPercent).toFixed(1)}%` },
              { label: "Requests Re-routed", value: formatNumber(switched),      delta: "to mini" },
            ].map(item => (
              <div key={item.label} className="bg-primary/6 rounded-xl px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="text-sm font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-success mt-0.5 flex items-center gap-0.5">
                  <ChevronRight className="w-3 h-3" />{item.delta}
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard delay={0.2} title="Available Credits"
          value={`$${(data.credits + (isSimulated ? extraSaved : 0)).toFixed(1)}`}
          icon={<Wallet className="w-4 h-4" />} className="stat-card-premium" />
        <StatCard delay={0.3} title="Avg Cost / Request"
          value={`$${isSimulated ? (projSpend / data.totalRequests).toFixed(3) : data.avgCost.toFixed(3)}`}
          trend={{ value: isSimulated ? `-${(((data.avgCost - projSpend / data.totalRequests) / data.avgCost) * 100).toFixed(1)}%` : "-4.2%", isPositive: true }}
          className="stat-card-premium" />
        <StatCard delay={0.4} title="Top Tool" value={data.topTool}
          icon={<BrainCircuit className="w-4 h-4" />} className="stat-card-premium whitespace-nowrap overflow-hidden text-ellipsis" />
      </div>

      {/* ── Spending Insights ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
        className="glass-panel rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BrainCircuit className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold text-foreground tracking-tight">Spending Insights</p>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-success uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            live
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Today's spend */}
          <div className="fintech-card flex flex-col gap-1.5 p-3.5 rounded-xl">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Receipt className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Today's Spend</p>
            </div>
            <p className="text-xl font-bold font-mono tabular-nums text-red-400">
              ${insights.spentToday > 0 ? insights.spentToday.toFixed(2) : "0.00"}
            </p>
            <p className="text-[10px] text-muted-foreground">from today's tasks</p>
          </div>

          {/* Total saved */}
          <div className="fintech-card flex flex-col gap-1.5 p-3.5 rounded-xl">
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Saved</p>
            </div>
            <p className="text-xl font-bold font-mono tabular-nums text-emerald-400">+${totalSaved.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">via optimizations</p>
          </div>

          {/* Most used provider */}
          <div className="fintech-card flex flex-col gap-1.5 p-3.5 rounded-xl">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Top Provider</p>
            </div>
            <div className="flex items-center gap-1.5">
              {insights.topProvider !== "—" ? (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PROVIDER_COLOR[insights.topProvider] ?? "text-foreground bg-secondary"}`}>
                  {insights.topProvider}
                </span>
              ) : (
                <p className="text-xl font-bold text-muted-foreground">—</p>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">most tasks routed</p>
          </div>

          {/* Avg cost per task */}
          <div className="fintech-card flex flex-col gap-1.5 p-3.5 rounded-xl">
            <div className="flex items-center gap-1.5 mb-0.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Cost / Task</p>
            </div>
            <p className="text-xl font-bold font-mono tabular-nums text-blue-400">
              {insights.avgCost > 0 ? `$${insights.avgCost.toFixed(3)}` : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">across recent tasks</p>
          </div>
        </div>
      </motion.div>

      {/* ── Monthly Budget ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className={`glass-panel rounded-2xl p-6 mb-6 border transition-colors duration-500 ${budgetStatus.bg}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-secondary ${budgetStatus.color}`}><Target className="w-4 h-4" /></div>
            <div>
              <h2 className="text-base font-bold text-foreground">Monthly Budget</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Track your balance against limit</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Limit:</span>
            {editingBudget ? (
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-foreground font-medium">$</span>
                <input autoFocus type="number" min={1} value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)} onBlur={commitBudget}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitBudget();
                    if (e.key === "Escape") { setBudgetInput(String(budget)); setEditingBudget(false); }
                  }}
                  className="w-24 text-sm font-semibold bg-secondary border border-border rounded-lg px-2.5 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
            ) : (
              <button onClick={() => { setBudgetInput(String(budget)); setEditingBudget(true); }}
                className="text-sm font-semibold text-foreground bg-secondary hover:bg-secondary/80 border border-border rounded-lg px-3 py-1 transition-colors">
                ${budget}/mo ✏️
              </button>
            )}
          </div>
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>{formatCurrency(balance)} used</span>
            <span>{formatCurrency(Math.max(0, budget - balance))} remaining</span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <motion.div className={`h-full rounded-full transition-colors duration-500 ${budgetStatus.barColor}`}
              initial={{ width: 0 }} animate={{ width: `${usedPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }} />
          </div>
          <div className="flex justify-between text-xs mt-1.5">
            <span className="text-muted-foreground">$0</span>
            <span className="text-muted-foreground font-medium">{usedPct.toFixed(0)}% used</span>
            <span className="text-muted-foreground">{formatCurrency(budget)}</span>
          </div>
        </div>
        <div className={`flex items-center gap-2 text-sm font-medium ${budgetStatus.color}`}>
          {budgetStatus.icon}
          <span>{budgetStatus.label}</span>
          {usedPct < 70 && (
            <span className="text-xs text-muted-foreground font-normal ml-1">
              — {formatCurrency(Math.max(0, budget - balance))} left this month
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Where money is going ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="glass-panel rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Where your AI money is going</h2>
            <p className="text-sm text-muted-foreground mt-1">This month's balance by use case</p>
          </div>
          <span className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">Simulated</span>
        </div>
        <div className="space-y-5">
          {SPEND_CATEGORIES.map((cat, i) => (
            <motion.div key={cat.label}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + i * 0.08 }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg bg-current/15 ${cat.textColor}`}>{cat.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{formatCurrency(cat.amount)}</p>
                  <p className={`text-xs font-medium ${cat.textColor}`}>{cat.pct}%</p>
                </div>
              </div>
              <AnimatedBar pct={cat.pct} color={cat.color} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Savings Insights ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
        className="glass-panel rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingDown className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display font-bold text-foreground">Savings Insights</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {(data?.savingsInsights?.topSavings ?? []).map(item => (
            <div key={item.label} className="flex items-start gap-3 p-4 rounded-xl bg-secondary/40 border border-border/40">
              <div className={`p-2 rounded-lg flex-shrink-0 ${categoryColor(item.category)}`}>{categoryIcon(item.category)}</div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground leading-snug">{item.label}</p>
                <p className="text-lg font-bold text-success mt-1">{formatCurrency(item.savedAmount)} saved</p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/8 border border-red-500/20">
            <div className="p-2 rounded-lg text-red-400 bg-red-400/10 flex-shrink-0"><AlertTriangle className="w-4 h-4" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Estimated Wasted Spend</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(data?.savingsInsights?.wastedSpend ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">requests that could be cheaper</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20">
            <div className="p-2 rounded-lg text-primary bg-primary/10 flex-shrink-0"><Lightbulb className="w-4 h-4" /></div>
            <div>
              <p className="text-sm font-medium text-primary mb-1">Recommendation</p>
              <p className="text-sm text-foreground leading-relaxed">{data?.savingsInsights?.recommendation ?? ""}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Transactions ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}
        className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-display font-bold text-foreground">Transactions</h2>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {transactions.length}/10
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <AnimatePresence mode="wait">
              <motion.span
                key={lastUpdated}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                className="text-xs text-muted-foreground/70"
              >
                Updated {formatLastUpdated(lastUpdated)}
              </motion.span>
            </AnimatePresence>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Live
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
                  initial={{ opacity: 0, y: -20, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                  className={`tx-row justify-between border transition-colors duration-500 ${
                    isNew
                      ? isSave || isDepos
                        ? "bg-emerald-400/8 border-emerald-400/35 shadow-[0_0_12px_rgba(52,211,153,0.10)]"
                        : "bg-primary/8 border-primary/35 shadow-[0_0_12px_rgba(139,92,246,0.10)]"
                      : "bg-card/20 border-border/25"
                  }`}>
                  {/* Permanent type-color bar on left */}
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full ${
                    isSave  ? "bg-success"
                  : isDepos ? "bg-emerald-400"
                  : isMode  ? "bg-primary"
                  : "bg-red-400/60"
                  }`} />

                  <div className="flex items-center gap-3 pl-1">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSave  ? "bg-success/12 text-success"
                    : isDepos ? "bg-emerald-400/12 text-emerald-300"
                    : isMode  ? "bg-primary/12 text-primary"
                    : "bg-secondary/80 text-muted-foreground"
                    }`}>
                      {isSave  && <ArrowDownRight className="w-3.5 h-3.5" />}
                      {isDepos && <Plus className="w-3.5 h-3.5" />}
                      {isMode  && <Sparkles className="w-3.5 h-3.5" />}
                      {isSpend && <ArrowUpRight className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground leading-snug">{tx.label}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <p className="text-xs text-muted-foreground">{formatRelTime(tx.timestamp)}</p>
                        {tx.provider && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PROVIDER_COLOR[tx.provider] ?? "text-muted-foreground bg-secondary"}`}>
                            {tx.provider}
                          </span>
                        )}
                        {isNew && (
                          <motion.span initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 2.8, duration: 0.4 }}
                            className="text-[10px] font-bold text-current px-1.5 py-0.5 rounded-full bg-current/10"
                            style={{ color: isSave || isDepos ? "#34d399" : "#8b5cf6" }}>
                            NEW
                          </motion.span>
                        )}
                      </div>
                    </div>
                  </div>

                  {tx.amount !== 0 ? (
                    <div className={`text-sm font-bold font-mono tabular-nums flex items-center gap-0.5 ${
                      isSave || isDepos ? "text-success" : "text-red-400"
                    }`}>
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
            <div className="text-center py-8 text-muted-foreground text-sm">
              No transactions yet — click an action above to get started.
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Pre-Flight Modal ── */}
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
    </Shell>
  );
}
