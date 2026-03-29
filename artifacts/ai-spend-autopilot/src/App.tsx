import { createContext, useContext, useState, lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, type AuthUser } from "@workspace/replit-auth-web";
import Home from "@/pages/home";
import LoginPage from "@/pages/login";
import { OnboardingFlow } from "@/components/OnboardingFlow";

// ─── Lazy-load secondary pages (reduces initial bundle) ───────────────────────
const Usage     = lazy(() => import("@/pages/usage"));
const Alerts    = lazy(() => import("@/pages/alerts"));
const Autopilot = lazy(() => import("@/pages/autopilot"));
const Simulator = lazy(() => import("@/pages/simulator"));
const Settings  = lazy(() => import("@/pages/settings"));
const Projects  = lazy(() => import("@/pages/projects"));
const NotFound  = lazy(() => import("@/pages/not-found"));

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

const PageLoader = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-background">
    <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
  </div>
);

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/projects" component={Projects} />
        <Route path="/usage" component={Usage} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/autopilot" component={Autopilot} />
        <Route path="/simulator" component={Simulator} />
        <Route path="/settings"  component={Settings}  />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
  const [onboardingDone, setOnboardingDone] = useState(
    () => !!localStorage.getItem("onboarding_complete"),
  );

  // Re-check localStorage whenever auth state changes (e.g. new user logs in)
  useEffect(() => {
    if (isAuthenticated || isDemo) {
      setOnboardingDone(!!localStorage.getItem("onboarding_complete"));
    }
  }, [isAuthenticated, isDemo]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated && !isDemo) {
    return <LoginPage onLogin={login} onDemo={() => setIsDemo(true)} />;
  }

  const activeUser = isDemo ? DEMO_USER : user;

  return (
    <AuthContext.Provider value={{
      user:   activeUser,
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
      {!onboardingDone && (
        <OnboardingFlow
          userId={activeUser?.id ?? ""}
          isDemo={isDemo}
          onComplete={() => setOnboardingDone(true)}
        />
      )}
    </AuthContext.Provider>
  );
}

export default App;
