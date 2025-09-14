import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import NotFound from "@/pages/not-found";

// Import pages
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Projects from "@/pages/Projects";
import Clients from "@/pages/Clients";
import Maintenance from "@/pages/Maintenance";
import Repairs from "@/pages/Repairs";
import Settings from "@/pages/Settings";

function Router() {
  return (
    <Switch>
      {/* Main routes */}
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/projects" component={Projects} />
      <Route path="/clients" component={Clients} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/repairs" component={Repairs} />
      <Route path="/settings" component={Settings} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
