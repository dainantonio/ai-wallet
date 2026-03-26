import { motion } from "framer-motion";
import {
  Wallet, Zap, TrendingDown, Shield, ArrowRight,
  Sparkles, CreditCard, Bot,
} from "lucide-react";

const FEATURES = [
  { icon: <TrendingDown className="w-4 h-4" />, text: "Live AI spend tracking across providers" },
  { icon: <Zap className="w-4 h-4" />,          text: "Auto-optimize model routing to cut costs" },
  { icon: <Shield className="w-4 h-4" />,        text: "Budget alerts, spend modes & savings tips" },
];

const PROVIDERS = [
  { label: "OpenAI",    color: "text-blue-400 bg-blue-400/10" },
  { label: "Anthropic", color: "text-orange-400 bg-orange-400/10" },
  { label: "Gemini",    color: "text-green-400 bg-green-400/10" },
  { label: "Meta",      color: "text-sky-400 bg-sky-400/10" },
];

export default function LoginPage({ onLogin, onDemo }: { onLogin: () => void; onDemo: () => void }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-primary/12 rounded-full blur-[140px] -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-violet-600/6 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-6 py-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-10 justify-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-xl shadow-primary/30">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-black text-foreground leading-none">AI Wallet</h1>
            <p className="text-xs font-medium text-primary tracking-widest uppercase mt-0.5">Spend Autopilot</p>
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 shadow-2xl shadow-black/30"
        >
          {/* Headline */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              Your AI spend, optimized
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Track costs across every AI provider, auto-route to cheaper models, and watch your savings grow in real time.
            </p>
          </div>

          {/* Provider badges */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2 mb-6 flex-wrap"
          >
            {PROVIDERS.map((p, i) => (
              <motion.span
                key={p.label}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 + i * 0.06 }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${p.color}`}
              >
                {p.label}
              </motion.span>
            ))}
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="text-[11px] font-medium px-2 py-1 text-muted-foreground"
            >
              + more
            </motion.span>
          </motion.div>

          {/* Feature list */}
          <div className="space-y-2.5 mb-7">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.text}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.08 }}
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <span>{f.text}</span>
              </motion.div>
            ))}
          </div>

          {/* ── Primary CTA: Demo ── */}
          <motion.button
            onClick={onDemo}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.01 }}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white font-semibold text-base shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow mb-3"
          >
            <Sparkles className="w-4 h-4" />
            <span>Try Live Demo</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
          <p className="text-xs text-muted-foreground text-center mb-5">
            No account required · Full dashboard · Data resets on reload
          </p>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-muted-foreground bg-card/60">have a Replit account?</span>
            </div>
          </div>

          {/* ── Secondary CTA: Replit auth ── */}
          <motion.button
            onClick={onLogin}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.01 }}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl border border-border/50 bg-secondary/40 hover:bg-secondary/70 text-foreground font-medium text-sm transition-colors"
          >
            <CreditCard className="w-4 h-4 text-primary" />
            <span>Sign in with Replit</span>
          </motion.button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Persistent wallet · Secure auth · No password needed
          </p>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mt-6 space-y-1"
        >
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Bot className="w-3.5 h-3.5" />
            Supports OpenAI, Anthropic, Google Gemini, Meta &amp; Mistral
          </p>
        </motion.div>
      </div>
    </div>
  );
}
