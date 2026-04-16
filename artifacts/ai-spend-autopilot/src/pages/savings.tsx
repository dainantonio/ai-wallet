import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { useSavingsInsights } from "@/hooks/use-app-data";
import type { SavingsInsight, InsightCategory, InsightSeverity } from "@/hooks/use-app-data";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, TrendingDown, Zap, Brain, Archive, RefreshCw,
  ChevronDown, ChevronUp, ArrowRight, CircleDollarSign,
  Layers, Bot, Database, Gauge,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

// ─── Severity config ──────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<InsightSeverity, { label: string; bar: string; badge: string }> = {
  high:   { label: "High Impact",   bar: "bg-rose-500",    badge: "text-rose-500 bg-rose-500/10 border-rose-500/20"   },
  medium: { label: "Medium Impact", bar: "bg-amber-500",   badge: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  low:    { label: "Low Impact",    bar: "bg-blue-500",    badge: "text-blue-500 bg-blue-500/10 border-blue-500/20"    },
};

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<InsightCategory, { label: string; Icon: typeof Bot; color: string }> = {
  model:   { label: "Model Selection", Icon: Bot,              color: "text-indigo-400" },
  prompt:  { label: "Prompt Quality",  Icon: Brain,            color: "text-purple-400" },
  caching: { label: "Caching",         Icon: Database,         color: "text-emerald-400" },
  routing: { label: "Smart Routing",   Icon: Layers,           color: "text-cyan-400" },
  batch:   { label: "Batch API",       Icon: Archive,          color: "text-orange-400" },
};

