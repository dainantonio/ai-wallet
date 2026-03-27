import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  delay?: number;
}

export function StatCard({ title, value, subtitle, icon, trend, className, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "glass-panel rounded-2xl p-6 relative overflow-hidden group stat-card-premium",
        className
      )}
    >
      {/* Ambient orb — brightens on hover via group-hover */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-primary/6 rounded-full blur-[50px] group-hover:bg-primary/14 transition-all duration-500 -translate-y-1/3 translate-x-1/3" />
      {/* Gradient sweep on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-350 pointer-events-none rounded-2xl" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && <div className="text-muted-foreground/50">{icon}</div>}
      </div>
      
      <div className="relative z-10">
        <div className="font-display text-3xl font-bold text-foreground tracking-tight">
          {value}
        </div>
        
        <div className="mt-2 flex items-center gap-2">
          {trend && (
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              trend.isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {trend.value}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
