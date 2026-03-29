import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { useUsageData, useCostSummary } from "@/hooks/use-app-data";
import type { DailySpend, ModelSpend } from "@/hooks/use-app-data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Cpu, ServerCrash, Clock, TrendingDown, Database,
  CalendarDays, Zap, ArrowUpRight, Flame, Sparkles, Trophy,
  Download, Loader2, ChevronDown,
} from "lucide-react";
import { exportCostsCsv } from "@/lib/export";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ─── Custom recharts tooltip ──────────────────────────────────────────────────
interface TooltipProps { active?: boolean; payload?: { value: number; name: string }[]; label?: string; }
function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const cost  = payload.find(p => p.name === "total_cost");
  const saved = payload.find(p => p.name === "total_saved");
  return (
    <div className="bg-card border border-border/60 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="font-bold text-foreground mb-1.5">{label && fmtDay(label)}</p>
      {cost  && <p className="text-rose-500">Spent: <span className="font-mono font-bold">${cost.value.toFixed(4)}</span></p>}
      {saved && saved.value > 0 && <p className="text-emerald-500">Saved: <span className="font-mono font-bold">+${saved.value.toFixed(4)}</span></p>}
    </div>
  );
}

// ─── Color helper for cost bars ───────────────────────────────────────────────
function costBarColor(cost: number, max: number): string {
  if (max === 0 || cost === 0) return "rgba(16,185,129,0.55)";
  const ratio = cost / max;
  if (ratio < 0.33) return "rgba(16,185,129,0.80)";    // emerald-500 — low spend
  if (ratio < 0.67) return "rgba(245,158,11,0.80)";    // amber-500 — medium
  return "rgba(244,63,94,0.85)";                       // rose-500 — high spend
}

// ─── Daily Spend Chart ────────────────────────────────────────────────────────
function DailySpendChart({ data, isLoading }: { data: DailySpend[]; isLoading: boolean }) {
  const hasData = data.some(d => d.total_cost > 0);

  // Pad to a full 7-day window so we always show 7 bars
  const filled = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const match = data.find(r => r.day.slice(0, 10) === key);
    return match ?? { day: d.toISOString(), total_cost: 0, total_saved: 0, request_count: 0, input_tokens: 0, output_tokens: 0 };
  });

  const maxCost = Math.max(...filled.map(d => d.total_cost), 0);

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-display font-bold">Daily Spend</h2>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Last 7 days</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80 inline-block"/>Low</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/80 inline-block"/>Medium</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500/80 inline-block"/>High</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-400/70 inline-block"/>Saved</span>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[200px] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : !hasData ? (
        <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Database className="w-8 h-8 opacity-25" />
          <p className="text-sm font-medium">No cost data yet</p>
          <p className="text-xs opacity-50">Run AI tasks in the dashboard to see real spend here</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={filled} barSize={22} barGap={4} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fill: "rgba(148,163,184,0.65)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `$${(v as number).toFixed(3)}`} tick={{ fill: "rgba(148,163,184,0.65)", fontSize: 10 }} axisLine={false} tickLine={false} width={54} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)", radius: 4 }} />
            <Bar dataKey="total_cost" name="total_cost" radius={[4, 4, 0, 0]}>
              {filled.map((entry, idx) => (
                <Cell key={idx} fill={costBarColor(entry.total_cost, maxCost)} />
              ))}
            </Bar>
            <Bar dataKey="total_saved" name="total_saved" fill="rgba(99,102,241,0.60)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Real Cost Stats Row ──────────────────────────────────────────────────────