// ─── Insight Card ─────────────────────────────────────────────────────────────
function InsightCard({ insight, index }: { insight: SavingsInsight; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[insight.severity];
  const cat = CATEGORY_CONFIG[insight.category];
  const Icon = cat.Icon;

  const handleAction = () => {
    trackEvent("savings_insight_action", { id: insight.id, category: insight.category });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, ease: "easeOut" }}
      className="glass-panel rounded-2xl overflow-hidden border border-border/40 hover:border-border/70 transition-colors"
    >
      {/* Severity accent bar */}
      <div className={`h-1 w-full ${sev.bar}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Category icon */}
            <div className="w-10 h-10 rounded-xl bg-secondary/60 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon className={`w-5 h-5 ${cat.color}`} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {cat.label}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev.badge}`}>
                  {sev.label}
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground leading-snug">{insight.title}</h3>
            </div>
          </div>

          {/* Weekly savings badge */}
          <div className="flex-shrink-0 text-right">
            <p className="text-xl font-black font-mono tabular-nums text-emerald-500">
              +{formatCurrency(insight.weeklySavings)}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">/ week</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 ml-13 pl-0.5">
          {insight.description}
        </p>

        {/* Metric highlight */}
        <div className="flex items-center gap-4 mb-4 px-4 py-3 rounded-xl bg-secondary/40 border border-border/30">
          <div>
            <p className="text-2xl font-black font-mono tabular-nums text-foreground">{insight.metric}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">
              {insight.metricLabel}
            </p>
          </div>
          <div className="h-10 w-px bg-border/40 mx-1" />
          <div>
            <p className="text-lg font-black font-mono tabular-nums text-emerald-500">
              +{formatCurrency(insight.monthlySavings)}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">
              / month saved
            </p>
          </div>
        </div>

        {/* Expandable details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <ul className="mb-4 space-y-2">
                {insight.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0 mt-1.5" />
                    {d}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Less details" : "See details"}
          </button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleAction}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            {insight.actionLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Summary Banner ───────────────────────────────────────────────────────────
function SummaryBanner({
  totalWeekly,
  totalMonthly,
  count,
  lastAnalyzed,
  isLoading,
}: {
  totalWeekly: number;
  totalMonthly: number;
  count: number;
  lastAnalyzed: string;
  isLoading: boolean;
}) {
  const analyzedAt = new Date(lastAnalyzed).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-6 relative overflow-hidden stat-card-premium mb-6"
    >
      {/* Ambient glow */}
      <div
        className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[80px] translate-x-1/3 -translate-y-1/3 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.14), transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Savings Opportunity
            </span>
            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              Analyzed at {analyzedAt}
            </span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            We found <span className="font-bold text-foreground">{count} optimization opportunities</span> based on
            your recent usage patterns.
          </p>
        </div>

        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="text-center">
            {isLoading ? (
              <div className="h-10 w-24 bg-secondary/60 rounded-xl animate-pulse" />
            ) : (
              <p className="text-4xl font-black font-mono tabular-nums text-emerald-500">
                +{formatCurrency(totalWeekly)}
              </p>
            )}
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">/ week</p>
          </div>
          <div className="h-12 w-px bg-border/40" />
          <div className="text-center">
            {isLoading ? (
              <div className="h-8 w-24 bg-secondary/60 rounded-xl animate-pulse" />
            ) : (
              <p className="text-3xl font-black font-mono tabular-nums text-emerald-400/80">
                +{formatCurrency(totalMonthly)}
              </p>
            )}
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">/ month</p>
          </div>
        </div>
      </div>

      {/* Savings progress bar */}
      <div className="relative z-10 mt-5">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
          <span>Potential savings unlocked</span>
          <span className="font-bold text-emerald-500">{count * 20}% of max</span>
        </div>
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${count * 20}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Stat mini-cards ──────────────────────────────────────────────────────────
function QuickStats({ report }: { report: { totalWeeklySavings: number; insights: SavingsInsight[] } }) {
  const high   = report.insights.filter(i => i.severity === "high").length;
  const medium = report.insights.filter(i => i.severity === "medium").length;
  const low    = report.insights.filter(i => i.severity === "low").length;

  const stats = [
    { label: "High Impact",    value: high,   icon: <TrendingDown className="w-4 h-4" />, color: "text-rose-500"    },
    { label: "Medium Impact",  value: medium, icon: <Zap className="w-4 h-4" />,          color: "text-amber-500"  },
    { label: "Quick Wins",     value: low,    icon: <Gauge className="w-4 h-4" />,         color: "text-blue-500"   },
    { label: "Total Insights", value: report.insights.length, icon: <CircleDollarSign className="w-4 h-4" />, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-panel rounded-xl p-4"
        >
          <div className={`flex items-center gap-1.5 mb-2 ${s.color}`}>
            {s.icon}
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{s.label}</span>
          </div>
          <p className="text-3xl font-black font-mono tabular-nums">{s.value}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Category filter tabs ─────────────────────────────────────────────────────
const ALL_CATEGORIES: Array<{ key: "all" | InsightCategory; label: string }> = [
  { key: "all",     label: "All"          },
  { key: "model",   label: "Models"       },
  { key: "prompt",  label: "Prompts"      },
  { key: "caching", label: "Caching"      },
  { key: "routing", label: "Routing"      },
  { key: "batch",   label: "Batch API"    },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Savings() {
  const { data: report, isLoading, refetch, isFetching } = useSavingsInsights();
  const [activeCategory, setActiveCategory] = useState<"all" | InsightCategory>("all");

  const filtered = activeCategory === "all"
    ? (report?.insights ?? [])
    : (report?.insights ?? []).filter(i => i.category === activeCategory);

  const handleRefresh = () => {
    void refetch();
    trackEvent("savings_insights_refresh", {});
  };

  return (
    <Shell>
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight heading-gradient">
              Savings Insights
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              AI-powered recommendations to cut costs without sacrificing quality.
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Re-analyze
          </motion.button>
        </div>
      </header>

      {/* Summary banner */}
      <SummaryBanner
        totalWeekly={report?.totalWeeklySavings ?? 0}
        totalMonthly={report?.totalMonthlySavings ?? 0}
        count={report?.insights.length ?? 0}
        lastAnalyzed={report?.lastAnalyzed ?? new Date().toISOString()}
        isLoading={isLoading}
      />

      {/* Quick stats */}
      {report && <QuickStats report={report} />}

      {/* Category filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeCategory === cat.key
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-secondary border border-border/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground font-medium">
          {filtered.length} insight{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Insight cards */}
      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="glass-panel rounded-2xl h-44 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center"
        >
          <Sparkles className="w-10 h-10 text-primary/40 mb-3" />
          <p className="font-bold text-foreground mb-1">No insights in this category</p>
          <p className="text-sm text-muted-foreground">Try switching to "All" or re-analyzing your usage.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {filtered.map((insight, i) => (
            <InsightCard key={insight.id} insight={insight} index={i} />
          ))}
        </div>
      )}

      {/* Footer note */}
      <p className="mt-8 text-xs text-muted-foreground text-center">
        Estimates based on your usage patterns and current provider pricing. Actual savings may vary.
      </p>
    </Shell>
  );
}
