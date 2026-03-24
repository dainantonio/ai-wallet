import { useState, useEffect, useRef } from "react";
import { Shell } from "@/components/layout/Shell";
import { StatCard } from "@/components/ui/StatCard";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import { Switch } from "@/components/ui/switch";
import { useUsageData, useOptimize } from "@/hooks/use-app-data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  Wallet, BrainCircuit, Sparkles, Zap,
  TrendingDown, ArrowRightLeft, Database, Scissors,
  Lightbulb, AlertTriangle, FlaskConical, ChevronRight,
  MessageSquare, Image, Bot, Target, CheckCircle2,
  TriangleAlert, XCircle, Gauge, Leaf, Flame,
  CreditCard, Receipt,
} from "lucide-react";
import { motion, animate as motionAnimate } from "framer-motion";

// ─── Animated counter ────────────────────────────────────────────────────────
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
      onUpdate(v) {
        if (ref.current) ref.current.textContent = prefix + v.toFixed(decimals) + suffix;
      },
    });
    return () => ctrl.stop();
  }, [value, prefix, suffix, decimals]);

  return <span ref={ref}>{prefix}{value.toFixed(decimals)}{suffix}</span>;
}

// ─── Spend modes ─────────────────────────────────────────────────────────────
type SpendMode = "saver" | "balanced" | "performance";

