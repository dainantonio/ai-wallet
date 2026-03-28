import React, { useState } from "react";
import { 
  Wallet, 
  TrendingDown, 
  PieChart, 
  Calendar, 
  Lightbulb, 
  ArrowUpRight, 
  CheckCircle, 
  Bell, 
  Search, 
  Settings,
  History,
  Activity,
  ChevronRight,
  Zap,
  Shield,
  Clock
} from "lucide-react";

export default function FinancialPlanner() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [budgetMode, setBudgetMode] = useState("Balanced");

  const navItems = ["Overview", "Providers", "History", "Alerts"];

  const transactions = [
    { id: 1, time: "Today, 10:23 AM", desc: "GPT-4 Vision Analysis", provider: "OpenAI", providerColor: "bg-emerald-100 text-emerald-700", amount: "-$1.24", isCost: true },
    { id: 2, time: "Today, 09:15 AM", desc: "Claude 3 Opus Research", provider: "Anthropic", providerColor: "bg-amber-100 text-amber-700", amount: "-$0.85", isCost: true },
    { id: 3, time: "Yesterday", desc: "Smart Routing Savings", provider: "System", providerColor: "bg-indigo-100 text-indigo-700", amount: "+$0.42", isCost: false },
    { id: 4, time: "Yesterday", desc: "Gemini Pro Batch Process", provider: "Gemini", providerColor: "bg-blue-100 text-blue-700", amount: "-$2.10", isCost: true },
    { id: 5, time: "Mar 12, 2024", desc: "Cache Hit: Daily Summary", provider: "System", providerColor: "bg-indigo-100 text-indigo-700", amount: "+$0.15", isCost: false },
    { id: 6, time: "Mar 12, 2024", desc: "GPT-3.5 Turbo Chat", provider: "OpenAI", providerColor: "bg-emerald-100 text-emerald-700", amount: "-$0.05", isCost: true },
  ];

  return (
    <div className="w-[1280px] h-[800px] overflow-y-auto bg-[#f8f9fc] text-[#1a1a2e] font-sans antialiased">
      {/* Navigation Bar */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10 px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Wallet size={18} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight">AI Wallet</span>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => setActiveTab(item)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === item 
                  ? "bg-indigo-50 text-indigo-700" 
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-gray-600">
            <Search size={18} />
          </button>
          <button className="text-gray-400 hover:text-gray-600 relative">
            <Bell size={18} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          <div className="w-px h-6 bg-gray-200 mx-2"></div>
          <div className="flex items-center gap-2 cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-medium text-sm shadow-sm group-hover:shadow transition-shadow">
              AJ
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - 60% */}
          <div className="w-full lg:w-[60%] space-y-6">
            
            {/* Monthly Budget Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
                    <Calendar size={14} /> Monthly AI Budget
                  </h2>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tight">$158.50</span>
                    <span className="text-gray-400 font-medium">of $200.00</span>
                  </div>
                </div>
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-emerald-100">
                  <CheckCircle size={12} /> On track
                </div>
              </div>

              <div className="space-y-3">
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: "79%" }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">79% used</span>
                  <span className="text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded text-xs">21 days remaining</span>
                </div>
              </div>
            </div>

            {/* Spend by Provider & History Charts Row */}
            <div className="grid grid-cols-2 gap-6">
              {/* Spend by Provider Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-gray-500 text-sm font-medium mb-5 flex items-center gap-2">
                  <PieChart size={14} /> Spend by Provider
                </h3>
                
                <div className="space-y-5">
                  <div className="h-6 flex rounded-md overflow-hidden shadow-inner">
                    <div className="bg-emerald-500 w-[48%]" title="OpenAI: 48%"></div>
                    <div className="bg-amber-500 w-[31%]" title="Anthropic: 31%"></div>
                    <div className="bg-blue-500 w-[21%]" title="Gemini: 21%"></div>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                        <span className="font-medium">OpenAI</span>
                      </div>
                      <span className="text-gray-500">48% ($76.08)</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-amber-500"></div>
                        <span className="font-medium">Anthropic</span>
                      </div>
                      <span className="text-gray-500">31% ($49.13)</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                        <span className="font-medium">Gemini</span>
                      </div>
                      <span className="text-gray-500">21% ($33.29)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Trend Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
                <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
                  <Activity size={14} /> Weekly Trend
                </h3>
                <div className="text-lg font-semibold mb-6">+$12.40 vs last week</div>
                
                <div className="flex-1 flex items-end gap-3 justify-between pb-2">
                  {[45, 60, 35, 85].map((height, i) => (
                    <div key={i} className="w-full flex flex-col items-center gap-2">
                      <div className="w-full bg-indigo-50 rounded-t-md relative group h-32 flex items-end">
                        <div 
                          className={`w-full rounded-t-md transition-all ${i === 3 ? 'bg-indigo-600' : 'bg-indigo-200 group-hover:bg-indigo-300'}`}
                          style={{ height: `${height}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">W{i+1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
          </div>

          {/* Right Column - 40% */}
          <div className="w-full lg:w-[40%] space-y-6">
            
            {/* Savings Summary Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              
              <div className="relative z-10">
                <h2 className="text-gray-500 text-sm font-medium mb-2 flex items-center gap-2">
                  <TrendingDown size={14} className="text-emerald-500" /> Savings Summary
                </h2>
                <div className="mb-6 flex items-end gap-6">
                  <div>
                    <div className="text-4xl font-bold text-emerald-600 tracking-tight mb-1">$34.20 <span className="text-xl text-emerald-600/70">saved</span></div>
                    <p className="text-sm text-gray-500">That's <strong className="text-gray-700">18%</strong> of your total spend</p>
                  </div>
                  <div className="relative w-16 h-16 ml-auto">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 transform -rotate-90">
                      <path
                        className="text-gray-100"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="text-emerald-500"
                        strokeDasharray="18, 100"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-sm font-medium">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Zap size={12} />
                      </div>
                      Smart Routing
                    </div>
                    <span className="text-emerald-600 font-semibold text-sm">+$12.40</span>
                  </div>
                  <div className="h-px w-full bg-gray-200"></div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-sm font-medium">
                      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                        <History size={12} />
                      </div>
                      Cache Hits
                    </div>
                    <span className="text-emerald-600 font-semibold text-sm">+$9.60</span>
                  </div>
                  <div className="h-px w-full bg-gray-200"></div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-sm font-medium">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Shield size={12} />
                      </div>
                      Rate Limit Prevention
                    </div>
                    <span className="text-emerald-600 font-semibold text-sm">+$12.20</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Budget Mode Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-gray-900 font-semibold flex items-center gap-2">
                  <Settings size={16} className="text-gray-400" /> Spend Mode
                </h3>
              </div>
              
              <div className="space-y-3">
                {[
                  { id: "Saver", name: "Conservative", desc: "Favor cheaper models, aggressive caching", icon: Shield },
                  { id: "Balanced", name: "Balanced", desc: "Smart routing for optimal cost/quality", icon: Zap },
                  { id: "Performance", name: "Aggressive", desc: "Always use best model, minimal caching", icon: Activity }
                ].map((mode) => (
                  <div 
                    key={mode.id}
                    onClick={() => setBudgetMode(mode.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
                      budgetMode === mode.id 
                        ? "border-indigo-600 bg-indigo-50" 
                        : "border-transparent hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      budgetMode === mode.id ? "border-indigo-600" : "border-gray-300"
                    }`}>
                      {budgetMode === mode.id && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">{mode.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{mode.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Insight */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100/50 flex gap-4 shadow-[0_2px_10px_-4px_rgba(251,191,36,0.1)]">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                <Lightbulb size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 text-sm mb-1">Optimization Idea</h4>
                <p className="text-amber-700/80 text-sm leading-relaxed mb-3">
                  Switching your background tasks from GPT-4 to Claude 3 Haiku could save you ~$45/month with minimal quality loss.
                </p>
                <button className="text-amber-700 text-sm font-semibold flex items-center gap-1 hover:text-amber-800 transition-colors">
                  Review configuration <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
            
          </div>
        </div>

        {/* Recent Transactions Full Width */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={16} className="text-gray-400" /> Recent Transactions
            </h3>
            <button className="text-indigo-600 text-sm font-medium hover:text-indigo-700 flex items-center gap-1">
              View all <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-3 font-medium">Time</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium">Provider</th>
                  <th className="px-6 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{tx.time}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{tx.desc}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tx.providerColor}`}>
                        {tx.provider}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right font-semibold ${tx.isCost ? 'text-red-600' : 'text-emerald-600'}`}>
                      {tx.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
