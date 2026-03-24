import { Shell } from "@/components/layout/Shell";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { BellRing, ShieldAlert, TrendingUp, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface AlertRule {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const RULES: AlertRule[] = [
  {
    id: "budget",
    title: "Budget Threshold",
    description: "Trigger alert when daily spend exceeds 80% of allocated budget limit.",
    icon: BellRing
  },
  {
    id: "spike",
    title: "Cost Spike Detection",
    description: "Detect unusual >50% hour-over-hour cost increases across any model.",
    icon: TrendingUp
  },
  {
    id: "drift",
    title: "Model Cost Drift",
    description: "Alert when a specific provider changes pricing or average latency degrades.",
    icon: ShieldAlert
  }
];

export default function Alerts() {
  // Using local state to simulate toggling since there's no alert update API
  const [activeAlerts, setActiveAlerts] = useState<Record<string, boolean>>({
    budget: true,
    spike: true,
    drift: false
  });

  const toggleAlert = (id: string) => {
    setActiveAlerts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Shell>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Alert Rules</h1>
        <p className="text-muted-foreground mt-2">Configure proactive notifications to prevent budget overruns.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        <div className="lg:col-span-3 space-y-4">
          {RULES.map((rule, i) => {
            const isActive = activeAlerts[rule.id];
            const Icon = rule.icon;
            
            return (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={rule.id}
                className={`glass-panel p-6 rounded-2xl flex items-center justify-between border transition-all duration-300 ${
                  isActive ? 'border-success/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'border-border/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl mt-1 transition-colors duration-300 ${
                    isActive ? 'bg-success/20 text-success' : 'bg-secondary text-muted-foreground'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold transition-colors ${isActive ? 'text-white' : 'text-foreground'}`}>
                      {rule.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md leading-relaxed">
                      {rule.description}
                    </p>
                  </div>
                </div>
                
                <div className="ml-4">
                  <Switch 
                    checked={isActive} 
                    onCheckedChange={() => toggleAlert(rule.id)}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="lg:col-span-2">
          <div className="glass-panel p-6 rounded-2xl border border-destructive/20 relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-64 h-64 bg-destructive/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />
            
            <div className="flex items-center gap-2 mb-6">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h2 className="font-display font-bold text-lg">Active Incident Simulation</h2>
            </div>

            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-5 relative z-10">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold px-2 py-1 rounded bg-destructive text-white uppercase tracking-wider">
                  Critical
                </span>
                <span className="text-xs text-destructive/70 font-mono">Just now</span>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Cost Spike Detected</h4>
              <p className="text-sm text-destructive/90 leading-relaxed mb-4">
                OpenAI GPT-4o usage has spiked 150% in the last 15 minutes. Current burn rate projects a $450 overrun by EOD.
              </p>
              
              <div className="flex gap-3">
                <button className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-semibold py-2 rounded-lg text-sm transition-colors shadow-lg shadow-destructive/20">
                  Acknowledge
                </button>
                <button className="flex-1 bg-background border border-destructive/30 hover:bg-destructive/10 text-white font-semibold py-2 rounded-lg text-sm transition-colors">
                  View Logs
                </button>
              </div>
            </div>
            
            <div className="mt-8 relative z-10">
              <h5 className="text-sm font-medium text-muted-foreground mb-3">Notification Channels</h5>
              <div className="flex gap-2">
                <div className="bg-secondary px-3 py-1.5 rounded-md text-xs font-medium border border-border flex items-center gap-2 opacity-50">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" /> Email
                </div>
                <div className="bg-success/10 text-success border border-success/30 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Slack #alerts
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Shell>
  );
}
