import { Shell } from "@/components/layout/Shell";
import { StatCard } from "@/components/ui/StatCard";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import { useUsageData, useOptimize } from "@/hooks/use-app-data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { DollarSign, Wallet, BrainCircuit, Wand2, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const { data, isLoading } = useUsageData();
  const { mutate: optimize, isPending } = useOptimize();

  if (isLoading || !data) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="mb-8">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl md:text-4xl font-display font-bold text-foreground"
        >
          Overview
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground mt-2"
        >
          Monitor your AI API spend and active optimizations.
        </motion.p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Main Spend Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass-panel rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[220px]"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[60px] -translate-y-1/4 translate-x-1/4" />
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-medium text-muted-foreground">This Month's Spend</h2>
            </div>
            <div className="text-5xl font-display font-bold text-white tracking-tight">
              {formatCurrency(data.totalSpend)}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-border/50 pt-4">
            <div>
              <p className="text-sm text-muted-foreground">Projected Savings</p>
              <p className="text-lg font-semibold text-success">{data.savingsPercent}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-lg font-semibold text-white">{formatNumber(data.totalRequests)}</p>
            </div>
          </div>
        </motion.div>

        {/* Autopilot Status Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-panel rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[220px] success-glow border-success/30"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="w-5 h-5 text-success" />
                <h2 className="text-lg font-medium text-success">Autopilot Active</h2>
              </div>
              <p className="text-sm text-muted-foreground max-w-[200px]">
                Smart routing and semantic caching are optimizing your requests.
              </p>
            </div>
            <div className="w-3 h-3 rounded-full bg-success animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
          </div>

          <div className="relative z-10 mt-8 flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Saved by Autopilot</p>
              <div className="text-4xl font-display font-bold text-success tracking-tight">
                {formatCurrency(data.autopilotSaved)}
              </div>
            </div>
            <button
              onClick={() => optimize()}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Run Pass
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard 
          delay={0.2}
          title="Available Credits" 
          value={formatCurrency(data.credits)} 
          icon={<Wallet className="w-4 h-4" />} 
        />
        <StatCard 
          delay={0.3}
          title="Avg Cost / Request" 
          value={formatCurrency(data.avgCost)} 
          trend={{ value: "-4.2%", isPositive: true }}
        />
        <StatCard 
          delay={0.4}
          title="Top Tool" 
          value={data.topTool} 
          icon={<BrainCircuit className="w-4 h-4" />} 
          className="whitespace-nowrap overflow-hidden text-ellipsis"
        />
      </div>

      {/* Live Activity Feed */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-panel rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-foreground">Live Activity Feed</h2>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Polling Live
          </div>
        </div>
        
        <ActivityFeed items={data.activity.slice(0, 5)} />
      </motion.div>
    </Shell>
  );
}
