import { Switch, Route, useLocation, useParams, Redirect } from "wouter";

function PoolWizardRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Redirect to={`/clients/${id}/pool-wizard`} />;
}
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { GoogleMapsProvider } from "./contexts/GoogleMapsContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePermissions } from "@/hooks/usePermissions";
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
import AcceptInvite from "@/pages/AcceptInvite";
import ProjectDetails from "@/pages/ProjectDetails";
import VendorDetail from "@/pages/VendorDetail";
import WorkOrders from "@/pages/WorkOrders";
import WorkOrderDetail from "@/pages/WorkOrderDetail";
import WorkOrderRequests from "@/pages/WorkOrderRequests";
import MaintenanceOrders from "@/pages/MaintenanceOrders";
import Invoices from "@/pages/Invoices";
import InvoiceForm from "@/pages/InvoiceForm";
import InvoiceDetail from "@/pages/InvoiceDetail";
import Estimates from "@/pages/Estimates";
import EstimateForm from "@/pages/EstimateForm";
import EstimateDetail from "@/pages/EstimateDetail";
import DispatchBoard from "@/pages/DispatchBoard";
import ServiceReportView from "@/pages/ServiceReportView";
import Reports from "@/pages/Reports";
import ChemicalPricing from "./pages/ChemicalPricing";

type ResourceType = 'clients' | 'technicians' | 'projects' | 'maintenance' | 'repairs' | 'invoices' | 'inventory' | 'reports' | 'settings' | 'vehicles' | 'communications' | 'users' | 'organization';

function ProtectedRoute({ component: Component, requiredPermission }: { component: React.ComponentType; requiredPermission?: ResourceType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { canView } = usePermissions();
  const [, setLocation] = useLocation();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }
  
  if (requiredPermission && !canView(requiredPermission)) {
    setLocation('/');
    return null;
  }
  
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
      <Route path="/invite" component={AcceptInvite} />
      
      {/* Protected routes with AppLayout */}
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/projects/:id" component={() => <ProtectedRoute component={ProjectDetails} requiredPermission="projects" />} />
      <Route path="/projects" component={() => <ProtectedRoute component={Projects} requiredPermission="projects" />} />
      <Route path="/clients/add" component={() => <ProtectedRoute component={AddClient} requiredPermission="clients" />} />
      <Route path="/clients/enhanced" component={() => <ProtectedRoute component={ClientsEnhanced} requiredPermission="clients" />} />
      <Route path="/pool-wizard/:id" component={PoolWizardRedirect} />
      <Route path="/clients/:id/pool-wizard" component={() => <ProtectedRoute component={PoolWizardPage} requiredPermission="clients" />} />
      <Route path="/clients/:id/edit" component={() => <ProtectedRoute component={ClientEdit} requiredPermission="clients" />} />
      <Route path="/clients/:id/portal" component={() => <ProtectedRoute component={ClientPortal} requiredPermission="clients" />} />
      <Route path="/clients/:id" component={() => <ProtectedRoute component={ClientDetails} requiredPermission="clients" />} />
      <Route path="/clients" component={() => <ProtectedRoute component={Clients} requiredPermission="clients" />} />
      <Route path="/dispatch" component={() => <ProtectedRoute component={DispatchBoard} requiredPermission="maintenance" />} />
      <Route path="/maintenance/calendar" component={() => <ProtectedRoute component={() => <Maintenance defaultTab="calendar" />} requiredPermission="maintenance" />} />
      <Route path="/maintenance/list" component={() => <ProtectedRoute component={() => <Maintenance defaultTab="calendar" />} requiredPermission="maintenance" />} />
      <Route path="/maintenance/map" component={() => <ProtectedRoute component={() => <Maintenance defaultTab="map" />} requiredPermission="maintenance" />} />
      <Route path="/maintenance/routes" component={() => <ProtectedRoute component={() => <Maintenance defaultTab="routes" />} requiredPermission="maintenance" />} />
      <Route path="/maintenance" component={() => <ProtectedRoute component={Maintenance} requiredPermission="maintenance" />} />
      <Route path="/repairs" component={() => <ProtectedRoute component={Repairs} requiredPermission="repairs" />} />
      <Route path="/work-orders/:id" component={() => <ProtectedRoute component={WorkOrderDetail} requiredPermission="maintenance" />} />
      <Route path="/work-orders" component={() => <ProtectedRoute component={WorkOrders} requiredPermission="maintenance" />} />
      <Route path="/work-order-requests" component={() => <ProtectedRoute component={WorkOrderRequests} requiredPermission="maintenance" />} />
      <Route path="/maintenance-orders" component={() => <ProtectedRoute component={MaintenanceOrders} requiredPermission="maintenance" />} />
      <Route path="/technicians" component={() => <ProtectedRoute component={Technicians} requiredPermission="technicians" />} />
      <Route path="/communications" component={() => <ProtectedRoute component={Communications} requiredPermission="communications" />} />
      <Route path="/vendors/:id" component={() => <ProtectedRoute component={VendorDetail} requiredPermission="inventory" />} />
      <Route path="/invoices/new" component={() => <ProtectedRoute component={InvoiceForm} requiredPermission="invoices" />} />
      <Route path="/invoices/:id/edit" component={() => <ProtectedRoute component={InvoiceForm} requiredPermission="invoices" />} />
      <Route path="/invoices/:id" component={() => <ProtectedRoute component={InvoiceDetail} requiredPermission="invoices" />} />
      <Route path="/invoices" component={() => <ProtectedRoute component={Invoices} requiredPermission="invoices" />} />
      <Route path="/estimates/new" component={() => <ProtectedRoute component={EstimateForm} requiredPermission="invoices" />} />
      <Route path="/estimates/:id/edit" component={() => <ProtectedRoute component={EstimateForm} requiredPermission="invoices" />} />
      <Route path="/estimates/:id" component={() => <ProtectedRoute component={EstimateDetail} requiredPermission="invoices" />} />
      <Route path="/estimates" component={() => <ProtectedRoute component={Estimates} requiredPermission="invoices" />} />
      <Route path="/business" component={() => <ProtectedRoute component={Business} requiredPermission="settings" />} />
      <Route path="/inventory" component={() => <ProtectedRoute component={InventoryManagement} requiredPermission="inventory" />} />
      <Route path="/reports" component={() => <ProtectedRoute component={Reports} requiredPermission="reports" />} />
      <Route path="/reports/:id" component={() => <ProtectedRoute component={ServiceReportView} requiredPermission="reports" />} />
      <Route path="/admin" component={() => <ProtectedRoute component={Admin} requiredPermission="users" />} />
      <Route path="/chemical-pricing" component={() => <ProtectedRoute component={ChemicalPricing} requiredPermission="settings" />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} requiredPermission="settings" />} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GoogleMapsProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </GoogleMapsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
