import React, { useState } from "react";
import { 
  Send, 
  Bot, 
  Wallet, 
  TrendingDown, 
  BarChart2, 
  Zap, 
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Settings,
  MessageSquare
} from "lucide-react";

export function ConversationFirst() {
  const [inputValue, setInputValue] = useState("");

  return (
    <div 
      className="flex h-[800px] w-[1280px] overflow-hidden text-slate-200 font-sans"
      style={{ backgroundColor: "#141820" }}
    >
      {/* Sidebar */}
      <div 
        className="w-[280px] flex-shrink-0 flex flex-col border-r border-slate-800"
        style={{ backgroundColor: "#0f1117" }}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-white">AI Wallet</span>
        </div>

        <div className="px-4 py-2">
          <p className="text-xs font-medium text-slate-500 mb-3 px-2 uppercase tracking-wider">Conversation Topics</p>
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50 text-slate-200 transition-colors">
              <MessageSquare className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-medium">Today's Summary</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/30 text-slate-400 hover:text-slate-200 transition-colors">
              <BarChart2 className="h-4 w-4" />
              <span className="text-sm font-medium">Provider Costs</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/30 text-slate-400 hover:text-slate-200 transition-colors">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm font-medium">Optimization Tips</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/30 text-slate-400 hover:text-slate-200 transition-colors">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Budget Alerts</span>
            </button>
          </div>
        </div>

        <div className="mt-auto p-4">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Spend Mode</span>
              <Settings className="h-3 w-3 text-slate-500" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-sm font-medium text-slate-200">Balanced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-full">
        {/* Header */}
        <div className="h-16 border-b border-slate-800/60 flex items-center px-6 justify-between flex-shrink-0 bg-[#141820]/80 backdrop-blur-sm z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center p-0.5">
                <div className="bg-[#141820] h-full w-full rounded-full flex items-center justify-center">
                  <Bot className="h-5 w-5 text-violet-400" />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-[#141820]"></div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">AI Wallet Assistant</h2>
              <p className="text-xs text-slate-400">Always monitoring your spend</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-200 p-2">
            <Wallet className="h-5 w-5" />
          </button>
        </div>

        {/* Chat Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Message 1: Summary Card */}
          <div className="flex gap-4 max-w-[85%]">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-sm text-slate-400 ml-1">AI Wallet Assistant • 9:00 AM</div>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-300">
                Good morning! Here is your AI Wallet summary for today. You're doing great on efficiency.
                
                <div className="mt-4 bg-[#1a1f2b] border border-slate-700/60 rounded-xl p-5 w-[380px]">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Current Balance</div>
                    <div className="bg-violet-500/10 text-violet-400 text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1">
                      <Zap className="h-3 w-3" /> 84/100 Efficiency
                    </div>
                  </div>
                  <div className="text-4xl font-light text-white tracking-tight mb-6">
                    $158.50
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
                      <div className="text-xs text-slate-500 mb-1">Total Saved</div>
                      <div className="text-lg text-emerald-400 font-medium">+$34.20</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
                      <div className="text-xs text-slate-500 mb-1">Est. Days Left</div>
                      <div className="text-lg text-slate-200 font-medium">14 Days</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Message 2: Breakdown Card */}
          <div className="flex gap-4 max-w-[85%]">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-300">
                Here's your spending breakdown by provider this month.
                
                <div className="mt-4 bg-[#1a1f2b] border border-slate-700/60 rounded-xl p-5 w-[380px]">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-300 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>OpenAI</span>
                        <span className="text-slate-400">48% ($42.10)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: "48%" }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-300 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Anthropic</span>
                        <span className="text-slate-400">31% ($27.20)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: "31%" }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-300 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Gemini</span>
                        <span className="text-slate-400">21% ($18.42)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: "21%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Message 3: Optimization Tips */}
          <div className="flex gap-4 max-w-[85%]">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-300">
                I analyzed your usage and found 3 ways to save money this week:
                
                <div className="mt-4 bg-[#1a1f2b] border border-slate-700/60 rounded-xl p-4 w-[420px] space-y-3">
                  <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-200">Switch background tasks to GPT-4o-mini</p>
                      <p className="text-xs text-slate-400 mt-1">Saves ~$12/mo with no quality drop for these specific tasks.</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500 ml-auto mt-1" />
                  </div>
                  <div className="h-px w-full bg-slate-800"></div>
                  <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-200">Enable Prompt Caching on Claude</p>
                      <p className="text-xs text-slate-400 mt-1">You have long context prompts that could benefit from caching.</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500 ml-auto mt-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Message */}
          <div className="flex gap-4 max-w-[85%] self-end ml-auto justify-end">
            <div className="flex flex-col gap-2 items-end">
              <div className="bg-teal-600/20 text-teal-100 border border-teal-500/30 rounded-2xl rounded-tr-sm px-5 py-3 text-sm">
                What's my biggest cost driver right now?
              </div>
            </div>
          </div>

          {/* Bot Response */}
          <div className="flex gap-4 max-w-[85%] pb-8">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-300">
                Your biggest cost driver is the <span className="text-amber-400 font-medium">Data Processing Pipeline</span> using Claude 3.5 Sonnet.
                
                <div className="mt-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl p-5 w-[400px]">
                  <div className="flex items-center gap-2 text-amber-500 mb-2">
                    <TrendingDown className="h-4 w-4" />
                    <span className="font-semibold text-sm">Cost Alert</span>
                  </div>
                  <p className="text-slate-300 text-sm mb-4">
                    This single pipeline accounts for <strong className="text-white">38% of your total spend</strong> ($33.15 this week). The context window is averaging 120k tokens.
                  </p>
                  <button className="w-full bg-slate-800 hover:bg-slate-700 text-white text-sm py-2 rounded-lg border border-slate-600 transition-colors">
                    View Pipeline Details
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Input Bar */}
        <div className="p-4 bg-[#141820] border-t border-slate-800/60 z-10">
          <div className="max-w-4xl mx-auto relative">
            {inputValue.length > 0 && (
              <div className="absolute -top-8 left-4 bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-md border border-slate-700 flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
                ~$0.0004 via Gemini
              </div>
            )}
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about your AI spending..."
                className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-full pl-6 pr-14 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all placeholder:text-slate-500 shadow-sm"
              />
              <button 
                className={`absolute right-2 p-2 rounded-full transition-all duration-200 ${
                  inputValue.length > 0 
                    ? "bg-violet-600 text-white hover:bg-violet-500 shadow-md shadow-violet-500/20" 
                    : "bg-slate-700/50 text-slate-400"
                }`}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="text-center mt-2">
              <span className="text-[10px] text-slate-500">AI responses may occasionally be inaccurate. Always verify actual billing platforms.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConversationFirst;
