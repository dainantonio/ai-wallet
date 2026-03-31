import { useState, useEffect, useRef } from "react";
import {
  Zap, TrendingDown, Leaf, Flame, Gauge, Terminal,
  Activity, Bot, Send, Sparkles, RefreshCw, Wallet,
} from "lucide-react";

const INITIAL_FEED = [
  { id: 1,  ts: "09:41:03", provider: "OpenAI",    label: "GPT-4o batch request",         amount: -0.032, type: "usage" },
  { id: 2,  ts: "09:41:07", provider: "AI Wallet",  label: "Semantic cache hit",            amount: +9.60,  type: "opt"   },
  { id: 3,  ts: "09:41:22", provider: "Anthropic",  label: "Document summarization",        amount: -0.018, type: "usage" },
  { id: 4,  ts: "09:41:38", provider: "AI Wallet",  label: "Smart routing: GPT-4o → mini",  amount: +12.40, type: "opt"   },
  { id: 5,  ts: "09:42:01", provider: "Gemini",     label: "Embedding computation",         amount: -0.004, type: "usage" },
  { id: 6,  ts: "09:42:15", provider: "OpenAI",     label: "Chat completion (mini)",        amount: -0.008, type: "usage" },
  { id: 7,  ts: "09:42:33", provider: "AI Wallet",  label: "Token budget optimization",     amount: +6.20,  type: "opt"   },
  { id: 8,  ts: "09:42:51", provider: "Gemini",     label: "Gemini 2.5 Flash call",         amount: -0.002, type: "usage" },
  { id: 9,  ts: "09:43:04", provider: "Anthropic",  label: "Translation pipeline",          amount: -0.021, type: "usage" },
  { id: 10, ts: "09:43:18", provider: "AI Wallet",  label: "Duplicate request merged",      amount: +4.10,  type: "opt"   },
  { id: 11, ts: "09:43:29", provider: "OpenAI",     label: "Code analysis run",             amount: -0.041, type: "usage" },
  { id: 12, ts: "09:43:44", provider: "AI Wallet",  label: "Batch compression savings",     amount: +2.10,  type: "opt"   },
];

const LIVE_POOL = [
  { provider: "OpenAI",    label: "Chat completion (gpt-4o-mini)", amount: -0.009, type: "usage" },
  { provider: "Gemini",    label: "Gemini 2.5 Flash inference",    amount: -0.002, type: "usage" },
  { provider: "AI Wallet", label: "Semantic cache hit",            amount: +3.20,  type: "opt"   },
  { provider: "Anthropic", label: "Haiku summarization",           amount: -0.006, type: "usage" },
  { provider: "AI Wallet", label: "Smart routing applied",         amount: +1.80,  type: "opt"   },
  { provider: "OpenAI",    label: "Embedding batch",               amount: -0.003, type: "usage" },
];

const PROVIDER_BADGE: Record<string, string> = {
  OpenAI:    "text-blue-400",
  Anthropic: "text-orange-400",
  Gemini:    "text-green-400",
  "AI Wallet": "text-violet-400",
};

const CHAT_MSGS = [
  {
    role: "bot",
    text: null,
    card: {
      title: "Today's Summary",
      items: [
        { label: "Balance",      value: "$158.50",    color: "text-white" },
        { label: "Total Saved",  value: "$34.20 ↑",   color: "text-emerald-400" },
        { label: "Efficiency",   value: "84 / 100",   color: "text-cyan-400" },
        { label: "Active Mode",  value: "Balanced",   color: "text-indigo-400" },
      ],
    },
  },
  {
    role: "bot",
    text: "Top cost driver this week is OpenAI (48% of spend). I've already routed 60% of those calls to GPT-4o mini — saving you $12.40 so far.",
    card: null,
  },
  {
    role: "user",
    text: "Any tips to cut costs further?",
    card: null,
  },
  {
    role: "bot",
    text: null,
    card: {
      title: "3 Quick Wins",
      items: [
        { label: "💡", value: "Enable semantic caching → free hits", color: "text-amber-300" },
        { label: "💡", value: "Cap max_tokens on all completions",   color: "text-amber-300" },
        { label: "💡", value: "Batch embeddings — 10× cheaper",      color: "text-amber-300" },
      ],
    },
  },
];

