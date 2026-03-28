import { Shell } from "@/components/layout/Shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BellRing, ShieldAlert, TrendingUp, AlertTriangle,
  TrendingDown, CheckCircle2, Calendar, DollarSign,
  Flame, Zap, CircleCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthContext } from "@/App";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlySummary {
  thisMonth: number;
  lastMonth: number;
  momChangePercent: number;
  dailyAverage: number;
}

interface DailyEntry {
  day: string;
  total_cost: number;
}

type AlertLevel = "critical" | "warning" | "spike" | "ok";

interface LiveAlert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  icon: React.ElementType;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useMonthlySummary() {
  return useQuery<MonthlySummary>({
    queryKey: ["/api/costs/monthly-summary"],
    queryFn: async () => {
      const res = await fetch("/api/costs/monthly-summary", { credentials: "include" });
      if (!res.ok) return { thisMonth: 0, lastMonth: 0, momChangePercent: 0, dailyAverage: 0 };
      return res.json() as Promise<MonthlySummary>;
    },
    refetchInterval: 30_000,
  });
}

function useDailySpend() {
  return useQuery<DailyEntry[]>({
    queryKey: ["/api/costs/daily"],
    queryFn: async () => {
      const res = await fetch("/api/costs/daily", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.daily ?? []);
    },
    refetchInterval: 30_000,
  });
}

// ─── Alert derivation (pure, client-side) ─────────────────────────────────────

function deriveAlerts(
  summary: MonthlySummary | undefined,
  todaySpend: number,
  budget: number,
): LiveAlert[] {
  if (!summary) return [];

  const alerts: LiveAlert[] = [];
  const spend     = summary.thisMonth;
  const dailyAvg  = summary.dailyAverage;
  const budgetPct = budget > 0 ? (spend / budget) * 100 : 0;

  // ── Critical: > $100 ──────────────────────────────────────────────────────
  if (spend > 100) {
    alerts.push({
      id: "critical-spend",
      level: "critical",
      title: "Critical Spend Level",
      message: `Monthly spend $${spend.toFixed(2)} has exceeded the $100 critical threshold. Immediate action recommended.`,
      icon: ShieldAlert,
    });
  } else if (spend > 50) {
    // ── Warning: > $50 ──────────────────────────────────────────────────────
    alerts.push({
      id: "warning-spend",
      level: "warning",
      title: "High Monthly Spend",
      message: `Monthly spend $${spend.toFixed(2)} has crossed the $50 warning threshold.`,
      icon: AlertTriangle,
    });
  }

  // ── Spend spike: today > dailyAvg × 2 ────────────────────────────────────
  if (dailyAvg > 0 && todaySpend > dailyAvg * 2) {
    const mult = (todaySpend / dailyAvg).toFixed(1);
    alerts.push({
      id: "spike",
      level: "spike",
      title: "Spend Spike Detected",
      message: `Today's spend ($${todaySpend.toFixed(4)}) is ${mult}× the daily average ($${dailyAvg.toFixed(4)}).`,
      icon: Flame,
    });
  }

  // ── Budget 80% warning ───────────────────────────────────────────────────
  if (budgetPct >= 100) {
    alerts.push({
      id: "budget-exceeded",
      level: "critical",
      title: "Budget Limit Exceeded",
      message: `Spend has exceeded your $${budget.toFixed(2)} monthly budget (${budgetPct.toFixed(1)}% used).`,
      icon: BellRing,
    });
  } else if (budgetPct >= 80) {
    alerts.push({
      id: "budget-warning",
      level: "warning",
      title: "Approaching Budget Limit",
      message: `You've used ${budgetPct.toFixed(1)}% of your $${budget.toFixed(2)} monthly budget.`,
      icon: BellRing,
    });
  }

  // ── On track: below 50% of last month ───────────────────────────────────
  if (alerts.length === 0) {
    const reference = summary.lastMonth > 0 ? summary.lastMonth : dailyAvg * 30;
    if (reference > 0 && spend < reference * 0.5) {
      alerts.push({
        id: "on-track",
        level: "ok",
        title: "On Track",
        message: `Spend is ${((spend / reference) * 100).toFixed(0)}% of last month's total — well within budget.`,
        icon: CircleCheck,
      });
    }
  }

  return alerts;
}

// ─── Alert level styles ───────────────────────────────────────────────────────

