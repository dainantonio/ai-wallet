import { Shell } from "@/components/layout/Shell";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BellRing, ShieldAlert, TrendingUp, AlertTriangle,
  TrendingDown, CheckCircle2, Calendar, DollarSign,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuthContext } from "@/App";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertRule {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

interface MonthlySummary {
  thisMonth: number;
  lastMonth: number;
  momChangePercent: number;
  dailyAverage: number;
}

interface AlertCheckResult {
  currentSpend: number;
  threshold: number;
  exceeded: boolean;
  percentUsed: number;
}

// ─── Static alert rule definitions ───────────────────────────────────────────

const RULES: AlertRule[] = [
  {
    id: "budget",
    title: "Budget Threshold",
    description: "Trigger alert when monthly spend exceeds your configured budget limit.",
    icon: BellRing,
  },
  {
    id: "spike",
    title: "Cost Spike Detection",
    description: "Detect unusual >50% hour-over-hour cost increases across any model.",
    icon: TrendingUp,
  },
  {
    id: "drift",
    title: "Model Cost Drift",
    description: "Alert when a specific provider changes pricing or average latency degrades.",
    icon: ShieldAlert,
  },
];

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

function useAlertCheck(threshold: number) {
  return useQuery<AlertCheckResult>({
    queryKey: ["/api/costs/alert-check", threshold],
    queryFn: async () => {
      const res = await fetch("/api/costs/alert-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ threshold }),
      });
      if (!res.ok) return { currentSpend: 0, threshold, exceeded: false, percentUsed: 0 };
      return res.json() as Promise<AlertCheckResult>;
    },
    refetchInterval: 30_000,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  sub,
  loading,
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Alerts() {
  useAuthContext(); // ensures we're inside the auth context

  const [activeAlerts, setActiveAlerts] = useState<Record<string, boolean>>({
    budget: true,
    spike: true,
    drift: false,
  });

  const [threshold, setThreshold] = useState(100);
  const [inputValue, setInputValue] = useState("100");

  const { data: summary, isLoading: summaryLoading } = useMonthlySummary();
  const { data: alertCheck, isLoading: alertLoading } = useAlertCheck(threshold);

  const toggleAlert = (id: string) => {
    setActiveAlerts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleThresholdBlur = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed > 0) setThreshold(parsed);
    else setInputValue(String(threshold));
  };

  const noData = !summaryLoading && summary?.thisMonth === 0 && summary?.lastMonth === 0;

  const momUp   = (summary?.momChangePercent ?? 0) >= 0;
  const momIcon = momUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
  const momColor = momUp ? "text-destructive" : "text-success";

  const barPct = Math.min(alertCheck?.percentUsed ?? 0, 100);
  const barColor =
    barPct >= 100 ? "bg-destructive" :
    barPct >= 80  ? "bg-yellow-500"  :
                    "bg-success";

  return (
    <Shell>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Alert Rules</h1>
        <p className="text-muted-foreground mt-2">
          Configure proactive notifications to prevent budget overruns.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* ── Left: alert rule toggles (unchanged logic) ── */}
        <div className="lg:col-span-3 space-y-4">
          {RULES.map((rule, i) => {
            const isActive = activeAlerts[rule.id];
            const Icon = rule.icon;
            return (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`glass-panel p-6 rounded-2xl flex items-center justify-between border transition-all duration-300 ${
                  isActive
                    ? "border-success/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                    : "border-border/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl mt-1 transition-colors duration-300 ${
                      isActive
                        ? "bg-success/20 text-success"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3
                      className={`text-lg font-bold transition-colors ${
                        isActive ? "text-white" : "text-foreground"
                      }`}
                    >
                      {rule.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md leading-relaxed">
                      {rule.description}
                    </p>
                  </div>
                </div>
                <div className="ml-4">
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => toggleAlert(rule.id)}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Right: real data panel ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Monthly summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-6 rounded-2xl border border-border/50"
          >
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-primary" />
              <h2 className="font-display font-bold text-base">Monthly Summary</h2>
            </div>

            {noData ? (
              <div className="py-6 text-center">
                <DollarSign className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No data yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Run some AI tasks to see spend here.
                </p>
              </div>
            ) : (
              <div>
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
                    summaryLoading
                      ? ""
                      : summary?.lastMonth === 0
                        ? "—"
                        : `${momUp ? "+" : ""}${summary?.momChangePercent.toFixed(1)}%`
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
              </div>
            )}
          </motion.div>

          {/* Alert check */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`glass-panel p-6 rounded-2xl border transition-colors duration-300 ${
              alertCheck?.exceeded
                ? "border-destructive/40"
                : "border-border/50"
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle
                className={`w-4 h-4 ${alertCheck?.exceeded ? "text-destructive" : "text-muted-foreground"}`}
              />
              <h2 className="font-display font-bold text-base">Budget Alert Check</h2>
            </div>

            {/* Threshold input */}
            <div className="flex items-center gap-2 mb-4">
              <label className="text-xs text-muted-foreground whitespace-nowrap">
                Monthly threshold ($)
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleThresholdBlur}
                onKeyDown={(e) => e.key === "Enter" && handleThresholdBlur()}
                className="w-24 ml-auto bg-secondary border border-border/50 rounded-lg px-3 py-1.5 text-sm text-foreground text-right focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                {alertLoading ? (
                  <Skeleton className="h-3 w-24" />
                ) : (
                  <span>
                    ${(alertCheck?.currentSpend ?? 0).toFixed(4)} of ${threshold.toFixed(2)}
                  </span>
                )}
                {alertLoading ? (
                  <Skeleton className="h-3 w-10" />
                ) : (
                  <span>{(alertCheck?.percentUsed ?? 0).toFixed(1)}%</span>
                )}
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                {alertLoading ? (
                  <Skeleton className="h-full w-full rounded-full" />
                ) : (
                  <motion.div
                    className={`h-full rounded-full ${barColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${barPct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                )}
              </div>
            </div>

            {/* Status badge */}
            {!alertLoading && (
              <div
                className={`flex items-center gap-2 text-sm font-medium mt-3 ${
                  alertCheck?.exceeded ? "text-destructive" : "text-success"
                }`}
              >
                {alertCheck?.exceeded ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    Threshold exceeded — consider reducing spend
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Within budget
                  </>
                )}
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </Shell>
  );
}
