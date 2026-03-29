import { Shell } from "@/components/layout/Shell";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Zap, Network, Database, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Autopilot() {
  const [config, setConfig] = useState({
    smartRouting: true,
    semanticCaching: true,
  });

  const [airtableStatus, setAirtableStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleTestConnection = () => {
    setAirtableStatus('testing');
    setTimeout(() => {
      // Simulate an 80% success rate for the demo
      setAirtableStatus(Math.random() > 0.2 ? 'success' : 'error');
    }, 1500);
  };

  return (
    <Shell>
      <header className="mb-8">
        <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight heading-gradient">Autopilot Configuration</h1>
        <p className="text-muted-foreground mt-2 text-sm">Manage autonomous routing and caching to minimize spend.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Engine Settings */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border-l-[3px] border-l-primary relative overflow-hidden stat-card-premium" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.05) inset, 0 8px 40px -8px rgba(0,0,0,0.6), -4px 0 20px -8px rgba(99,102,241,0.3)" }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2" />
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Network className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Smart Routing</h2>
              </div>
              <Switch 
                checked={config.smartRouting}
                onCheckedChange={(c) => setConfig({ ...config, smartRouting: c })}
              />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed relative z-10">
              Automatically routes prompts to the most cost-effective model that meets your required capabilities. Falls back to heavier models only when prompt complexity demands it.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border-l-[3px] border-l-accent relative overflow-hidden stat-card-premium" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.05) inset, 0 8px 40px -8px rgba(0,0,0,0.6), -4px 0 20px -8px rgba(139,92,246,0.25)" }}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Database className="w-5 h-5 text-accent" />
                </div>
                <h2 className="text-xl font-bold">Semantic Caching</h2>
              </div>
              <Switch 
                checked={config.semanticCaching}
                onCheckedChange={(c) => setConfig({ ...config, semanticCaching: c })}
              />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Stores responses for similar prompts. When a user asks a question conceptually identical to a cached one, we serve the cache instead of calling the LLM API, saving 100% of the cost.
            </p>
          </div>
        </div>

        {/* Integration Settings */}
        <div className="glass-panel p-8 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-display font-bold">Airtable Connection</h2>
              <p className="text-sm text-muted-foreground mt-1">Sync usage data directly to your CRM.</p>
            </div>
            <img src="https://upload.wikimedia.org/wikipedia/commons/4/4b/Airtable_Logo.svg" alt="Airtable" loading="lazy" className="h-6 opacity-80 filter invert" />
          </div>

          <div className="space-y-4 mb-8 flex-1">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Base ID</label>
              <input 
                type="text" 
                defaultValue="app123XYZ987"
                disabled
                className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-muted-foreground font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">API Key</label>
              <input 
                type="password" 
                defaultValue="pat_xxxxxxxxxxxxxxxxx"
                disabled
                className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-muted-foreground font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
               {airtableStatus === 'success' && (
                 <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-success text-sm font-medium">
                   <CheckCircle2 className="w-5 h-5" /> Connected
                 </motion.div>
               )}
               {airtableStatus === 'error' && (
                 <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-destructive text-sm font-medium">
                   <XCircle className="w-5 h-5" /> Connection Failed
                 </motion.div>
               )}
               {airtableStatus === 'idle' && (
                 <span className="text-sm text-muted-foreground">Not verified</span>
               )}
               {airtableStatus === 'testing' && (
                 <span className="text-sm text-muted-foreground flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                   Testing...
                 </span>
               )}
            </div>
            
            <button 
              onClick={handleTestConnection}
              disabled={airtableStatus === 'testing'}
              className="bg-secondary hover:bg-secondary/80 text-foreground px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              Test Connection <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </Shell>
  );
}
