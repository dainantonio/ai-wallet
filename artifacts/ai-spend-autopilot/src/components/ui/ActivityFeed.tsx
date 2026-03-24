import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { ActivityItem } from "@workspace/api-client-react/src/generated/api.schemas";

function isPositiveValue(value: string) {
  return value.trim().startsWith("-");
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {items.map((item) => {
          const isOptimization = item.type === "optimization";
          const isAlert = item.type === "alert";
          const isSpend = item.type === "usage";
          const positive = isOptimization;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, type: "spring", bounce: 0.3 }}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-card/30 border border-border/30 hover:bg-card/60 transition-colors group"
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isOptimization ? "bg-success/15 text-success" :
                  isAlert ? "bg-red-400/15 text-red-400" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {isOptimization && <TrendingDown className="w-4 h-4" />}
                  {isAlert && <AlertTriangle className="w-4 h-4" />}
                  {isSpend && <ArrowUpRight className="w-4 h-4" />}
                </div>

                {/* Label + time */}
                <div>
                  <p className="text-sm font-medium text-foreground leading-snug">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(item.timestamp)}</p>
                </div>
              </div>

              {/* Amount with +/- indicator */}
              <div className={`flex items-center gap-1 text-sm font-bold font-mono ${
                positive ? "text-success" :
                isAlert ? "text-red-400" :
                "text-muted-foreground"
              }`}>
                {positive
                  ? <ArrowDownRight className="w-3.5 h-3.5" />
                  : isSpend
                  ? <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                  : null
                }
                <span>{positive && !item.value.startsWith("-") ? `+${item.value}` : item.value}</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No transactions yet.
        </div>
      )}
    </div>
  );
}
