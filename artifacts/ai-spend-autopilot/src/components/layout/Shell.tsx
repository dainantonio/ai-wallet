import { Link, useLocation } from "wouter";
import { Wallet, Home, Sparkles, BarChart3, BellRing, FlaskConical, Settings, LogOut, User, FolderKanban, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAuthContext } from "@/App";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

const NAV_ITEMS = [
  { path: "/",          label: "Dashboard",    icon: Home },
  { path: "/projects",  label: "Projects",     icon: FolderKanban },
  { path: "/pricing",   label: "Pricing",      icon: Gem },
  { path: "/usage",     label: "Usage & Models", icon: BarChart3 },
  { path: "/alerts",    label: "Alert Rules",  icon: BellRing },
  { path: "/autopilot", label: "Smart Spend",  icon: Sparkles },
  { path: "/simulator", label: "Simulator",    icon: FlaskConical },
  { path: "/settings",  label: "Settings",     icon: Settings     },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuthContext();
  useEffect(() => {
    trackEvent("page_view", { path: location });
  }, [location]);

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
        {/* Dot grid texture */}
        <div className="absolute inset-0 dot-grid opacity-100" />
        {/* Ambient color orbs */}
        <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full blur-[140px] opacity-40 translate-x-1/3 -translate-y-1/4"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.10) 50%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[110px] opacity-30 -translate-x-1/3 translate-y-1/3"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[120px] opacity-15"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.20) 0%, transparent 70%)" }} />
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-white/[0.06] z-20 relative"
        style={{ background: "rgba(8,8,18,0.94)", backdropFilter: "blur(32px) saturate(180%)" }}>
        {/* Brand */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 relative"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)" }}>
            <Wallet className="w-5 h-5 text-white" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/20 to-transparent" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight heading-gradient">AI Wallet</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              <p className="text-[10px] font-semibold text-success tracking-widest uppercase">Smart Spend Active</p>
            </div>
          </div>
        </div>

        {/* Gradient divider under brand */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2" />

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path} className="block">
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-250 relative group overflow-hidden",
                  isActive ? "text-white font-semibold" : "text-muted-foreground hover:text-white/90 hover:bg-white/[0.04]"
                )}>
                  {isActive && (
                    <motion.div layoutId="sidebar-active"
                      className="nav-active-pill absolute inset-0 rounded-xl -z-10"
                      initial={false} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  {/* Left accent bar on active */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-primary to-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                  )}
                  <Icon className={cn(
                    "w-4.5 h-4.5 transition-all duration-250 flex-shrink-0",
                    isActive ? "text-primary drop-shadow-[0_0_6px_rgba(99,102,241,0.7)]" : "group-hover:scale-110"
                  )} style={{ width: "1.125rem", height: "1.125rem" }} />
                  <span className="text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User panel */}
        <div className="p-4 mt-auto space-y-3">
          {/* System status */}
          <div className="px-4 py-3 rounded-xl border" style={{ background: "rgba(12,12,28,0.7)", borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium text-foreground">System Status</span>
            </div>
            <p className="text-xs text-muted-foreground">All routing nodes operational. Latency &lt; 50ms.</p>
          </div>

          {/* User row */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/30">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt={displayName} loading="lazy"
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
          <Link href="/pricing" className="block">
            <button className="w-full px-3 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors">
              Upgrade
            </button>
          </Link>
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
