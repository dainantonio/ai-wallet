import { createContext, useContext, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, type AuthUser } from "@workspace/replit-auth-web";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Usage from "@/pages/usage";
import Alerts from "@/pages/alerts";
import Autopilot from "@/pages/autopilot";
import LoginPage from "@/pages/login";

// ─── Auth context (shared across pages / Shell) ───────────────────────────────
interface AuthCtx {
  user: AuthUser | null;
  logout: () => void;
  isDemo: boolean;
}

export const AuthContext = createContext<AuthCtx>({ user: null, logout: () => {}, isDemo: false });
export const useAuthContext = () => useContext(AuthContext);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/usage" component={Usage} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/autopilot" component={Autopilot} />
      <Route component={NotFound} />
    </Switch>
  );
}

const DEMO_USER: AuthUser = {
  id: "demo",
  firstName: "Demo",
  lastName: "User",
  email: "demo@aiwallet.app",
  profileImageUrl: "",
};

function App() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const [isDemo, setIsDemo] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && !isDemo) {
    return <LoginPage onLogin={login} onDemo={() => setIsDemo(true)} />;
  }

  return (
    <AuthContext.Provider value={{
      user:   isDemo ? DEMO_USER : user,
      logout: isDemo ? () => setIsDemo(false) : logout,
      isDemo,
    }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

export default App;