function pad2(n: number) { return String(n).padStart(2, "0"); }
function nowTs() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function Hybrid() {
  const [mode, setMode] = useState<"saver" | "balanced" | "performance">("balanced");
  const [feed, setFeed] = useState(INITIAL_FEED);
  const [input, setInput] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(100);

  useEffect(() => {
    const t = setInterval(() => {
      const src = LIVE_POOL[Math.floor(Math.random() * LIVE_POOL.length)];
      const entry = { ...src, id: idRef.current++, ts: nowTs() };
      setFeed(f => [...f.slice(-20), entry]);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [feed]);

  const modes = [
    { key: "saver",       label: "SAVER",       icon: Leaf,  glow: "shadow-[0_0_10px_#22c55e80]", active: "bg-emerald-500/20 border-emerald-500 text-emerald-400" },
    { key: "balanced",    label: "BALANCED",     icon: Gauge, glow: "shadow-[0_0_10px_#6366f180]", active: "bg-indigo-500/20 border-indigo-500 text-indigo-400"   },
    { key: "performance", label: "PERFORMANCE",  icon: Flame, glow: "shadow-[0_0_10px_#f9731680]", active: "bg-orange-500/20 border-orange-500 text-orange-400"   },
  ] as const;

  return (
    <div className="w-[1280px] h-[800px] bg-[#080c10] text-white font-mono flex flex-col overflow-hidden">

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a2030] bg-[#0d1117] shrink-0">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-cyan-400" />
          <span className="text-xs tracking-[0.2em] uppercase text-cyan-400 font-bold">AI Wallet</span>
          <span className="ml-2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400/70 tracking-widest">LIVE</span>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 border border-[#1f2937] rounded-lg p-0.5 bg-[#080c10]">
          {modes.map(m => {
            const Icon = m.icon;
            const isActive = mode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[10px] tracking-widest transition-all duration-200 cursor-pointer
                  ${isActive ? `${m.active} ${m.glow}` : "border-transparent text-[#4a5568] hover:text-white"}`}
              >
                <Icon className="w-3 h-3" />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Balance */}
        <div className="text-right">
          <div className="text-[10px] tracking-widest text-[#4a5568] uppercase">Balance</div>
          <div className="text-xl font-bold text-white tracking-tight" style={{ textShadow: "0 0 20px #00d4aa80" }}>
            $158.50
          </div>
          <div className="text-[10px] text-emerald-400">+$34.20 saved</div>
        </div>
      </div>

      {/* ── MAIN 3-COL GRID ── */}
      <div className="flex flex-1 min-h-0 divide-x divide-[#1a2030]">

        {/* ── COL 1: LIVE FEED ── */}
        <div className="flex flex-col w-[38%] min-h-0">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a2030] shrink-0">
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#4a5568]">Live Feed</span>
            <span className="ml-auto flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="text-[9px] text-emerald-400/70">streaming</span>
            </span>
          </div>
          <div
            ref={feedRef}
            className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 bg-[#0d1117] scrollbar-thin"
          >
            {feed.map(tx => (
              <div key={tx.id} className="flex items-center gap-2 text-[11px] py-0.5 border-b border-[#0f1923]">
                <span className="text-[#2d4a5a] shrink-0 w-[60px]">{tx.ts}</span>
                <span className={`shrink-0 w-[72px] text-[10px] ${PROVIDER_BADGE[tx.provider] ?? "text-gray-400"}`}>
                  {tx.provider}
                </span>
                <span className="text-[#6b7280] flex-1 truncate text-[10px]">{tx.label}</span>
                <span className={`shrink-0 text-right font-bold ${tx.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(3)}
                </span>
              </div>
            ))}
            <div className="text-emerald-400 text-[11px] mt-1">▋</div>
          </div>
        </div>

        {/* ── COL 2: GAUGES + ESTIMATOR ── */}
        <div className="flex flex-col w-[27%] min-h-0">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a2030] shrink-0">
            <Gauge className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#4a5568]">Providers</span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {[
              { name: "OpenAI",    pct: 48, color: "#3b82f6", spend: "$0.081" },
              { name: "Anthropic", pct: 31, color: "#f97316", spend: "$0.039" },
              { name: "Gemini",    pct: 21, color: "#22c55e", spend: "$0.008" },
            ].map(p => (
              <div key={p.name}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{ color: p.color }}>{p.name}</span>
                  <span className="text-[#6b7280]">{p.spend} · {p.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#1a2030] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${p.pct}%`, backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}60` }}
                  />
                </div>
              </div>
            ))}

            {/* Efficiency score */}
            <div className="mt-4 pt-4 border-t border-[#1a2030]">
              <div className="text-[10px] tracking-widest text-[#4a5568] uppercase mb-2">Efficiency Score</div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-cyan-400" style={{ textShadow: "0 0 15px #00d4aa80" }}>84</span>
                <span className="text-[#4a5568] text-sm mb-1">/ 100</span>
                <span className="ml-auto text-[10px] bg-emerald-400/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-400/30">EXCELLENT</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-[#1a2030] overflow-hidden">
                <div className="h-full rounded-full bg-cyan-400 w-[84%]" style={{ boxShadow: "0 0 8px #00d4aa" }} />
              </div>
            </div>

            {/* Cost estimator */}
            <div className="mt-4 pt-4 border-t border-[#1a2030]">
              <div className="text-[10px] tracking-widest text-[#4a5568] uppercase mb-2">Cost Estimator</div>
              <textarea
                className="w-full bg-[#0d1117] border border-[#1a2030] rounded text-[11px] text-[#94a3b8] p-2 resize-none focus:outline-none focus:border-cyan-400/50 placeholder:text-[#2d4a5a]"
                rows={3}
                placeholder="Paste prompt to estimate…"
                defaultValue="Summarize this document and extract key action items."
              />
              <div className="mt-2 space-y-1">
                {[
                  { p: "Gemini",    cost: "$0.00023", badge: "cheapest" },
                  { p: "OpenAI",    cost: "$0.00187" },
                  { p: "Anthropic", cost: "$0.00241" },
                ].map(r => (
                  <div key={r.p} className="flex items-center justify-between text-[10px] py-0.5">
                    <span className={PROVIDER_BADGE[r.p]}>{r.p}</span>
                    {r.badge && <span className="text-[9px] bg-emerald-400/10 text-emerald-400 px-1.5 rounded border border-emerald-400/20">{r.badge}</span>}
                    <span className="text-[#94a3b8] ml-auto">{r.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── COL 3: AI ASSISTANT ── */}
        <div className="flex flex-col w-[35%] min-h-0 bg-[#0d1117]">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a2030] shrink-0">
            <Bot className="w-3 h-3 text-violet-400" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#4a5568]">AI Assistant</span>
            <span className="ml-auto flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[9px] text-violet-400/70">Gemini 2.5 Flash</span>
            </span>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {CHAT_MSGS.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "bot" && (
                  <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-violet-400" />
                  </div>
                )}
                <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  {msg.text && (
                    <div className={`text-[11px] leading-relaxed px-3 py-2 rounded-xl
                      ${msg.role === "user"
                        ? "bg-indigo-500/20 border border-indigo-500/30 text-indigo-200"
                        : "bg-[#131c2e] border border-[#1a2030] text-[#94a3b8]"}`}>
                      {msg.text}
                    </div>
                  )}
                  {msg.card && (
                    <div className="bg-[#131c2e] border border-[#1f2937] rounded-xl px-3 py-2 w-full">
                      <div className="text-[10px] tracking-widest text-[#4a5568] uppercase mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-violet-400" />
                        {msg.card.title}
                      </div>
                      {msg.card.items.map((it, j) => (
                        <div key={j} className="flex justify-between text-[11px] py-0.5 border-b border-[#1a2030] last:border-0">
                          <span className="text-[#4a5568]">{it.label}</span>
                          <span className={it.color}>{it.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Chat input */}
          <div className="px-4 py-3 border-t border-[#1a2030] shrink-0">
            <div className="flex items-center gap-2 bg-[#080c10] border border-[#1f2937] rounded-xl px-3 py-2 focus-within:border-violet-500/50 transition-colors">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                className="flex-1 bg-transparent text-[11px] text-[#94a3b8] placeholder:text-[#2d4a5a] focus:outline-none"
                placeholder="Ask about your AI spending…"
              />
              {input && (
                <span className="text-[9px] text-violet-400/70 whitespace-nowrap">~$0.0004</span>
              )}
              <button
                onClick={() => setInput("")}
                className="text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
