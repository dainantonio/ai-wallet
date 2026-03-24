import { useState, useEffect, useRef, useCallback } from "react";
import { Shell } from "@/components/layout/Shell";
import { StatCard } from "@/components/ui/StatCard";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import { Switch } from "@/components/ui/switch";
import { useUsageData, useOptimize } from "@/hooks/use-app-data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  DollarSign, Wallet, BrainCircuit, Wand2, Zap,
  TrendingDown, ArrowRightLeft, Database, Scissors,
  Lightbulb, AlertTriangle, FlaskConical, ChevronRight,
  MessageSquare, Image, Bot, Target, CheckCircle2, TriangleAlert, XCircle,
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
      duration: 0.7,
      ease: "easeOut",
      onUpdate(v) {
        if (ref.current) {
          ref.current.textContent = prefix + v.toFixed(decimals) + suffix;
        }
      },
    });
    return () => ctrl.stop();
  }, [value, prefix, suffix, decimals]);

  return (
    <span ref={ref}>
      {prefix}{value.toFixed(decimals)}{suffix}
    </span>
  );
}

// ─── Simulation math ─────────────────────────────────────────────────────────
const SIM_SWITCH_PCT = 0.30;          // 30 % of GPT-4o routed to mini
const GPT4O_COST_PER_REQ = 0.0665;
const MINI_COST_PER_REQ  = 0.0166;
const GPT4O_REQUESTS     = 1240;

function applySimulation(data: {
  totalSpend: number; savings: number; savingsPercent: number;
  autopilotSaved: number; credits: number; avgCost: number; totalRequests: number;
}) {
  const switched   = Math.round(GPT4O_REQUESTS * SIM_SWITCH_PCT);        // 372
  const extraSaved = switched * (GPT4O_COST_PER_REQ - MINI_COST_PER_REQ); // ≈ $18.57
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

// ─── Spend category data ─────────────────────────────────────────────────────
const SPEND_CATEGORIES = [
  {
    label: "Writing & Chat",
    description: "Drafts, summaries, Q&A",
    icon: <MessageSquare className="w-4 h-4" />,
    pct: 48,
    amount: 76.10,
    color: "bg-blue-400",
    textColor: "text-blue-400",
  },
  {
    label: "Image Generation",
    description: "Visuals, thumbnails, assets",
    icon: <Image className="w-4 h-4" />,
    pct: 31,
    amount: 49.10,
    color: "bg-violet-400",
    textColor: "text-violet-400",
  },
  {
    label: "Automation",
    description: "Pipelines, agents, scripts",
    icon: <Bot className="w-4 h-4" />,
    pct: 21,
    amount: 33.30,
    color: "bg-emerald-400",
    textColor: "text-emerald-400",
  },
];

// ─── Animated bar ─────────────────────────────────────────────────────────────
function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
      />
    </div>
  );
}

