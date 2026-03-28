import { Shell } from "@/components/layout/Shell";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders, TrendingDown, TrendingUp, DollarSign,
  Calendar, ArrowRight, Zap,
} from "lucide-react";

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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Simulator() {
  const [promptsPerDay, setPromptsPerDay] = useState(100);
  const [lengthId,      setLengthId]      = useState<LengthId>("medium");
  const [currentModel,  setCurrentModel]  = useState<ModelId>("openai");
  const [altModel,      setAltModel]      = useState<ModelId>("google");

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
          Estimate cost impact before switching models. All calculations are instant and client-side.
        </p>
      </header>

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
    </Shell>
  );
}