const LEVEL_STYLES: Record<AlertLevel, {
  border: string;
  icon: string;
  badge: string;
  badgeText: string;
  glow: string;
  label: string;
}> = {
  critical: {
    border:    "border-destructive/40",
    icon:      "bg-destructive/20 text-destructive",
    badge:     "bg-destructive/15",
    badgeText: "text-destructive",
    glow:      "shadow-[0_0_24px_rgba(239,68,68,0.08)]",
    label:     "Critical",
  },
  warning: {
    border:    "border-yellow-500/40",
    icon:      "bg-yellow-500/20 text-yellow-400",
    badge:     "bg-yellow-500/15",
    badgeText: "text-yellow-400",
    glow:      "shadow-[0_0_24px_rgba(234,179,8,0.08)]",
    label:     "Warning",
  },
  spike: {
    border:    "border-orange-500/40",
    icon:      "bg-orange-500/20 text-orange-400",
    badge:     "bg-orange-500/15",
    badgeText: "text-orange-400",
    glow:      "shadow-[0_0_24px_rgba(249,115,22,0.08)]",
    label:     "Spike",
  },
  ok: {
    border:    "border-success/25",
    icon:      "bg-success/20 text-success",
    badge:     "bg-success/15",
    badgeText: "text-success",
    glow:      "shadow-[0_0_24px_rgba(16,185,129,0.06)]",
    label:     "On Track",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({
  label, value, sub, loading,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      {loading ? (
        <Skeleton className="h-5 w-20" />
      ) : (
        <div className="text-right">
          <span className="text-sm font-semibold text-foreground">{value}</span>
          {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert, index }: { alert: LiveAlert; index: number }) {
  const s    = LEVEL_STYLES[alert.level];
  const Icon = alert.icon;
  return (
    <motion.div
      key={alert.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className={`glass-panel p-5 rounded-2xl border stat-card-premium ${s.border} ${s.glow}`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl mt-0.5 flex-shrink-0 ${s.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-foreground">{alert.title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge} ${s.badgeText}`}>
              {s.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{alert.message}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Alerts() {
  useAuthContext();

  const [budget,     setBudget]     = useState(100);
  const [inputValue, setInputValue] = useState("100");

  const { data: summary,   isLoading: summaryLoading } = useMonthlySummary();
  const { data: dailyData, isLoading: dailyLoading   } = useDailySpend();

  // Today's spend from daily array
  const todayKey   = new Date().toISOString().slice(0, 10);
  const todaySpend = useMemo(
    () => dailyData?.find(d => d.day.slice(0, 10) === todayKey)?.total_cost ?? 0,
    [dailyData, todayKey],
  );

  // Derive live alerts
  const alerts = useMemo(
    () => deriveAlerts(summary, todaySpend, budget),
    [summary, todaySpend, budget],
  );

  // Budget progress bar
  const budgetPct   = budget > 0 ? Math.min(((summary?.thisMonth ?? 0) / budget) * 100, 100) : 0;
  const barColor    =
    budgetPct >= 100 ? "bg-destructive" :
    budgetPct >= 80  ? "bg-yellow-500"  :
                       "bg-success";

  const handleBudgetBlur = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed > 0) setBudget(parsed);
    else setInputValue(String(budget));
  };

  const isLoading = summaryLoading || dailyLoading;

  const momUp    = (summary?.momChangePercent ?? 0) >= 0;
  const momIcon  = momUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
  const momColor = momUp ? "text-destructive" : "text-success";

  const noSpendData = !summaryLoading && !summary?.thisMonth && !summary?.lastMonth;

  return (
    <Shell>
      <header className="mb-8">
        <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight heading-gradient">
          Alert Rules
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Real-time spend alerts based on your actual API usage data.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* ── Left: Live alert feed ── */}
        <div className="lg:col-span-3 space-y-4">

          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em]">
              Live Alerts
            </h2>
            {!isLoading && (
              <span className="text-xs text-muted-foreground">
                {alerts.filter(a => a.level !== "ok").length} active ·{" "}
                <span className="text-muted-foreground/60">
                  refreshes every 30s
                </span>
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="glass-panel p-5 rounded-2xl border border-border/40">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AnimatePresence mode="sync">
              {alerts.length > 0 ? (
                alerts.map((alert, i) => (
                  <AlertCard key={alert.id} alert={alert} index={i} />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="glass-panel p-10 rounded-2xl border border-success/20 stat-card-premium flex flex-col items-center justify-center text-center"
                >
                  <div className="p-4 bg-success/15 rounded-2xl mb-4">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    No alerts — you're spending efficiently
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    All spend thresholds are within normal ranges. Keep up the great work!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* ── Alert threshold reference ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel p-5 rounded-2xl border border-border/40 mt-2"
          >
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Alert thresholds
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                { dot: "bg-success",         label: "On Track",        rule: "Spend < 50% of last month" },
                { dot: "bg-yellow-500",       label: "Warning",         rule: "Monthly spend > $50" },
                { dot: "bg-orange-400",       label: "Spike",           rule: "Today > 2× daily average" },
                { dot: "bg-destructive",      label: "Critical",        rule: "Monthly spend > $100" },
              ].map(({ dot, label, rule }) => (
                <div key={label} className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dot}`} />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground/70">{rule}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Right: Budget + Monthly Summary ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── Custom Budget Panel ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={`glass-panel p-6 rounded-2xl border transition-colors duration-300 stat-card-premium ${
              budgetPct >= 100 ? "border-destructive/40" :
              budgetPct >= 80  ? "border-yellow-500/30"  :
                                 "border-border/40"
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className={`w-4 h-4 ${budgetPct >= 80 ? "text-yellow-400" : "text-primary"}`} />
              <h2 className="font-display font-bold text-base">Monthly Budget</h2>
            </div>

            {/* Budget input */}
            <div className="flex items-center gap-3 mb-4">
              <label className="text-xs text-muted-foreground whitespace-nowrap flex-1">
                Budget limit ($)
              </label>
              <input
                type="number"
                min="1"
                step="10"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onBlur={handleBudgetBlur}
                onKeyDown={e => e.key === "Enter" && handleBudgetBlur()}
                className="w-28 bg-secondary border border-border/50 rounded-lg px-3 py-1.5 text-sm text-foreground text-right focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                {summaryLoading ? (
                  <Skeleton className="h-3 w-28" />
                ) : (
                  <span>
                    ${(summary?.thisMonth ?? 0).toFixed(4)} of ${budget.toFixed(2)}
                  </span>
                )}
                {summaryLoading ? (
                  <Skeleton className="h-3 w-10" />
                ) : (
                  <span className={budgetPct >= 80 ? "font-bold text-yellow-400" : ""}>
                    {budgetPct.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                {summaryLoading ? (
                  <Skeleton className="h-full w-full rounded-full" />
                ) : (
                  <motion.div
                    className={`h-full rounded-full transition-colors duration-500 ${barColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${budgetPct}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                )}
              </div>
            </div>

            {/* Budget status */}
            {!summaryLoading && (
              <div className={`flex items-center gap-2 text-sm font-medium ${
                budgetPct >= 100 ? "text-destructive" :
                budgetPct >= 80  ? "text-yellow-400"  :
                                   "text-success"
              }`}>
                {budgetPct >= 100 ? (
                  <><AlertTriangle className="w-4 h-4" /> Budget exceeded</>
                ) : budgetPct >= 80 ? (
                  <><AlertTriangle className="w-4 h-4" /> Approaching limit — {(100 - budgetPct).toFixed(1)}% remaining</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Within budget</>
                )}
              </div>
            )}

            {/* Today's spend row */}
            {!dailyLoading && todaySpend > 0 && (
              <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Today's spend</span>
                <span className={`text-xs font-semibold tabular-nums ${
                  summary && summary.dailyAverage > 0 && todaySpend > summary.dailyAverage * 2
                    ? "text-orange-400"
                    : "text-foreground"
                }`}>
                  ${todaySpend.toFixed(4)}
                  {summary && summary.dailyAverage > 0 && todaySpend > summary.dailyAverage * 2 && (
                    <span className="ml-1 text-orange-400/70">↑ spike</span>
                  )}
                </span>
              </div>
            )}
          </motion.div>

          {/* ── Monthly Summary ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-6 rounded-2xl border border-border/40 stat-card-premium"
          >
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-primary" />
              <h2 className="font-display font-bold text-base">Monthly Summary</h2>
            </div>

            {noSpendData ? (
              <div className="py-6 text-center">
                <DollarSign className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No data yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Run some AI tasks to see spend here.
                </p>
              </div>
            ) : (
              <>
                <StatRow
                  label="This month"
                  value={summaryLoading ? "" : `$${(summary?.thisMonth ?? 0).toFixed(4)}`}
                  loading={summaryLoading}
                />
                <StatRow
                  label="Last month"
                  value={summaryLoading ? "" : `$${(summary?.lastMonth ?? 0).toFixed(4)}`}
                  loading={summaryLoading}
                />
                <StatRow
                  label="Month-over-month"
                  value={
                    summaryLoading ? "" :
                    summary?.lastMonth === 0 ? "—" :
                    `${momUp ? "+" : ""}${summary?.momChangePercent.toFixed(1)}%`
                  }
                  sub={
                    !summaryLoading && summary?.lastMonth !== 0 ? (
                      <span className={`flex items-center gap-1 justify-end ${momColor}`}>
                        {momIcon}
                        {momUp ? "higher than last month" : "lower than last month"}
                      </span>
                    ) : undefined
                  }
                  loading={summaryLoading}
                />
                <StatRow
                  label="Daily average"
                  value={summaryLoading ? "" : `$${(summary?.dailyAverage ?? 0).toFixed(4)}`}
                  loading={summaryLoading}
                />
                <StatRow
                  label="Today"
                  value={dailyLoading ? "" : `$${todaySpend.toFixed(4)}`}
                  loading={dailyLoading}
                  sub={
                    !dailyLoading && summary && summary.dailyAverage > 0 ? (
                      <span className={`${todaySpend > summary.dailyAverage * 2 ? "text-orange-400" : "text-muted-foreground"}`}>
                        {todaySpend > 0
                          ? `${((todaySpend / summary.dailyAverage) * 100).toFixed(0)}% of daily avg`
                          : "no spend today"}
                      </span>
                    ) : undefined
                  }
                />
              </>
            )}
          </motion.div>

        </div>
      </div>
    </Shell>
  );
}
