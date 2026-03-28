import React, { useState } from "react";
import { Leaf, Flame, Gauge, Send, Sparkles, Activity } from "lucide-react";

export default function FocusMode() {
  const [prompt, setPrompt] = useState("Explain the concept of quantum entanglement to a 5-year-old.");

  return (
    <div className="w-[1280px] h-[800px] bg-[#0a0a0f] text-slate-200 font-sans flex flex-col items-center justify-center relative overflow-hidden antialiased">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[680px] flex flex-col gap-8 z-10">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-widest text-slate-400">AI WALLET</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 hover:bg-slate-800 transition-colors border border-slate-700/50 text-xs font-medium text-slate-300">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>12 transactions</span>
          </button>
        </div>

        {/* Hero Card */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
          {/* Subtle top highlight */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-600/30 to-transparent" />
          
          <div className="text-sm font-medium text-slate-400 mb-2">Available Balance</div>
          
          <div className="text-6xl font-bold text-white tracking-tight mb-3 flex items-start justify-center">
            <span className="text-4xl text-slate-500 mt-1 mr-1">$</span>
            158.50
          </div>
          
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full text-xs font-medium mb-8 border border-emerald-400/20">
            <Leaf className="w-3.5 h-3.5" />
            <span>You've saved $34.20 this month</span>
          </div>

          {/* Spend Mode Selector */}
          <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-full max-w-md mx-auto">
            <button className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-slate-400 hover:text-slate-300 transition-colors hover:bg-slate-800/50">
              <Leaf className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium">Saver</span>
            </button>
            <button className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-400/30">
              <Gauge className="w-4 h-4" />
              <span className="text-xs font-medium">Balanced</span>
            </button>
            <button className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-slate-400 hover:text-slate-300 transition-colors hover:bg-slate-800/50">
              <Flame className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium">Performance</span>
            </button>
          </div>
        </div>

        {/* Prompt Cost Estimator */}
        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium text-slate-500 px-2 uppercase tracking-wider">
            Estimate cost before you send
          </div>
          
          <div className="relative group">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Paste your prompt here..."
              className="w-full bg-[#111827] border border-[#1f2937] rounded-2xl p-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none shadow-inner"
              rows={3}
            />
            {prompt.length === 0 && (
              <div className="absolute right-4 bottom-4 flex items-center gap-1 text-xs text-slate-500 pointer-events-none">
                <Sparkles className="w-3 h-3" /> Auto-estimate
              </div>
            )}
          </div>

          {/* Cost Estimates (Only show when there is text) */}
          <div className={`transition-all duration-300 ease-in-out ${prompt.length > 0 ? 'opacity-100 translate-y-0 h-auto' : 'opacity-0 -translate-y-2 h-0 overflow-hidden'}`}>
            <div className="flex flex-col gap-2 bg-[#111827]/50 rounded-2xl p-3 border border-[#1f2937]/50">
              <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-slate-300">Gemini 2.5 Flash</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">CHEAPEST</span>
                  <span className="text-sm font-medium text-white">$0.00023</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-1 px-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm text-slate-400">OpenAI GPT-4o</span>
                </div>
                <span className="text-sm font-medium text-slate-300">$0.00187</span>
              </div>
              
              <div className="flex items-center justify-between py-1 px-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm text-slate-400">Anthropic Claude</span>
                </div>
                <span className="text-sm font-medium text-slate-300">$0.00241</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 px-1">
              <button className="text-sm font-medium text-emerald-400 hover:text-emerald-300 px-4 py-2 rounded-full hover:bg-emerald-400/10 transition-colors border border-transparent">
                Use cheapest
              </button>
              <button className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white px-6 py-2.5 rounded-full font-medium shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] hover:-translate-y-0.5 transition-all">
                <span>Send via Gemini →</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collapsed Activity */}
        <div className="flex items-center justify-center gap-3 mt-6 pb-8">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/30 border border-slate-700/30 text-[11px] text-slate-400 font-medium">
            <span className="text-slate-500">−$0.032</span>
            <span>OpenAI</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-700" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-900/10 border border-emerald-900/30 text-[11px] text-emerald-500 font-medium">
            <span>+$9.60 saved</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-700" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/30 border border-slate-700/30 text-[11px] text-slate-400 font-medium">
            <span className="text-slate-500">−$0.018</span>
            <span>Anthropic</span>
          </div>
        </div>

      </div>
    </div>
  );
}
