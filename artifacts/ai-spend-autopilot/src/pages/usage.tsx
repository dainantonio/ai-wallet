import { Shell } from "@/components/layout/Shell";
import { useUsageData } from "@/hooks/use-app-data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import { motion } from "framer-motion";
import { Cpu, ServerCrash, Clock } from "lucide-react";

export default function Usage() {
  const { data, isLoading } = useUsageData();

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
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Usage & Models</h1>
        <p className="text-muted-foreground mt-2">Deep dive into your API consumption and model distribution.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Requests */}
        <div className="glass-panel p-6 rounded-2xl col-span-1 lg:col-span-2">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Cpu className="w-5 h-5" />
            <h3 className="font-medium">Total API Requests</h3>
          </div>
          <div className="text-5xl font-display font-bold text-white mb-2">
            {formatNumber(data.totalRequests)}
          </div>
          <p className="text-sm text-success flex items-center gap-1">
            <span className="bg-success/10 px-2 py-0.5 rounded-full">+12.4%</span> vs last month
          </p>
        </div>

        {/* Avg Latency */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Clock className="w-5 h-5" />
            <h3 className="font-medium">Avg Latency</h3>
          </div>
          <div className="text-4xl font-display font-bold text-white mb-2">
            {data.avgLatency}s
          </div>
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full w-[45%]" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Breakdown */}
        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-xl font-display font-bold mb-6">Model Distribution</h2>
          <div className="space-y-6">
            {data.models.map((model, i) => (
              <div key={model.model} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-medium text-foreground">{model.model}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(model.requests)} reqs • {model.avgLatency}s avg</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-mono">{formatCurrency(model.cost)}</p>
                    <p className="text-xs text-muted-foreground">{model.percentage}% of volume</p>
                  </div>
                </div>
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${model.percentage}%` }}
                    transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary to-indigo-400 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Extended Activity Log */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold">Recent Activity Log</h2>
            <ServerCrash className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <ActivityFeed items={data.activity.slice(0, 10)} />
          </div>
        </div>
      </div>
    </Shell>
  );
}
