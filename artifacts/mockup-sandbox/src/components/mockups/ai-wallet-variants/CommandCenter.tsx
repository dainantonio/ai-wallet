import React, { useState, useEffect, useRef } from 'react';
import { Zap, TrendingDown, Gauge, Flame, Leaf, Terminal, Activity, AlertTriangle, Cpu, DollarSign } from 'lucide-react';

// Types
type Provider = 'OpenAI' | 'Anthropic' | 'Gemini';

type Transaction = {
  id: string;
  timestamp: string;
  provider: Provider;
  model: string;
  amount: number;
  isCost: boolean;
  type: 'inference' | 'optimization' | 'cache_hit';
};

// Initial Data
const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', timestamp: '14:23:01.042', provider: 'OpenAI', model: 'gpt-4o', amount: 0.0420, isCost: true, type: 'inference' },
  { id: '2', timestamp: '14:23:02.115', provider: 'Anthropic', model: 'claude-3-opus', amount: 0.1250, isCost: true, type: 'inference' },
  { id: '3', timestamp: '14:23:05.881', provider: 'OpenAI', model: 'gpt-4o-mini', amount: 0.0015, isCost: true, type: 'inference' },
  { id: '4', timestamp: '14:23:10.002', provider: 'Gemini', model: 'gemini-1.5-pro', amount: 0.0310, isCost: true, type: 'inference' },
  { id: '5', timestamp: '14:23:12.441', provider: 'Anthropic', model: 'claude-3-haiku', amount: 0.0040, isCost: true, type: 'inference' },
  { id: '6', timestamp: '14:23:15.901', provider: 'OpenAI', model: 'router', amount: 0.0850, isCost: false, type: 'optimization' },
  { id: '7', timestamp: '14:23:18.220', provider: 'OpenAI', model: 'gpt-4o', amount: 0.0000, isCost: false, type: 'cache_hit' },
  { id: '8', timestamp: '14:23:22.105', provider: 'Gemini', model: 'gemini-1.5-flash', amount: 0.0020, isCost: true, type: 'inference' },
  { id: '9', timestamp: '14:23:25.663', provider: 'Anthropic', model: 'claude-3-sonnet', amount: 0.0150, isCost: true, type: 'inference' },
  { id: '10', timestamp: '14:23:28.091', provider: 'OpenAI', model: 'gpt-4o', amount: 0.0610, isCost: true, type: 'inference' },
  { id: '11', timestamp: '14:23:31.442', provider: 'Anthropic', model: 'router', amount: 0.0420, isCost: false, type: 'optimization' },
  { id: '12', timestamp: '14:23:35.811', provider: 'Gemini', model: 'gemini-1.5-pro', amount: 0.0280, isCost: true, type: 'inference' },
];

const PROVIDER_COLORS = {
  OpenAI: '#10a37f',
  Anthropic: '#d97757',
  Gemini: '#4285f4'
};

const NEW_TX_POOL: Omit<Transaction, 'id' | 'timestamp'>[] = [
  { provider: 'OpenAI', model: 'gpt-4o', amount: 0.0550, isCost: true, type: 'inference' },
  { provider: 'Anthropic', model: 'claude-3-sonnet', amount: 0.0120, isCost: true, type: 'inference' },
  { provider: 'Gemini', model: 'gemini-1.5-flash', amount: 0.0010, isCost: true, type: 'inference' },
  { provider: 'OpenAI', model: 'gpt-4o-mini', amount: 0.0000, isCost: false, type: 'cache_hit' },
  { provider: 'Anthropic', model: 'claude-3-opus', amount: 0.1500, isCost: true, type: 'inference' },
  { provider: 'OpenAI', model: 'router', amount: 0.1200, isCost: false, type: 'optimization' },
];