const MODES: { id: SpendMode; label: string; desc: string; icon: React.ReactNode; switchPct: number; color: string }[] = [
  { id: "saver",       label: "Saver",       desc: "Max savings, slight latency increase", icon: <Leaf className="w-4 h-4" />,  switchPct: 0.50, color: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10" },
  { id: "balanced",    label: "Balanced",    desc: "Smart mix of cost and performance",    icon: <Gauge className="w-4 h-4" />, switchPct: 0.30, color: "text-primary border-primary/40 bg-primary/10" },
  { id: "performance", label: "Performance", desc: "Best models, full speed",             icon: <Flame className="w-4 h-4" />, switchPct: 0.00, color: "text-orange-400 border-orange-400/40 bg-orange-400/10" },
];

const GPT4O_COST_PER_REQ = 0.0665;
const MINI_COST_PER_REQ  = 0.0166;
const GPT4O_REQUESTS     = 1240;

function applyMode(data: {
  totalSpend: number; savings: number; savingsPercent: number;
  autopilotSaved: number; credits: number; avgCost: number; totalRequests: number;
}, switchPct: number) {
  const switched   = Math.round(GPT4O_REQUESTS * switchPct);
  const extraSaved = switched * (GPT4O_COST_PER_REQ - MINI_COST_PER_REQ);
  const newSpend   = data.totalSpend - extraSaved;
  const newSavings = data.savings + extraSaved;
  const originalTotal = data.totalSpend + data.savings;
  return {
    totalSpend:     newSpend,
    savings:        newSavings,
    savingsPercent: +((newSavings / originalTotal) * 100).toFixed(1),
    autopilotSaved: data.autopilotSaved + extraSaved,
    credits:        data.credits + extraSaved,
    avgCost:        +(newSpend / data.totalRequests).toFixed(4),
    extraSaved,
    switched,
  };
}

// ─── Spend categories ─────────────────────────────────────────────────────────
const SPEND_CATEGORIES = [
  { label: "Writing & Chat",    description: "Drafts, summaries, Q&A",       icon: <MessageSquare className="w-4 h-4" />, pct: 48, amount: 76.10, color: "bg-blue-400",    textColor: "text-blue-400" },
  { label: "Image Generation",  description: "Visuals, thumbnails, assets",   icon: <Image className="w-4 h-4" />,        pct: 31, amount: 49.10, color: "bg-violet-400",  textColor: "text-violet-400" },
  { label: "Automation",        description: "Pipelines, agents, scripts",    icon: <Bot className="w-4 h-4" />,          pct: 21, amount: 33.30, color: "bg-emerald-400", textColor: "text-emerald-400" },
];

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

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Home() {
  const { data, isLoading } = useUsageData();
  const { mutate: optimize, isPending } = useOptimize();
  const [spendMode, setSpendMode] = useState<SpendMode>("balanced");
  const [budget, setBudget] = useState(200);
  const [budgetInput, setBudgetInput] = useState("200");
  const [editingBudget, setEditingBudget] = useState(false);

  if (isLoading || !data) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      </Shell>
    );
  }

  const activeMode  = MODES.find(m => m.id === spendMode)!;
  const sim         = applyMode(data, activeMode.switchPct);
  const isSimulated = spendMode !== "performance";
  const display     = isSimulated ? sim : data;
  const insights    = data.savingsInsights;

  // Budget
  const spend   = display.totalSpend;
  const usedPct = Math.min((spend / budget) * 100, 100);
  const budgetStatus =
    usedPct >= 90
      ? { label: "You've hit your limit",     icon: <XCircle className="w-4 h-4" />,      color: "text-red-400",    barColor: "bg-red-400",    bg: "bg-red-400/8 border-red-400/25" }
      : usedPct >= 70
      ? { label: "You're close to your limit", icon: <TriangleAlert className="w-4 h-4" />, color: "text-yellow-400", barColor: "bg-yellow-400", bg: "bg-yellow-400/8 border-yellow-400/25" }
      : { label: "You're on track",            icon: <CheckCircle2 className="w-4 h-4" />,  color: "text-success",    barColor: "bg-success",    bg: "bg-success/8 border-success/25" };

  const commitBudget = () => {
    const v = parseFloat(budgetInput);
    if (!isNaN(v) && v > 0) setBudget(v);
    else setBudgetInput(String(budget));
    setEditingBudget(false);
  };

  return (
    <Shell>
      <header className="mb-6">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="text-3xl md:text-4xl font-display font-bold text-foreground">
          AI Wallet
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
        transition={{ duration: 0.5 }}
        className="relative rounded-3xl overflow-hidden mb-6"
        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #1e1b4b 60%, #0f172a 100%)" }}
      >
        {/* Glow layers */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/25 rounded-full blur-[60px] translate-x-1/3 translate-y-1/3 pointer-events-none" />
        {/* Shimmer stripe */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/3 pointer-events-none" />

        <div className="relative z-10 p-6 md:p-8">
          {/* Card header row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                <CreditCard className="w-4 h-4 text-white/80" />
              </div>
              <span className="text-xs font-bold tracking-widest text-white/50 uppercase">AI Spend Wallet</span>
            </div>
            <div className="flex items-center gap-2">
              {isSimulated && (
                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-xs font-semibold text-indigo-300 bg-indigo-400/15 border border-indigo-400/30 px-2.5 py-1 rounded-full">
                  {activeMode.label} Mode
                </motion.span>
              )}
              <Wallet className="w-5 h-5 text-white/40" />
            </div>
          </div>

          {/* Balance */}
          <div className="mb-8">
            <p className="text-sm text-white/50 mb-1 font-medium tracking-wide">Balance</p>
            <div className="text-5xl md:text-6xl font-display font-black text-white tracking-tight">
              $<AnimatedNumber value={display.totalSpend} decimals={1} />
            </div>
            <p className="text-sm text-white/40 mt-1">this month's spend</p>
          </div>

          {/* Bottom stats row */}
          <div className="flex flex-wrap gap-4 pt-5 border-t border-white/10">
            <div>
              <p className="text-xs text-white/40 mb-0.5 font-medium uppercase tracking-wide">Available Budget</p>
              <p className="text-xl font-bold text-white">
                ${(budget - spend > 0 ? budget - spend : 0).toFixed(1)}
              </p>
            </div>
            <div className="w-px bg-white/10 self-stretch" />
            <div>
              <p className="text-xs text-white/40 mb-0.5 font-medium uppercase tracking-wide">Total Saved</p>
              <p className="text-xl font-bold text-emerald-400">
                +$<AnimatedNumber value={display.autopilotSaved} decimals={1} />
              </p>
            </div>
            <div className="w-px bg-white/10 self-stretch" />
            <div>
              <p className="text-xs text-white/40 mb-0.5 font-medium uppercase tracking-wide">Smart Spend Mode</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <p className="text-sm font-semibold text-emerald-400">Active</p>
              </div>
            </div>
            <div className="ml-auto self-end">
              <button
                onClick={() => optimize()}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 backdrop-blur-sm"
              >
                {isPending ? (
                  <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Optimizing...</>
                ) : (
                  <><Zap className="w-3.5 h-3.5" />Optimize Wallet</>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Spend Modes ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-panel rounded-2xl p-5 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Spend Mode</p>
          <span className="text-xs text-muted-foreground ml-1">— affects routing & savings projection</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {MODES.map((mode) => {
            const active = spendMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSpendMode(mode.id)}
                className={`relative rounded-xl border p-3 text-left transition-all duration-200 ${
                  active ? mode.color : "border-border/40 bg-secondary/30 text-muted-foreground hover:border-border hover:bg-secondary/60"
                }`}
              >
                {active && (
                  <motion.div layoutId="mode-active"
                    className="absolute inset-0 rounded-xl border-2 border-current opacity-30"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="flex items-center gap-2 mb-1">
                  {mode.icon}
                  <span className="text-sm font-bold">{mode.label}</span>
                </div>
                <p className="text-xs opacity-70 leading-snug">{mode.desc}</p>
                {active && mode.switchPct > 0 && (
                  <p className="text-xs font-semibold mt-2 flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    Routing {Math.round(mode.switchPct * 100)}% to mini
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* Impact preview row when not performance mode */}
        {isSimulated && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.25 }}
            className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 md:grid-cols-4 gap-2"
          >
            {[
              { label: "Projected Balance", value: formatCurrency(sim.totalSpend),   delta: `-${formatCurrency(sim.extraSaved)}` },
              { label: "Total Saved",       value: formatCurrency(sim.savings),      delta: `+${formatCurrency(sim.extraSaved)}` },
              { label: "Savings Rate",      value: `${sim.savingsPercent}%`,         delta: `+${(sim.savingsPercent - data.savingsPercent).toFixed(1)}%` },
              { label: "Requests Re-routed", value: formatNumber(sim.switched),     delta: "to mini" },
            ].map((item) => (
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
          value={`$${display.credits.toFixed(1)}`}
          icon={<Wallet className="w-4 h-4" />} />
        <StatCard delay={0.3} title="Avg Cost / Request"
          value={`$${display.avgCost.toFixed(3)}`}
          trend={{ value: isSimulated ? `-${(((data.avgCost - sim.avgCost) / data.avgCost) * 100).toFixed(1)}%` : "-4.2%", isPositive: true }} />
        <StatCard delay={0.4} title="Top Tool"
          value={data.topTool}
          icon={<BrainCircuit className="w-4 h-4" />}
          className="whitespace-nowrap overflow-hidden text-ellipsis" />
      </div>

      {/* ── Monthly Budget ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.41 }}
        className={`glass-panel rounded-2xl p-6 mb-6 border transition-colors duration-500 ${budgetStatus.bg}`}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-secondary ${budgetStatus.color}`}>
              <Target className="w-4 h-4" />
            </div>
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
                  onChange={(e) => setBudgetInput(e.target.value)}
                  onBlur={commitBudget}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitBudget();
                    if (e.key === "Escape") { setBudgetInput(String(budget)); setEditingBudget(false); }
                  }}
                  className="w-24 text-sm font-semibold bg-secondary border border-border rounded-lg px-2.5 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
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
            <span>{formatCurrency(spend)} used</span>
            <span>{formatCurrency(budget - spend > 0 ? budget - spend : 0)} remaining</span>
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
              — {formatCurrency(budget - spend)} left this month
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Where money is going ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
        className="glass-panel rounded-2xl p-6 mb-6"
      >
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
              transition={{ delay: 0.48 + i * 0.08 }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${cat.textColor}`} style={{ background: "currentColor" }}>
                    <span style={{ color: "white" }}>{cat.icon}</span>
                  </div>
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
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="glass-panel rounded-2xl p-6 mb-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <TrendingDown className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display font-bold text-foreground">Savings Insights</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {insights.topSavings.map((item, i) => (
            <motion.div key={item.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-secondary/40 border border-border/40">
              <div className={`p-2 rounded-lg flex-shrink-0 ${categoryColor(item.category)}`}>
                {categoryIcon(item.category)}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground leading-snug">{item.label}</p>
                <p className="text-lg font-bold text-success mt-1">{formatCurrency(item.savedAmount)} saved</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/8 border border-red-500/20">
            <div className="p-2 rounded-lg text-red-400 bg-red-400/10 flex-shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estimated Wasted Spend</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(insights.wastedSpend)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">requests that could be cheaper</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20">
            <div className="p-2 rounded-lg text-primary bg-primary/10 flex-shrink-0">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary mb-1">Recommendation</p>
              <p className="text-sm text-foreground leading-relaxed">{insights.recommendation}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Transactions ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="glass-panel rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-display font-bold text-foreground">Transactions</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Live
          </div>
        </div>
        <ActivityFeed items={data.activity.slice(0, 5)} />
      </motion.div>
    </Shell>
  );
}
