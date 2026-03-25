import { useState, useEffect, useRef, useCallback } from "react";
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
  CreditCard, Receipt, ArrowDownRight, ArrowUpRight, RefreshCw,
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
  type: "optimization" | "usage" | "mode_switch";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeId() { return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return +(Math.random() * (max - min) + min).toFixed(2); }
function formatRelTime(ts: number) {
  const d = Date.now() - ts;
  if (d < 60000) return "just now";
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
      duration: 0.6, ease: "easeOut",
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
  const { user } = useAuthContext();

  // ── Wallet state (fetched from /api/wallet) ─────────────────────────────
  const [wallet, setWallet]       = useState<WalletState | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [isOptimizing, setIsOptimizing]   = useState(false);

  // ── Local UI state ──────────────────────────────────────────────────────
  const [budget, setBudget]           = useState(200);
  const [budgetInput, setBudgetInput] = useState("200");
  const [editingBudget, setEditingBudget] = useState(false);

  // ── Load wallet ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/wallet", { credentials: "include" })
      .then(r => r.json() as Promise<WalletState>)
      .then(setWallet)
      .catch(() => {})
      .finally(() => setWalletLoading(false));
  }, []);

  // ── Auto-tick: add small usage tx every 10 s (local only) ───────────────
  useEffect(() => {
    const tick = () => {
      if (document.hidden || !wallet) return;
      const cost = rand(0.08, 0.65);
      const tx: WalletTx = { id: makeId(), label: pick(COST_LABELS), amount: -cost, timestamp: Date.now(), type: "usage" };
      setWallet(prev => prev ? {
        ...prev,
        balance: +(prev.balance + cost).toFixed(2),
        transactions: [tx, ...prev.transactions].slice(0, 10),
      } : prev);
    };
    const iv = setInterval(tick, 10000);
    return () => clearInterval(iv);
  }, [wallet]);

  // ── Optimize Wallet ─────────────────────────────────────────────────────
  const handleOptimize = useCallback(async () => {
    if (isOptimizing) return;
    setIsOptimizing(true);
    try {
      const res = await fetch("/api/wallet/optimize", { method: "POST", credentials: "include" });
      if (res.ok) {
        const { wallet: updated } = await res.json() as { wallet: WalletState };
        setWallet(updated);
      }
    } catch { /* stay stable */ }
    setIsOptimizing(false);
  }, [isOptimizing]);

  // ── Mode switch ─────────────────────────────────────────────────────────
  const handleModeSwitch = useCallback(async (mode: SpendMode) => {
    if (mode === wallet?.spendMode) return;
    try {
      const res = await fetch("/api/wallet/mode", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        const { wallet: updated } = await res.json() as { wallet: WalletState };
        setWallet(updated);
      }
    } catch { /* stay stable */ }
  }, [wallet?.spendMode]);

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

  const displayName = user?.firstName
    ? `${user.firstName}'s Wallet`
    : "My AI Wallet";

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
      <header className="mb-6">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="text-3xl md:text-4xl font-display font-bold text-foreground">
          {displayName}
        </motion.h1>
        <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="text-muted-foreground mt-1">
          Your AI spending, optimized and in control.
        </motion.p>
      </header>

      {/* ── Wallet Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="relative rounded-3xl overflow-hidden mb-6"
        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #1e1b4b 60%, #0f172a 100%)" }}
      >
        <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/25 rounded-full blur-[60px] translate-x-1/3 translate-y-1/3 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/3 pointer-events-none" />

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white/80" />
              </div>
              <span className="text-xs font-bold tracking-widest text-white/50 uppercase">AI Spend Wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${activeMode.color}`}>
                {activeMode.label} Mode
              </span>
              <Wallet className="w-5 h-5 text-white/30" />
            </div>
          </div>

          <div className="mb-8">
            <p className="text-sm text-white/50 mb-1 font-medium tracking-wide">Balance</p>
            <div className="text-5xl md:text-6xl font-display font-black text-white tracking-tight">
              $<AnimatedNumber value={balance} decimals={1} />
            </div>
            <p className="text-sm text-white/40 mt-1">this month's spend</p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 pt-5 border-t border-white/10 items-end">
            <div>
              <p className="text-[10px] text-white/40 mb-0.5 font-medium uppercase tracking-wider">Available Budget</p>
              <p className="text-xl font-bold text-white">${Math.max(0, budget - balance).toFixed(1)}</p>
            </div>
            <div className="w-px bg-white/10 self-stretch hidden sm:block" />
            <div>
              <p className="text-[10px] text-white/40 mb-0.5 font-medium uppercase tracking-wider">Total Saved</p>
              <p className="text-xl font-bold text-emerald-400">
                +$<AnimatedNumber value={totalSaved} decimals={1} />
              </p>
            </div>
            <div className="w-px bg-white/10 self-stretch hidden sm:block" />
            <div>
              <p className="text-[10px] text-white/40 mb-0.5 font-medium uppercase tracking-wider">Smart Spend Mode</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <p className="text-sm font-semibold text-emerald-400">Active</p>
              </div>
            </div>
            <div className="ml-auto">
              <motion.button
                onClick={handleOptimize}
                disabled={isOptimizing}
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.03 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/12 hover:bg-white/20 border border-white/25 text-white text-sm font-semibold transition-colors disabled:opacity-60 backdrop-blur-sm"
              >
                {isOptimizing ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Optimizing...</>
                ) : (
                  <><Zap className="w-3.5 h-3.5" />Optimize Wallet</>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Spend Mode Selector ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-panel rounded-2xl p-5 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Spend Mode</p>
          <span className="text-xs text-muted-foreground">— affects routing & savings projection</span>
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
          icon={<Wallet className="w-4 h-4" />} />
        <StatCard delay={0.3} title="Avg Cost / Request"
          value={`$${isSimulated ? (projSpend / data.totalRequests).toFixed(3) : data.avgCost.toFixed(3)}`}
          trend={{ value: isSimulated ? `-${(((data.avgCost - projSpend / data.totalRequests) / data.avgCost) * 100).toFixed(1)}%` : "-4.2%", isPositive: true }} />
        <StatCard delay={0.4} title="Top Tool" value={data.topTool}
          icon={<BrainCircuit className="w-4 h-4" />}
          className="whitespace-nowrap overflow-hidden text-ellipsis" />
      </div>

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
          {data.savingsInsights.topSavings.map(item => (
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
              <p className="text-xl font-bold text-red-400">{formatCurrency(data.savingsInsights.wastedSpend)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">requests that could be cheaper</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20">
            <div className="p-2 rounded-lg text-primary bg-primary/10 flex-shrink-0"><Lightbulb className="w-4 h-4" /></div>
            <div>
              <p className="text-sm font-medium text-primary mb-1">Recommendation</p>
              <p className="text-sm text-foreground leading-relaxed">{data.savingsInsights.recommendation}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Transactions ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}
        className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-display font-bold text-foreground">Transactions</h2>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {transactions.length}/10
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Live
          </div>
        </div>

        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {transactions.map(tx => {
              const isSave  = tx.type === "optimization";
              const isMode  = tx.type === "mode_switch";
              const isSpend = tx.type === "usage";
              return (
                <motion.div key={tx.id}
                  initial={{ opacity: 0, y: -12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-card/30 border border-border/30 hover:bg-card/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isSave ? "bg-success/15 text-success" : isMode ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                    }`}>
                      {isSave  && <ArrowDownRight className="w-4 h-4" />}
                      {isMode  && <Sparkles className="w-4 h-4" />}
                      {isSpend && <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground leading-snug">{tx.label}</p>
                      <p className="text-xs text-muted-foreground">{formatRelTime(tx.timestamp)}</p>
                    </div>
                  </div>
                  {tx.amount !== 0 ? (
                    <div className={`text-sm font-bold font-mono flex items-center gap-0.5 ${isSave ? "text-success" : "text-muted-foreground"}`}>
                      {isSave  && <span className="text-success">+</span>}
                      {isSpend && <span className="text-red-400/80">-</span>}
                      <span className={isSpend ? "text-red-400" : undefined}>
                        ${Math.abs(tx.amount).toFixed(2)}
                      </span>
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
              No transactions yet — click Optimize Wallet to start.
            </div>
          )}
        </div>
      </motion.div>
    </Shell>
  );
}
