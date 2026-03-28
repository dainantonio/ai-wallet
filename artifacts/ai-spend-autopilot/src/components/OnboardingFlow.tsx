import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Wallet } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "onboarding_complete";
const BUDGET_KEY  = "monthly_budget";

const slideVariants = {
  enter:  { opacity: 0, x: 48 },
  center: { opacity: 1, x: 0   },
  exit:   { opacity: 0, x: -48 },
};

const transition = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

// ─── Types ────────────────────────────────────────────────────────────────────
interface OnboardingFlowProps {
  userId: string;
  isDemo: boolean;
  onComplete: () => void;
}

type Keys = { openai: string; anthropic: string; google: string };
type ShowKey = { openai: boolean; anthropic: boolean; google: boolean };

// ─── Shared overlay wrapper ───────────────────────────────────────────────────
function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 40%, #0a0f1a 100%)" }}
    >
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse, #7c3aed, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, #3b82f6, transparent 70%)" }} />
      </div>
      {children}
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function Dots({ current }: { current: number }) {
  return (
    <div className="flex gap-2 justify-center mb-8">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width:  i === current ? 24 : 8,
            height: 8,
            background: i === current ? "#7c3aed" : "rgba(255,255,255,0.2)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Screen 1: Welcome ────────────────────────────────────────────────────────
function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      key="welcome"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      className="relative z-10 flex flex-col items-center text-center px-8 max-w-lg w-full"
    >
      <Dots current={0} />

      {/* Animated wallet icon */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        className="mb-8"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-2xl opacity-50"
            style={{ background: "radial-gradient(ellipse, #7c3aed, transparent 60%)", transform: "scale(1.6)" }} />
          <div className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
            <Wallet className="w-12 h-12 text-white" />
          </div>
        </div>
      </motion.div>

      <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
        Never overspend on<br />
        <span style={{ background: "linear-gradient(90deg, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          AI again
        </span>
      </h1>

      <p className="text-lg text-white/60 mb-12 leading-relaxed">
        AI Wallet tracks every token you spend across OpenAI, Anthropic, and Gemini — so you stay in control of your AI costs.
      </p>

      <button
        onClick={onNext}
        className="w-full max-w-xs py-4 rounded-xl font-semibold text-white text-lg transition-all duration-200 hover:opacity-90 active:scale-95"
        style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
      >
        Get Started
      </button>

      <p className="mt-4 text-white/30 text-sm">Free to use · No credit card required</p>
    </motion.div>
  );
}

// ─── Screen 2: Connect Providers ─────────────────────────────────────────────
function KeysScreen({
  keys, showKey, onChange, onToggleShow, onSkip, onContinue,
}: {
  keys: Keys;
  showKey: ShowKey;
  onChange: (provider: keyof Keys, value: string) => void;
  onToggleShow: (provider: keyof Keys) => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  const fields: { provider: keyof Keys; label: string; placeholder: string }[] = [
    { provider: "openai",    label: "OpenAI API Key",    placeholder: "sk-..." },
    { provider: "anthropic", label: "Anthropic API Key", placeholder: "sk-ant-..." },
    { provider: "google",    label: "Gemini API Key",    placeholder: "AIza..." },
  ];

  return (
    <motion.div
      key="keys"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      className="relative z-10 flex flex-col items-center px-8 max-w-md w-full"
    >
      <Dots current={1} />

      <h2 className="text-3xl font-bold text-white mb-2 text-center">Connect your AI providers</h2>
      <p className="text-white/50 text-center mb-8">
        Keys are encrypted and stored securely. You can add or change them later in Settings.
      </p>

      <div className="w-full space-y-4 mb-8">
        {fields.map(({ provider, label, placeholder }) => (
          <div key={provider}>
            <label className="block text-white/70 text-sm font-medium mb-1.5">{label}</label>
            <div className="relative">
              <input
                type={showKey[provider] ? "text" : "password"}
                value={keys[provider]}
                onChange={e => onChange(provider, e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl px-4 py-3 pr-12 text-white placeholder-white/25 text-sm outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.7)")}
                onBlur={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
              />
              <button
                type="button"
                onClick={() => onToggleShow(provider)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {showKey[provider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="w-full py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
        style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
      >
        Continue
      </button>

      <button
        onClick={onSkip}
        className="mt-4 text-white/40 hover:text-white/70 text-sm transition-colors"
      >
        Skip for now
      </button>
    </motion.div>
  );
}

// ─── Screen 3: Set Budget ─────────────────────────────────────────────────────
function BudgetScreen({
  budget, onChange, onLaunch, saving,
}: {
  budget: number;
  onChange: (v: number) => void;
  onLaunch: () => void;
  saving: boolean;
}) {
  return (
    <motion.div
      key="budget"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      className="relative z-10 flex flex-col items-center px-8 max-w-md w-full"
    >
      <Dots current={2} />

      <h2 className="text-3xl font-bold text-white mb-2 text-center">Set your monthly budget</h2>
      <p className="text-white/50 text-center mb-10">
        We'll alert you at 80% usage so you're never caught off guard.
      </p>

      {/* Live dollar display */}
      <motion.div
        key={budget}
        initial={{ scale: 0.92, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="mb-8 text-center"
      >
        <span className="text-7xl font-extrabold"
          style={{ background: "linear-gradient(90deg, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          ${budget}
        </span>
        <span className="block text-white/40 text-sm mt-1">per month</span>
      </motion.div>

      {/* Slider */}
      <div className="w-full mb-4">
        <input
          type="range"
          min={10}
          max={500}
          step={5}
          value={budget}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #7c3aed ${((budget - 10) / 490) * 100}%, rgba(255,255,255,0.15) ${((budget - 10) / 490) * 100}%)`,
            // WebKit thumb styling via CSS class below
          }}
        />
      </div>

      <div className="w-full flex justify-between text-white/30 text-xs mb-10">
        <span>$10</span>
        <span>$500</span>
      </div>

      {/* Alert note */}
      <div className="w-full rounded-xl px-4 py-3 mb-8 flex items-center gap-3"
        style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#7c3aed" }} />
        <p className="text-white/70 text-sm">
          We'll alert you when you hit <strong className="text-white">${Math.round(budget * 0.8)}</strong> ({Math.round(0.8 * 100)}% of your budget)
        </p>
      </div>

      <button
        onClick={onLaunch}
        disabled={saving}
        className="w-full py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
      >
        {saving ? "Setting up…" : "Launch My Wallet"}
      </button>
    </motion.div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function OnboardingFlow({ userId, isDemo, onComplete }: OnboardingFlowProps) {
  const [screen, setScreen]   = useState(0);
  const [keys, setKeys]       = useState<Keys>({ openai: "", anthropic: "", google: "" });
  const [showKey, setShowKey] = useState<ShowKey>({ openai: false, anthropic: false, google: false });
  const [budget, setBudget]   = useState(50);
  const [saving, setSaving]   = useState(false);

  async function saveKeys() {
    if (isDemo) return; // demo users have no real session
    const entries = (Object.entries(keys) as [keyof Keys, string][]).filter(([, v]) => v.trim());
    await Promise.all(
      entries.map(([provider, apiKey]) =>
        fetch("/api/settings/keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ provider, apiKey }),
        }),
      ),
    );
  }

  async function handleLaunch() {
    setSaving(true);
    try {
      await saveKeys();
    } catch {
      // non-fatal — keys can be added later in Settings
    }
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.setItem(BUDGET_KEY, String(budget));
    setSaving(false);
    onComplete();
  }

  return (
    <Overlay>
      <AnimatePresence mode="wait">
        {screen === 0 && (
          <WelcomeScreen onNext={() => setScreen(1)} />
        )}
        {screen === 1 && (
          <KeysScreen
            keys={keys}
            showKey={showKey}
            onChange={(p, v) => setKeys(prev => ({ ...prev, [p]: v }))}
            onToggleShow={p => setShowKey(prev => ({ ...prev, [p]: !prev[p] }))}
            onSkip={() => setScreen(2)}
            onContinue={() => setScreen(2)}
          />
        )}
        {screen === 2 && (
          <BudgetScreen
            budget={budget}
            onChange={setBudget}
            onLaunch={handleLaunch}
            saving={saving}
          />
        )}
      </AnimatePresence>
    </Overlay>
  );
}
