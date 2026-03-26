import { motion } from "framer-motion";
import { Wallet, Zap, TrendingDown, Shield, ArrowRight, FlaskConical } from "lucide-react";

const FEATURES = [
  { icon: <TrendingDown className="w-4 h-4" />, text: "Track AI spend in real time" },
  { icon: <Zap className="w-4 h-4" />,          text: "Auto-optimize model routing" },
  { icon: <Shield className="w-4 h-4" />,        text: "Budget alerts & controls" },
];

export default function LoginPage({ onLogin, onDemo }: { onLogin: () => void; onDemo: () => void }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-primary/12 rounded-full blur-[140px] -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3" />
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
          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-sm">
              Sign in to access your AI Wallet dashboard and start saving on API costs.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3 mb-8">
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

          {/* Login button */}
          <motion.button
            onClick={onLogin}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.01 }}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white font-semibold text-base shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
          >
            <span>Continue with Replit</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Secure authentication · No password required
          </p>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-muted-foreground bg-card/60">or</span>
            </div>
          </div>

          <motion.button
            onClick={onDemo}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.01 }}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl border border-border/50 bg-secondary/40 hover:bg-secondary/70 text-foreground font-medium text-sm transition-colors"
          >
            <FlaskConical className="w-4 h-4 text-amber-400" />
            <span>Continue as Demo</span>
          </motion.button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Explore the dashboard · No account needed
          </p>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          AI Wallet uses your spending data to optimize API costs in real time.
        </motion.p>
      </div>
    </div>
  );
}
