import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/sidebar";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Users from "@/pages/users";
import UserDetail from "@/pages/users/[id]";
import Games from "@/pages/games";
import Deposits from "@/pages/deposits";
import Withdrawals from "@/pages/withdrawals";
import UpiSettings from "@/pages/upi-settings";
import Referrals from "@/pages/referrals";
import Analytics from "@/pages/analytics";
import GameSettings from "@/pages/game-settings";
import AuditLogs from "@/pages/audit-logs";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  if (isAuthenticated && location === "/") {
    setLocation("/dashboard");
  }

  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/users"><ProtectedRoute component={Users} /></Route>
      <Route path="/users/:id"><ProtectedRoute component={UserDetail} /></Route>
      <Route path="/games"><ProtectedRoute component={Games} /></Route>
      <Route path="/deposits"><ProtectedRoute component={Deposits} /></Route>
      <Route path="/withdrawals"><ProtectedRoute component={Withdrawals} /></Route>
      <Route path="/upi-settings"><ProtectedRoute component={UpiSettings} /></Route>
      <Route path="/referrals"><ProtectedRoute component={Referrals} /></Route>
      <Route path="/analytics"><ProtectedRoute component={Analytics} /></Route>
      <Route path="/game-settings"><ProtectedRoute component={GameSettings} /></Route>
      <Route path="/audit-logs"><ProtectedRoute component={AuditLogs} /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