export default function CommandCenter() {
  const [mode, setMode] = useState<'Saver' | 'Balanced' | 'Performance'>('Balanced');
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll feed
  useEffect(() => {
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transactions]);

  // Live feed simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setTransactions(prev => {
        const template = NEW_TX_POOL[Math.floor(Math.random() * NEW_TX_POOL.length)];
        const now = new Date();
        const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
        
        const newTx: Transaction = {
          ...template,
          id: Math.random().toString(36).substr(2, 9),
          timestamp
        };
        
        // Keep last 50
        const updated = [...prev, newTx];
        if (updated.length > 50) return updated.slice(updated.length - 50);
        return updated;
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-[1280px] h-[800px] bg-[#080c10] text-slate-300 font-sans overflow-hidden flex flex-col relative border border-[#1a2030] shadow-2xl shadow-black/50">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'linear-gradient(#00d4aa 1px, transparent 1px), linear-gradient(90deg, #00d4aa 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
           
      {/* TOP BAR */}
      <header className="h-[70px] border-b border-[#1a2030] flex items-center justify-between px-6 shrink-0 relative z-10 bg-[#080c10]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#00d4aa]/10 border border-[#00d4aa]/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-[#00d4aa]" />
          </div>
          <div>
            <h1 className="text-white font-bold tracking-wider text-sm uppercase">AI Wallet</h1>
            <div className="text-[10px] text-[#00d4aa] font-mono tracking-widest uppercase opacity-80">Mission Control</div>
          </div>
        </div>
        
        {/* Hardware Toggle */}
        <div className="flex bg-[#0d1117] border border-[#1a2030] p-1 rounded-sm">
          {(['Saver', 'Balanced', 'Performance'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-6 py-1.5 text-xs font-bold uppercase tracking-widest transition-all ${
                mode === m 
                  ? 'bg-[#1a2030] text-white shadow-[0_0_10px_rgba(0,212,170,0.3)] border border-[#00d4aa]/30' 
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        
        <div className="text-right flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-[#00d4aa] font-mono tracking-widest uppercase">Total Saved</span>
            <span className="text-[#00d4aa] font-mono font-bold drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]">+$34.20</span>
          </div>
          <div className="h-8 w-px bg-[#1a2030]"></div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Live Balance</span>
            <span className="text-white font-mono text-2xl font-bold drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] animate-[pulse_4s_ease-in-out_infinite]">
              $158.50
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* LEFT COLUMN: LIVE FEED (~45%) */}
        <div className="w-[45%] border-r border-[#1a2030] flex flex-col bg-[#0d1117]/50">
          <div className="h-10 border-b border-[#1a2030] flex items-center px-4 bg-[#080c10]">
            <Terminal className="w-4 h-4 text-[#00d4aa] mr-2" />
            <span className="text-[10px] text-slate-400 font-mono tracking-[0.2em] uppercase">Live Transaction Feed</span>
            <div className="ml-auto flex gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00d4aa] animate-pulse"></span>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden relative p-4 font-mono text-xs leading-relaxed flex flex-col">
            <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-1">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center hover:bg-[#1a2030]/50 px-2 py-1 -mx-2 rounded transition-colors group">
                  <span className="text-slate-500 w-[90px] shrink-0">{tx.timestamp}</span>
                  
                  <span className="w-[10px] mx-2 flex justify-center shrink-0">
                    {tx.type === 'inference' ? (
                      <span className="text-slate-600">›</span>
                    ) : tx.type === 'cache_hit' ? (
                      <Zap className="w-3 h-3 text-[#00d4aa]" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-[#00d4aa]" />
                    )}
                  </span>
                  
                  <div className="w-[90px] shrink-0">
                    <span 
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider"
                      style={{ color: PROVIDER_COLORS[tx.provider], backgroundColor: `${PROVIDER_COLORS[tx.provider]}15` }}
                    >
                      {tx.provider.toUpperCase()}
                    </span>
                  </div>
                  
                  <span className="text-slate-300 truncate flex-1">{tx.model}</span>
                  
                  <div className="w-[80px] text-right shrink-0">
                    {tx.isCost ? (
                      <span className="text-[#ff4444] drop-shadow-[0_0_5px_rgba(255,68,68,0.4)]">
                        -${tx.amount.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-[#00d4aa] drop-shadow-[0_0_5px_rgba(0,212,170,0.4)]">
                        {tx.amount === 0 ? 'FREE' : `+$${tx.amount.toFixed(4)}`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={feedEndRef} className="h-4 flex items-center">
                <span className="w-2 h-4 bg-[#00d4aa] animate-pulse inline-block opacity-70"></span>
              </div>
            </div>
            
            {/* Fade out top */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-[#0d1117] to-transparent pointer-events-none"></div>
          </div>
        </div>

        {/* MIDDLE COLUMN: ANALYTICS (~30%) */}
        <div className="w-[30%] border-r border-[#1a2030] flex flex-col bg-[#080c10]">
          <div className="h-10 border-b border-[#1a2030] flex items-center px-4">
            <Gauge className="w-4 h-4 text-slate-400 mr-2" />
            <span className="text-[10px] text-slate-400 font-mono tracking-[0.2em] uppercase">System Telemetry</span>
          </div>
          
          <div className="p-6 flex flex-col gap-8 flex-1 overflow-y-auto">
            {/* Efficiency Score */}
            <div className="relative flex flex-col items-center justify-center p-6 border border-[#1a2030] bg-[#0d1117]/30 rounded-lg overflow-hidden">
              <div className="absolute top-0 right-0 p-2">
                <Leaf className="w-4 h-4 text-[#00d4aa] opacity-50" />
              </div>
              
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#1a2030" strokeWidth="8" fill="none" />
                <circle 
                  cx="50" cy="50" r="40" 
                  stroke="#00d4aa" strokeWidth="8" fill="none" 
                  strokeDasharray="251.2" strokeDashoffset="40.192" 
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]"
                />
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-mono font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">84</span>
                <span className="text-[10px] text-[#00d4aa] font-mono tracking-widest">SCORE</span>
              </div>
              
              <div className="mt-4 text-center">
                <div className="text-[10px] text-slate-500 font-mono tracking-[0.2em] uppercase mb-1">Efficiency Level</div>
                <div className="text-sm font-bold text-[#00d4aa] uppercase tracking-wider">Highly Optimized</div>
              </div>
            </div>

            {/* Provider Gauges */}
            <div className="space-y-4">
              <div className="text-[10px] text-slate-500 font-mono tracking-[0.2em] uppercase border-b border-[#1a2030] pb-2">Load Distribution</div>
              
              <div className="flex justify-between items-center gap-4">
                {[
                  { name: 'OpenAI', value: 65, color: PROVIDER_COLORS.OpenAI, cost: '$84.20' },
                  { name: 'Anthropic', value: 25, color: PROVIDER_COLORS.Anthropic, cost: '$32.10' },
                  { name: 'Gemini', value: 10, color: PROVIDER_COLORS.Gemini, cost: '$12.50' }
                ].map(provider => (
                  <div key={provider.name} className="flex flex-col items-center gap-2 flex-1">
                    <div className="relative w-16 h-16">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background track (semi-circular) */}
                        <path 
                          d="M 20 80 A 40 40 0 1 1 80 80" 
                          stroke="#1a2030" strokeWidth="10" fill="none" strokeLinecap="round" 
                        />
                        {/* Value arc */}
                        <path 
                          d="M 20 80 A 40 40 0 1 1 80 80" 
                          stroke={provider.color} strokeWidth="10" fill="none" strokeLinecap="round"
                          strokeDasharray="188.5" 
                          strokeDashoffset={188.5 - (188.5 * provider.value / 100)}
                          style={{ filter: `drop-shadow(0 0 4px ${provider.color})` }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                        <span className="text-[10px] font-mono font-bold" style={{ color: provider.color }}>{provider.value}%</span>
                      </div>
                    </div>
                    <div className="text-center mt-[-10px]">
                      <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{provider.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{provider.cost}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Savings Rate */}
            <div className="mt-auto pt-6 border-t border-[#1a2030]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-slate-500 font-mono tracking-[0.2em] uppercase">Current Savings Rate</span>
                <span className="text-[#00d4aa] font-mono text-xs font-bold">28.4%</span>
              </div>
              <div className="h-8 w-full bg-[#0d1117] border border-[#1a2030] flex">
                <div className="h-full bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.2)_25%,rgba(0,0,0,0.2)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.2)_75%,rgba(0,0,0,0.2)_100%)] bg-[length:20px_20px] w-[28.4%] bg-[#00d4aa] flex items-center justify-end px-2 shadow-[0_0_15px_rgba(0,212,170,0.3)] border-r border-[#00d4aa]">
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ESTIMATOR (~25%) */}
        <div className="w-[25%] flex flex-col bg-[#0d1117]/80">
          <div className="h-10 border-b border-[#1a2030] flex items-center px-4 bg-[#080c10]">
            <Cpu className="w-4 h-4 text-slate-400 mr-2" />
            <span className="text-[10px] text-slate-400 font-mono tracking-[0.2em] uppercase">Cost Estimator</span>
          </div>

          <div className="p-4 flex flex-col gap-4 flex-1">
            
            {/* Input Area */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Input Payload</label>
              <textarea 
                className="w-full h-32 bg-[#080c10] border border-[#1a2030] focus:border-[#00d4aa]/50 focus:ring-1 focus:ring-[#00d4aa]/50 rounded p-3 text-xs font-mono text-slate-300 resize-none outline-none"
                defaultValue="System: You are an expert analyzing financial documents...&#10;User: Please summarize the Q3 earnings report attached below..."
                spellCheck={false}
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>~850 tokens</span>
                <span>Est. Output: 400 tokens</span>
              </div>
            </div>

            <button className="w-full py-2.5 bg-[#1a2030] hover:bg-[#252d3d] border border-[#2d3748] text-white font-mono text-xs font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2">
              <Zap className="w-3 h-3 text-[#00d4aa]" />
              Run Estimate
            </button>

            {/* Results */}
            <div className="mt-4 flex flex-col gap-2">
              <div className="text-[10px] text-slate-500 font-mono tracking-[0.2em] uppercase border-b border-[#1a2030] pb-2">Projections</div>
              
              <div className="flex items-center justify-between p-2 border border-[#1a2030] bg-[#080c10] rounded relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#10a37f]"></div>
                <div className="pl-3 flex flex-col">
                  <span className="text-xs font-bold text-white">GPT-4o</span>
                  <span className="text-[10px] text-slate-500 font-mono">OpenAI</span>
                </div>
                <div className="text-right flex flex-col">
                  <span className="text-xs font-mono text-[#ff4444]">$0.0068</span>
                  <span className="text-[10px] text-slate-500 font-mono">Standard</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 border border-[#00d4aa]/30 bg-[#00d4aa]/5 rounded relative overflow-hidden shadow-[0_0_10px_rgba(0,212,170,0.1)]">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#d97757]"></div>
                <div className="absolute right-0 top-0 px-1.5 py-0.5 bg-[#00d4aa]/20 text-[#00d4aa] text-[8px] font-bold tracking-wider uppercase rounded-bl">Best Value</div>
                <div className="pl-3 flex flex-col mt-2">
                  <span className="text-xs font-bold text-white">Claude 3.5 Haiku</span>
                  <span className="text-[10px] text-slate-500 font-mono">Anthropic</span>
                </div>
                <div className="text-right flex flex-col mt-2">
                  <span className="text-xs font-mono text-[#00d4aa] drop-shadow-[0_0_2px_rgba(0,212,170,0.8)]">$0.0006</span>
                  <span className="text-[10px] text-slate-500 font-mono">-91% cost</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 border border-[#1a2030] bg-[#080c10] rounded relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4285f4]"></div>
                <div className="pl-3 flex flex-col">
                  <span className="text-xs font-bold text-white">Gemini 1.5 Flash</span>
                  <span className="text-[10px] text-slate-500 font-mono">Google</span>
                </div>
                <div className="text-right flex flex-col">
                  <span className="text-xs font-mono text-slate-300">$0.0009</span>
                  <span className="text-[10px] text-slate-500 font-mono">-86% cost</span>
                </div>
              </div>
            </div>

            {/* Warnings/Tips */}
            <div className="mt-auto border-l-2 border-amber-500 bg-amber-500/5 p-3 flex gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-amber-500 tracking-wider uppercase">Optimization Avail</span>
                <span className="text-[10px] text-slate-400 leading-relaxed font-mono">
                  Prompt contains 40% redundant context. Semantic cache hit rate for similar queries is 68%.
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
