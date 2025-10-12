import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

// Import pages
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Projects from "@/pages/Projects";
import Clients from "@/pages/Clients";
import AddClient from "@/pages/AddClient";
import ClientsEnhanced from "@/pages/ClientsEnhanced";
import ClientDetails from "@/pages/ClientDetails";
import ClientEdit from "@/pages/ClientEdit";
import ClientPortal from "@/pages/ClientPortal";
import PoolWizardPage from "@/pages/PoolWizardPage";
import Maintenance from "@/pages/Maintenance";
import Repairs from "@/pages/Repairs";
import Settings from "@/pages/Settings";
import Technicians from "@/pages/Technicians";
import Communications from "@/pages/Communications";
import Business from "@/pages/Business";
import InventoryManagement from "@/pages/InventoryManagement";
import Admin from "@/pages/Admin";
import LoginErrorTest from "@/pages/LoginErrorTest";
import ProjectDetails from "@/pages/ProjectDetails";

// Protected route wrapper that includes the AppLayout
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }
  
  // Render the component wrapped in AppLayout
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public auth routes - no layout needed */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/login-error-test" component={LoginErrorTest} />
      
      {/* Protected routes with AppLayout */}
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/projects/:id" component={() => <ProtectedRoute component={ProjectDetails} />} />
      <Route path="/projects" component={() => <ProtectedRoute component={Projects} />} />
      <Route path="/clients/add" component={() => <ProtectedRoute component={AddClient} />} />
      <Route path="/clients/enhanced" component={() => <ProtectedRoute component={ClientsEnhanced} />} />
      <Route path="/clients/:id/pool-wizard" component={() => <ProtectedRoute component={PoolWizardPage} />} />
      <Route path="/clients/:id/edit" component={() => <ProtectedRoute component={ClientEdit} />} />
      <Route path="/clients/:id/portal" component={() => <ProtectedRoute component={ClientPortal} />} />
      <Route path="/clients/:id" component={() => <ProtectedRoute component={ClientDetails} />} />
      <Route path="/clients" component={() => <ProtectedRoute component={Clients} />} />
      <Route path="/maintenance" component={() => <ProtectedRoute component={Maintenance} />} />
      <Route path="/repairs" component={() => <ProtectedRoute component={Repairs} />} />
      <Route path="/technicians" component={() => <ProtectedRoute component={Technicians} />} />
      <Route path="/communications" component={() => <ProtectedRoute component={Communications} />} />
      <Route path="/business" component={() => <ProtectedRoute component={Business} />} />
      <Route path="/inventory" component={() => <ProtectedRoute component={InventoryManagement} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={Admin} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      
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