function CostStatsRow({ totals, isLoading }: { totals?: { week_cost: number; month_cost: number; week_saved: number; total_requests: number }; isLoading: boolean }) {
  const stats = [
    { label: "This Week",   value: `$${(totals?.week_cost   ?? 0).toFixed(4)}`, icon: <ArrowUpRight className="w-4 h-4" />, color: "text-rose-500"    },
    { label: "This Month",  value: `$${(totals?.month_cost  ?? 0).toFixed(4)}`, icon: <Zap className="w-4 h-4" />,          color: "text-primary"     },
    { label: "Week Saved",  value: `+$${(totals?.week_saved ?? 0).toFixed(4)}`, icon: <TrendingDown className="w-4 h-4" />, color: "text-emerald-500" },
    { label: "Total Calls", value: formatNumber(totals?.total_requests ?? 0),   icon: <Database className="w-4 h-4" />,     color: "text-blue-500"    },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-panel rounded-xl p-4 stat-card-premium">
          <div className={`flex items-center gap-1.5 mb-2 ${s.color}`}>
            {s.icon}
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{s.label}</span>
          </div>
          {isLoading
            ? <div className="h-5 w-20 bg-secondary/60 rounded animate-pulse" />
            : <p className="text-2xl font-black font-mono tracking-tight tabular-nums">{s.value}</p>
          }
        </motion.div>
      ))}
    </div>
  );
}

