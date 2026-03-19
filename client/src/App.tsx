import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import AppLayout from "@/components/app-layout";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

// Admin pages
import AdminDashboard from "@/pages/admin-dashboard";
import AdminUploadTrades from "@/pages/admin-upload-trades";
import AdminManageClients from "@/pages/admin-manage-clients";
import AdminCapitalMovements from "@/pages/admin-capital-movements";
import AdminCapitalAccounts from "@/pages/admin-capital-accounts";
import AdminConfiguration from "@/pages/admin-configuration";
import AdminStrategyAnalysis from "@/pages/admin-strategy-analysis";
import AdminStrategyDetails from "@/pages/admin-strategy-details";

// Client pages
import ClientCapitalAccount from "@/pages/client-capital-account";
import ClientStrategySummary from "@/pages/client-strategy-summary";
import ClientStrategyDetails from "@/pages/client-strategy-details";

function AdminRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={AdminDashboard} />
        <Route path="/upload-trades" component={AdminUploadTrades} />
        <Route path="/manage-clients" component={AdminManageClients} />
        <Route path="/capital-movements" component={AdminCapitalMovements} />
        <Route path="/capital-accounts" component={AdminCapitalAccounts} />
        <Route path="/configuration" component={AdminConfiguration} />
        <Route path="/strategy-analysis" component={AdminStrategyAnalysis} />
        <Route path="/strategy-details" component={AdminStrategyDetails} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function ClientRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={ClientCapitalAccount} />
        <Route path="/strategy-summary" component={ClientStrategySummary} />
        <Route path="/strategy-details" component={ClientStrategyDetails} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return user.role === "admin" ? <AdminRoutes /> : <ClientRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <Router hook={useHashLocation}>
            <AuthenticatedApp />
          </Router>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
