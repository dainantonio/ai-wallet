import { motion, AnimatePresence } from "framer-motion";
import { Zap, AlertTriangle, Cpu } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { ActivityItem } from "@workspace/api-client-react/src/generated/api.schemas";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
            className="flex items-center justify-between p-4 rounded-xl bg-card/40 border border-border/40 hover:bg-card/80 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${
                item.type === 'optimization' ? 'bg-primary/20 text-primary' :
                item.type === 'alert' ? 'bg-destructive/20 text-destructive' :
                'bg-secondary text-muted-foreground'
              }`}>
                {item.type === 'optimization' && <Zap className="w-4 h-4" />}
                {item.type === 'alert' && <AlertTriangle className="w-4 h-4" />}
                {item.type === 'usage' && <Cpu className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(item.timestamp)}</p>
              </div>
            </div>
            
            <div className={`text-sm font-bold font-mono ${
              item.type === 'optimization' ? 'text-success' : 'text-foreground'
            }`}>
              {item.value}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No activity recorded yet.
        </div>
      )}
    </div>
  );
}