// ─── Real model breakdown (when DB data is available) ────────────────────────
function RealModelBreakdown({ models }: { models: ModelSpend[] }) {
  const total = models.reduce((s, m) => s + m.total_cost, 0) || 1;
  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Database className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-display font-bold">Real Model Costs</h2>
        <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">Live · 30 days</span>
      </div>
      <div className="space-y-5">
        {models.map((m, i) => {
          const pct = Math.round((m.total_cost / total) * 100);
          return (
            <div key={`${m.model}-${i}`} className="space-y-1.5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="font-semibold text-sm text-foreground">{m.model}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(m.request_count)} calls · {fmtTokens(m.input_tokens + m.output_tokens)} tokens
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold font-mono text-sm">${m.total_cost.toFixed(4)}</p>
                  <p className="text-xs text-emerald-500">saved ${m.total_saved.toFixed(4)}</p>
                </div>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-primary to-indigo-400 rounded-full"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Provider badge colors (mirrors home.tsx) ─────────────────────────────────
const PROVIDER_COLOR: Record<string, string> = {
  "OpenAI":    "text-blue-500 bg-blue-500/10",
  "Anthropic": "text-orange-500 bg-orange-500/10",
  "Gemini":    "text-green-500 bg-green-500/10",
  "Google":    "text-green-500 bg-green-500/10",
  "Meta":      "text-sky-400 bg-sky-400/10",
  "Mistral":   "text-purple-500 bg-purple-500/10",
};

function detectProvider(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("gpt") || l.includes("openai") || l.includes("davinci")) return "OpenAI";
  if (l.includes("claude") || l.includes("anthropic") || l.includes("haiku") || l.includes("sonnet") || l.includes("opus")) return "Anthropic";
  if (l.includes("gemini") || l.includes("google")) return "Gemini";
  if (l.includes("llama") || l.includes("meta")) return "Meta";
  if (l.includes("mistral")) return "Mistral";
  return "OpenAI"; // default
}

// ─── Top 3 Most Expensive Prompts ────────────────────────────────────────────
interface ActivityItem { id: string; type: string; label: string; value: string; timestamp: string; }
function TopExpensivePrompts({
  activity, avgCost, avgLatency, isLoading,
}: {
  activity: ActivityItem[];
  avgCost: number;
  avgLatency: number;
  isLoading: boolean;
}) {
  // Estimate per-item cost from latency value ("2.4s") proportional to avgCost
  const usageItems = activity
    .filter(a => a.type === "usage")
    .map(a => {
      const latency = parseFloat(a.value) || avgLatency || 1;
      const cost = avgLatency > 0
        ? +(avgCost * (latency / avgLatency)).toFixed(5)
        : +avgCost.toFixed(5);
      return { ...a, estimatedCost: cost, provider: detectProvider(a.label) };
    })
    .sort((a, b) => b.estimatedCost - a.estimatedCost)
    .slice(0, 3);

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Flame className="w-5 h-5 text-orange-400" />
        <h2 className="text-xl font-display font-bold">Most Expensive Requests</h2>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full ml-auto">
          by estimated cost
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-14 bg-secondary/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : usageItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
          <Trophy className="w-8 h-8 opacity-25" />
          <p className="text-sm">No usage data yet</p>
          <p className="text-xs opacity-50">Run AI tasks to see your most expensive requests</p>
        </div>
      ) : (
        <div className="space-y-2">
          {usageItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-secondary/30 border border-border/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-sm font-black font-mono w-5 flex-shrink-0 ${
                  i === 0 ? "text-red-400" : i === 1 ? "text-orange-400" : "text-yellow-400"
                }`}>#{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PROVIDER_COLOR[item.provider] ?? "text-muted-foreground bg-secondary"}`}>
                      {item.provider}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{item.value} latency</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className={`text-sm font-bold font-mono tabular-nums ${i === 0 ? "text-rose-500" : "text-foreground"}`}>
                  ~${item.estimatedCost.toFixed(4)}
                </p>
                <p className="text-[10px] text-muted-foreground">estimated</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Savings Highlight Stat ───────────────────────────────────────────────────
function SavingsHighlight({
  dailySpend, isLoading,
}: {
  dailySpend: number;
  isLoading: boolean;
}) {
  const potential = +(dailySpend * 0.35).toFixed(4);
  const pct = 35;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-6 relative overflow-hidden stat-card-premium"
    >
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[60px] translate-x-1/3 -translate-y-1/3 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.12), transparent 70%)" }} />

      <div className="flex items-center gap-2 mb-4 relative z-10">
        <Sparkles className="w-5 h-5 text-emerald-500" />
        <h2 className="text-xl font-display font-bold">Savings Opportunity</h2>
        <span className="text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-auto">
          Today
        </span>
      </div>

      <div className="relative z-10">
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-widest font-semibold">
          You could have saved
        </p>
        {isLoading ? (
          <div className="h-12 w-40 bg-secondary/60 rounded-xl animate-pulse" />
        ) : (
          <div className="flex items-end gap-3">
            <p className="text-5xl font-black font-mono tracking-tight tabular-nums text-emerald-500">
              ${potential}
            </p>
            <p className="text-lg font-bold text-emerald-500/70 mb-1.5">today</p>
          </div>
        )}
        <p className="text-sm text-muted-foreground mt-2 leading-snug">
          Based on <span className="font-semibold text-foreground">{pct}% savings opportunity</span> from
          smart routing and caching on today's{" "}
          <span className="font-semibold text-foreground">${dailySpend.toFixed(4)}</span> spend.
        </p>

        {/* Progress bar showing savings potential */}
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
            <span>Actual spend</span>
            <span>With optimization</span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
            />
          </div>
          <div className="flex justify-between text-[10px] mt-1">
            <span className="text-rose-500 font-mono tabular-nums">${dailySpend.toFixed(4)}</span>
            <span className="text-emerald-500 font-mono font-bold tabular-nums">${(dailySpend - potential).toFixed(4)} possible</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Date range options ───────────────────────────────────────────────────────
const DATE_RANGES = [
  { label: "Last 7 days",  days: 7  },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time",     days: 0  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Usage() {
  const { data: usageData, isLoading: usageLoading } = useUsageData();
  const { data: costData,  isLoading: costLoading  } = useCostSummary();
  const hasRealModels = (costData?.byModel?.length ?? 0) > 0;

  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySpend = costData?.daily?.find(d => d.day.slice(0, 10) === todayKey)?.total_cost ?? usageData?.avgCost ?? 0;

  // ── Export state ──────────────────────────────────────────────────────────
  const [selectedRange, setSelectedRange] = useState<number>(30);
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const [exporting, setExporting]         = useState(false);
  const [exportMsg, setExportMsg]         = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setExportMsg(null);
    try {
      const startDate = selectedRange > 0
        ? new Date(Date.now() - selectedRange * 86_400_000).toISOString()
        : undefined;
      await exportCostsCsv({
        startDate,
        filename: `ai-wallet-export-${new Date().toISOString().slice(0, 10)}.csv`,
      });
      setExportMsg({ type: "success", text: "CSV downloaded successfully" });
    } catch (err) {
      setExportMsg({ type: "error", text: err instanceof Error ? err.message : "Export failed" });
    } finally {
      setExporting(false);
      setTimeout(() => setExportMsg(null), 4000);
    }
  };

  const rangeLabel = DATE_RANGES.find(r => r.days === selectedRange)?.label ?? "Last 30 days";

  if (usageLoading || !usageData) {
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
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight heading-gradient">Usage &amp; Models</h1>
            <p className="text-muted-foreground mt-2 text-sm">Real-time API consumption, spend tracking, and model distribution.</p>
          </div>
          {/* Export controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Date range picker */}
            <div className="relative">
              <motion.button
                onClick={() => setShowRangeMenu(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {rangeLabel}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </motion.button>
              <AnimatePresence>
                {showRangeMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 z-30 rounded-xl border border-border/50 bg-card shadow-xl p-1.5 flex flex-col gap-0.5 min-w-[140px]"
                  >
                    {DATE_RANGES.map(r => (
                      <button key={r.days}
                        onClick={() => { setSelectedRange(r.days); setShowRangeMenu(false); }}
                        className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors text-left ${selectedRange === r.days ? "bg-primary/20 text-primary" : "hover:bg-secondary text-muted-foreground hover:text-foreground"}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Export button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-lg shadow-primary/20"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export CSV
            </motion.button>
          </div>
        </div>
        {/* Export feedback */}
        <AnimatePresence>
          {exportMsg && (
            <motion.p
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`mt-3 text-sm font-medium ${exportMsg.type === "success" ? "text-emerald-400" : "text-destructive"}`}
            >
              {exportMsg.text}
            </motion.p>
          )}
        </AnimatePresence>
      </header>

      {/* ── Live cost stats (Supabase) ── */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Live Cost Tracking</span>
        </div>
        <CostStatsRow totals={costData?.totals} isLoading={costLoading} />
      </section>

      {/* ── Daily spend chart ── */}
      <div className="mb-6">
        <DailySpendChart data={costData?.daily ?? []} isLoading={costLoading} />
      </div>

      {/* ── Savings opportunity + Top expensive requests ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SavingsHighlight dailySpend={todaySpend} isLoading={costLoading} />
        <TopExpensivePrompts
          activity={usageData.activity}
          avgCost={usageData.avgCost}
          avgLatency={usageData.avgLatency}
          isLoading={usageLoading}
        />
      </div>

      {/* ── Overview stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="glass-panel p-6 rounded-2xl col-span-1 lg:col-span-2 stat-card-premium">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Cpu className="w-5 h-5" />
            <h3 className="font-medium">Total API Requests</h3>
          </div>
          <div className="text-5xl font-display font-bold text-white mb-2">
            {formatNumber(usageData.totalRequests)}
          </div>
          <p className="text-sm text-success flex items-center gap-1">
            <span className="bg-success/10 px-2 py-0.5 rounded-full">+12.4%</span> vs last month
          </p>
        </div>
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center stat-card-premium">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Clock className="w-5 h-5" />
            <h3 className="font-medium">Avg Latency</h3>
          </div>
          <div className="text-4xl font-display font-bold text-white mb-2">{usageData.avgLatency}s</div>
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full w-[45%]" />
          </div>
        </div>
      </div>

      {/* ── Model breakdown + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasRealModels ? (
          <RealModelBreakdown models={costData!.byModel} />
        ) : (
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-5">
              <h2 className="text-xl font-display font-bold">Model Distribution</h2>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Simulated</span>
            </div>
            <div className="space-y-6">
              {usageData.models.map((model, i) => (
                <div key={model.model} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="font-medium text-foreground">{model.model}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(model.requests)} reqs · {model.avgLatency}s avg</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono">{formatCurrency(model.cost)}</p>
                      <p className="text-xs text-muted-foreground">{model.percentage}% of volume</p>
                    </div>
                  </div>
                  <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${model.percentage}%` }}
                      transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-primary to-indigo-400 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass-panel p-6 rounded-2xl flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold">Recent Activity Log</h2>
            <ServerCrash className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            <ActivityFeed items={usageData.activity.slice(0, 10)} />
          </div>
        </div>
      </div>
    </Shell>
  );
}
