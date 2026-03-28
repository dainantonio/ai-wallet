import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet, Zap, TrendingDown, Shield, ArrowRight, Sparkles,
  CreditCard, CheckCircle2, PlugZap, Eye, Bot, ChevronRight,
  BadgeDollarSign, Bell, SlidersHorizontal, Activity,
} from "lucide-react";

// ─── Fade-in on scroll helper ─────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const PROVIDERS = [
  { label: "OpenAI",    color: "text-blue-500   bg-blue-500/10"   },
  { label: "Anthropic", color: "text-orange-500 bg-orange-500/10" },
  { label: "Gemini",    color: "text-green-500  bg-green-500/10"  },
  { label: "Meta",      color: "text-sky-400    bg-sky-400/10"    },
  { label: "Mistral",   color: "text-purple-500 bg-purple-500/10" },
];

const STEPS = [
  {
    num: "01",
    icon: <PlugZap className="w-5 h-5" />,
    title: "Connect your providers",
    body: "Link your OpenAI, Anthropic, Gemini, and other API keys in seconds. No code changes required.",
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  },
  {
    num: "02",
    icon: <Eye className="w-5 h-5" />,
    title: "See cost before you spend",
    body: "Every task shows an estimated cost and a cheaper alternative before it runs. You're always in control.",
    color: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  },
  {
    num: "03",
    icon: <Sparkles className="w-5 h-5" />,
    title: "Savings happen automatically",
    body: "AI Wallet routes requests to cheaper models, batches calls, and caches responses — while you focus on building.",
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
];

const BENEFITS = [
  {
    icon: <BadgeDollarSign className="w-5 h-5" />,
    title: "Stop overspending",
    body: "Set monthly budgets and get real-time alerts before you hit your limit. No surprise bills at end of month.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/8 border-emerald-400/20",
  },
  {
    icon: <TrendingDown className="w-5 h-5" />,
    title: "Cut costs automatically",
    body: "Smart routing switches expensive models to cheaper equivalents when quality allows — up to 80% savings.",
    color: "text-primary",
    bg: "bg-primary/8 border-primary/20",
  },
  {
    icon: <Activity className="w-5 h-5" />,
    title: "Live spend feed",
    body: "Every API call tracked in real time — amount, provider, and type — so you always know where money goes.",
    color: "text-blue-400",
    bg: "bg-blue-400/8 border-blue-400/20",
  },
  {
    icon: <SlidersHorizontal className="w-5 h-5" />,
    title: "Spend modes",
    body: "Flip between Saver, Balanced, and Performance modes to match your cost vs. quality needs at any time.",
    color: "text-orange-400",
    bg: "bg-orange-400/8 border-orange-400/20",
  },
  {
    icon: <Bell className="w-5 h-5" />,
    title: "Budget alerts",
    body: "Configurable thresholds notify you before costs spiral. Stay on track every month without manual checks.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/8 border-yellow-400/20",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Pre-flight checks",
    body: "A cost estimate and optimization suggestion appears before every task runs — so you can approve or swap providers.",
    color: "text-violet-400",
    bg: "bg-violet-400/8 border-violet-400/20",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage({ onLogin, onDemo }: { onLogin: () => void; onDemo: () => void }) {
  const [email, setEmail]       = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    // Simulate async submission
    setTimeout(() => { setSubmitting(false); setSubmitted(true); }, 800);
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden">

      {/* ── Global background glows ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.10, 0.16, 0.10] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary rounded-full blur-[160px] -translate-y-1/2 translate-x-1/3"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.07, 0.12, 0.07] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[140px] translate-y-1/3 -translate-x-1/4"
          style={{ background: "radial-gradient(circle, #4338ca, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.09, 0.05] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute top-1/2 left-1/3 w-[500px] h-[500px] rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(circle, #10b981, transparent 70%)" }}
        />
      </div>

      {/* ── Nav ── */}
      <header className="relative z-20 w-full border-b border-border/30 backdrop-blur-md bg-background/60 sticky top-0">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/25">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-display font-black text-foreground">AI Wallet</span>
            <span className="hidden sm:block text-[10px] font-semibold text-primary tracking-widest uppercase border border-primary/30 bg-primary/8 px-1.5 py-0.5 rounded-full">Beta</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDemo}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
            >
              Live Demo
            </button>
            <button
              onClick={onLogin}
              className="text-sm font-semibold px-4 py-1.5 rounded-lg border border-border/50 bg-secondary/40 hover:bg-secondary/80 text-foreground transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-24 text-center">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/8 text-xs font-semibold text-primary mb-8"
        >
          <Zap className="w-3 h-3" />
          Smart AI cost management, built for builders
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-foreground leading-[1.05] tracking-tight mb-6 max-w-3xl mx-auto"
        >
          Never Run Out of{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-400 to-violet-400">
            AI Tokens
          </span>{" "}
          Again
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
        >
          AI Wallet shows your cost before you spend and helps you save automatically.
        </motion.p>

        {/* Email form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.22 }}
          className="flex flex-col items-center gap-3 mb-6"
        >
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 font-semibold text-sm"
            >
              <CheckCircle2 className="w-5 h-5" />
              You're on the list — we'll be in touch!
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 w-full max-w-md">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="flex-1 px-4 py-3 rounded-xl bg-card/60 border border-border/50 backdrop-blur-sm text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all min-w-0"
              />
              <motion.button
                type="submit"
                disabled={submitting}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow disabled:opacity-70 whitespace-nowrap"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Join Early Access <ArrowRight className="w-4 h-4" /></>
                )}
              </motion.button>
            </form>
          )}
          <p className="text-xs text-muted-foreground/60">No spam. Unsubscribe any time.</p>
        </motion.div>

        {/* Demo link */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={onDemo}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            Or try the live demo instantly — no account needed
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </motion.div>

        {/* Provider badges */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-2 mt-12 flex-wrap"
        >
          <span className="text-xs text-muted-foreground/50 mr-1">Works with</span>
          {PROVIDERS.map((p) => (
            <span key={p.label} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${p.color}`}>
              {p.label}
            </span>
          ))}
        </motion.div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        </div>

        <FadeIn className="text-center mb-16">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-foreground">
            From chaos to control in 3 steps
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-9 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px bg-gradient-to-r from-border/40 via-primary/30 to-border/40 pointer-events-none" />

          {STEPS.map((step, i) => (
            <FadeIn key={step.num} delay={i * 0.1}>
              <div className="relative flex flex-col gap-4 p-6 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm hover:border-border/70 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${step.color}`}>
                    {step.icon}
                  </div>
                  <span className="text-xs font-black text-muted-foreground/40 tracking-widest">{step.num}</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1.5">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        </div>

        <FadeIn className="text-center mb-16">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Benefits</p>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-foreground">
            Everything you need to spend smarter
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Built for solo developers and teams who are tired of guessing what their AI API bills will look like.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENEFITS.map((b, i) => (
            <FadeIn key={b.title} delay={i * 0.07}>
              <div className={`flex flex-col gap-3 p-5 rounded-2xl border ${b.bg} h-full`}>
                <div className={`w-9 h-9 rounded-xl bg-current/10 flex items-center justify-center flex-shrink-0 ${b.color}`}>
                  {b.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.body}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Demo CTA ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        </div>

        <FadeIn>
          <div className="relative rounded-3xl overflow-hidden border border-primary/20 bg-card/40 backdrop-blur-sm p-10 sm:p-16 text-center"
            style={{ background: "linear-gradient(135deg, #13111f 0%, #1e1b4b 40%, #0a0818 100%)" }}
          >
            {/* Top highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/15 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/15 rounded-full blur-[60px] -translate-x-1/3 translate-y-1/3 pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/8 border border-white/15 text-xs font-semibold text-white/70 mb-6">
                <Bot className="w-3.5 h-3.5" />
                No account required
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-black text-white mb-4">
                See it in action right now
              </h2>
              <p className="text-white/60 text-lg mb-10 max-w-lg mx-auto">
                The full dashboard — live balance, transaction feed, smart routing, spend modes — all with simulated data you can play with.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.button
                  onClick={onDemo}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02, y: -1 }}
                  className="flex items-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-indigo-500 text-white font-bold text-base shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-shadow"
                >
                  <Sparkles className="w-5 h-5" />
                  Open Live Demo
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
                <button
                  onClick={onLogin}
                  className="flex items-center gap-2 text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Sign in with Replit
                </button>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-border/30 max-w-6xl mx-auto px-5 sm:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-foreground">AI Wallet</span>
            <span className="text-xs text-muted-foreground/50">— Spend Autopilot</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground/50">
            <span>Works with OpenAI · Anthropic · Gemini · Meta · Mistral</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
