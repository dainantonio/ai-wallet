import { Link, useLocation } from "wouter";
import { Wallet, Home, Sparkles, BarChart3, BellRing, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAuthContext } from "@/App";

const NAV_ITEMS = [
  { path: "/",          label: "Dashboard",    icon: Home },
  { path: "/usage",     label: "Usage & Models", icon: BarChart3 },
  { path: "/alerts",    label: "Alert Rules",  icon: BellRing },
  { path: "/autopilot", label: "Smart Spend",  icon: Sparkles },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuthContext();

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user?.email?.split("@")[0] ?? "My Wallet";

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "W";

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/30">

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] mix-blend-screen opacity-50 translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-success/5 rounded-full blur-[100px] mix-blend-screen opacity-50 -translate-x-1/3 translate-y-1/3" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-border/40 glass-panel z-20 relative">
        {/* Brand */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight text-gradient">AI Wallet</h1>
            <p className="text-xs font-medium text-success tracking-wide uppercase">Smart Spend Active</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path} className="block">
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden",
                  isActive ? "text-white font-semibold" : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}>
                  {isActive && (
                    <motion.div layoutId="sidebar-active"
                      className="absolute inset-0 bg-primary/15 border border-primary/30 rounded-xl -z-10"
                      initial={false} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <Icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-primary" : "")} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User panel */}
        <div className="p-4 mt-auto space-y-3">
          {/* System status */}
          <div className="px-4 py-3 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium text-foreground">System Status</span>
            </div>
            <p className="text-xs text-muted-foreground">All routing nodes operational. Latency &lt; 50ms.</p>
          </div>

          {/* User row */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/30">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt={displayName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20 flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
              {user?.email && <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>}
            </div>
            <button onClick={logout} title="Log out"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative z-10 overflow-y-auto">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-border/50 pb-safe">
        <div className="flex justify-around items-center p-3">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path} className="flex-1 flex justify-center">
                <div className="relative p-2 flex flex-col items-center gap-1">
                  {isActive && (
                    <motion.div layoutId="mobile-active"
                      className="absolute inset-0 bg-primary/15 rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <Icon className={cn("w-6 h-6", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                    {item.label.split(" ")[0]}
                  </span>
                </div>
              </Link>
            );
          })}
          {/* Mobile logout */}
          <button onClick={logout} className="flex-1 flex justify-center">
            <div className="p-2 flex flex-col items-center gap-1">
              <LogOut className="w-6 h-6 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">Logout</span>
            </div>
          </button>
        </div>
      </nav>
    </div>
  );
}