// ─── Category helpers ─────────────────────────────────────────────────────────
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
  const [simEnabled, setSimEnabled] = useState(false);
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

  const sim = applySimulation(data);
  const display = simEnabled ? sim : data;
  const insights = data.savingsInsights;

  // Budget calculations
  const spend = display.totalSpend;
  const usedPct = Math.min((spend / budget) * 100, 100);
  const budgetStatus =
    usedPct >= 90
      ? { label: "You've hit your limit", icon: <XCircle className="w-4 h-4" />, color: "text-red-400", barColor: "bg-red-400", bg: "bg-red-400/8 border-red-400/25" }
      : usedPct >= 70
      ? { label: "You're close to your limit", icon: <TriangleAlert className="w-4 h-4" />, color: "text-yellow-400", barColor: "bg-yellow-400", bg: "bg-yellow-400/8 border-yellow-400/25" }
      : { label: "You're on track", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-success", barColor: "bg-success", bg: "bg-success/8 border-success/25" };

  const commitBudget = () => {
    const v = parseFloat(budgetInput);
    if (!isNaN(v) && v > 0) setBudget(v);
    else setBudgetInput(String(budget));
    setEditingBudget(false);
  };

  return (
    <Shell>
      <header className="mb-8">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl md:text-4xl font-display font-bold text-foreground"
        >
          Overview
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground mt-2"
        >
          Monitor your AI API spend and active optimizations.
        </motion.p>
      </header>

      {/* ── Simulation Control ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`mb-6 rounded-2xl border p-5 transition-colors duration-300 ${
          simEnabled
            ? "bg-primary/8 border-primary/30"
            : "glass-panel border-border/50"
        }`}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${simEnabled ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Cost Simulation</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Route {Math.round(SIM_SWITCH_PCT * 100)}% of GPT-4o requests to GPT-4o-mini
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-sm transition-colors ${simEnabled ? "text-primary font-medium" : "text-muted-foreground"}`}>
              {simEnabled ? "Simulation ON" : "Simulation OFF"}
            </span>
            <Switch checked={simEnabled} onCheckedChange={setSimEnabled} />
          </div>
        </div>

        {/* Projected impact row */}
        <motion.div
          initial={false}
          animate={{ height: simEnabled ? "auto" : 0, opacity: simEnabled ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="mt-4 pt-4 border-t border-primary/20 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Projected Spend", value: formatCurrency(sim.totalSpend), delta: `-${formatCurrency(sim.extraSaved)}`, good: true },
              { label: "Total Savings", value: formatCurrency(sim.savings), delta: `+${formatCurrency(sim.extraSaved)}`, good: true },
              { label: "Savings Rate", value: `${sim.savingsPercent}%`, delta: `+${(sim.savingsPercent - data.savingsPercent).toFixed(1)}%`, good: true },
              { label: "Requests Switched", value: formatNumber(sim.switched), delta: "to mini", good: true },
            ].map((item) => (
              <div key={item.label} className="bg-primary/8 rounded-xl px-3 py-2.5">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="text-base font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-success mt-0.5 flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />{item.delta}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Main Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Spend Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass-panel rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[220px]"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[60px] -translate-y-1/4 translate-x-1/4" />

          {simEnabled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-4 right-4 bg-primary/15 border border-primary/30 text-primary text-xs font-semibold px-2.5 py-1 rounded-full z-10"
            >
              Simulated
            </motion.div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-medium text-muted-foreground">This Month's Spend</h2>
            </div>
            <div className="text-5xl font-display font-bold text-white tracking-tight">
              $<AnimatedNumber value={display.totalSpend} decimals={1} />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-border/50 pt-4">
            <div>
              <p className="text-sm text-muted-foreground">Projected Savings</p>
              <p className="text-lg font-semibold text-success">
                <AnimatedNumber value={display.savingsPercent} decimals={1} suffix="%" />
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-lg font-semibold text-white">{formatNumber(data.totalRequests)}</p>
            </div>
          </div>
        </motion.div>

        {/* Autopilot Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-panel rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[220px] success-glow border-success/30"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent pointer-events-none" />

          <div className="relative z-10 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="w-5 h-5 text-success" />
                <h2 className="text-lg font-medium text-success">Autopilot Active</h2>
              </div>
              <p className="text-sm text-muted-foreground max-w-[200px]">
                Smart routing and semantic caching are optimizing your requests.
              </p>
            </div>
            <div className="w-3 h-3 rounded-full bg-success animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
          </div>

          <div className="relative z-10 mt-8 flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Saved by Autopilot</p>
              <div className="text-4xl font-display font-bold text-success tracking-tight">
                $<AnimatedNumber value={display.autopilotSaved} decimals={1} />
              </div>
            </div>
            <button
              onClick={() => optimize()}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Run Pass
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          delay={0.2}
          title="Available Credits"
          value={`$${display.credits.toFixed(1)}`}
          icon={<Wallet className="w-4 h-4" />}
        />
        <StatCard
          delay={0.3}
          title="Avg Cost / Request"
          value={`$${display.avgCost.toFixed(3)}`}
          trend={{ value: simEnabled ? `-${(((data.avgCost - sim.avgCost) / data.avgCost) * 100).toFixed(1)}%` : "-4.2%", isPositive: true }}
        />
        <StatCard
          delay={0.4}
          title="Top Tool"
          value={data.topTool}
          icon={<BrainCircuit className="w-4 h-4" />}
          className="whitespace-nowrap overflow-hidden text-ellipsis"
        />
      </div>

      {/* ── Monthly AI Budget ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.41 }}
        className={`glass-panel rounded-2xl p-6 mb-8 border transition-colors duration-500 ${budgetStatus.bg}`}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${budgetStatus.color} bg-current/10`}>
              <Target className="w-4 h-4" style={{ color: "inherit" }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Monthly AI Budget</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Track spend against your set limit</p>
            </div>
          </div>

          {/* Editable budget amount */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Budget:</span>
            {editingBudget ? (
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-foreground font-medium">$</span>
                <input
                  autoFocus
                  type="number"
                  min={1}
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  onBlur={commitBudget}
                  onKeyDown={(e) => { if (e.key === "Enter") commitBudget(); if (e.key === "Escape") { setBudgetInput(String(budget)); setEditingBudget(false); } }}
                  className="w-24 text-sm font-semibold bg-secondary border border-border rounded-lg px-2.5 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
            ) : (
              <button
                onClick={() => { setBudgetInput(String(budget)); setEditingBudget(true); }}
                className="text-sm font-semibold text-foreground bg-secondary hover:bg-secondary/80 border border-border rounded-lg px-3 py-1 transition-colors"
              >
                ${budget}/mo ✏️
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>{formatCurrency(spend)} used</span>
            <span>{formatCurrency(budget - spend > 0 ? budget - spend : 0)} remaining</span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-colors duration-500 ${budgetStatus.barColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${usedPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1.5">
            <span className="text-muted-foreground">$0</span>
            <span className="text-muted-foreground font-medium">{usedPct.toFixed(0)}% used</span>
            <span className="text-muted-foreground">{formatCurrency(budget)}</span>
          </div>
        </div>

        {/* Status message */}
        <div className={`flex items-center gap-2 text-sm font-medium ${budgetStatus.color}`}>
          {budgetStatus.icon}
          <span>{budgetStatus.label}</span>
          {usedPct < 70 && (
            <span className="text-xs text-muted-foreground font-normal ml-1">
              — {formatCurrency(budget - spend)} left for the month
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Where your money is going ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42 }}
        className="glass-panel rounded-2xl p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Where your AI money is going</h2>
            <p className="text-sm text-muted-foreground mt-1">This month's spend by use case</p>
          </div>
          <span className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">Simulated</span>
        </div>

        <div className="space-y-5">
          {SPEND_CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.48 + i * 0.08 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${cat.textColor} bg-current/10`} style={{ color: "inherit" }}>
                    <span className={cat.textColor}>{cat.icon}</span>
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="glass-panel rounded-2xl p-6 mb-8"
      >
        <div className="flex items-center gap-2 mb-6">
          <TrendingDown className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display font-bold text-foreground">Savings Insights</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {insights.topSavings.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-secondary/40 border border-border/40"
            >
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
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.74 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-red-500/8 border border-red-500/20"
          >
            <div className="p-2 rounded-lg text-red-400 bg-red-400/10 flex-shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estimated Wasted Spend</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(insights.wastedSpend)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">requests that could be cheaper</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.82 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20"
          >
            <div className="p-2 rounded-lg text-primary bg-primary/10 flex-shrink-0">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary mb-1">Recommendation</p>
              <p className="text-sm text-foreground leading-relaxed">{insights.recommendation}</p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Live Activity Feed ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-panel rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-foreground">Live Activity Feed</h2>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Polling Live
          </div>
        </div>
        <ActivityFeed items={data.activity.slice(0, 5)} />
      </motion.div>
    </Shell>
  );
}
