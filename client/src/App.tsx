import { useState, useEffect } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { MobileSidebar } from "./components/layout/MobileSidebar";
import { TabProvider } from "./components/layout/EnhancedTabManager";
import { EnhancedTabManager } from "./components/layout/EnhancedTabManager";
import { EnhancedBreadcrumbs } from "./components/layout/EnhancedBreadcrumbs";
import { Toaster } from "./components/ui/toaster";
import { GoogleMapsProvider } from "./contexts/GoogleMapsContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Maintenance from "./pages/Maintenance";
import MaintenanceMap from "./pages/MaintenanceMap";
import MaintenanceList from "./pages/MaintenanceList";
import Repairs from "./pages/Repairs";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import ClientAdd from "./pages/ClientAdd";
import ClientEdit from "./pages/ClientEdit";
import Technicians from "./pages/Technicians";
import ClientPortal from "./pages/ClientPortal";
import PoolWizardPage from "./pages/PoolWizardPage";
import ServiceReport from "./pages/ServiceReport";

import MaintenanceReportPage from "./pages/MaintenanceReportPage";
import Communications from "./pages/Communications";
import Business from "./pages/Business";
import InventoryTransfers from "./pages/InventoryTransfers";
import InventoryManagement from "./pages/InventoryManagement";
import FleetmaticsSettings from "./pages/FleetmaticsSettings";
import VehicleMapping from "./pages/VehicleMapping";
import VehicleTracking from "./pages/VehicleTracking";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import BarcodeDemo from "./pages/BarcodeDemo";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Pricing from "./pages/Pricing";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/not-found";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import OAuthConsent from "./pages/OAuthConsent";
import OAuthDebug from "./pages/OAuthDebug"; // OAuth debugging page
import DebugHome from "./pages/DebugHome"; // Debug home page
import InvitePage from "./pages/InvitePage";
import OrganizationSelection from "./pages/OrganizationSelection";

// App Content component that uses auth context
function AppContent({ 
  mobileMenuOpen, 
  toggleMobileMenu, 
  closeMobileMenu 
}: { 
  mobileMenuOpen: boolean; 
  toggleMobileMenu: () => void; 
  closeMobileMenu: () => void; 
}) {
  const { isLoading } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState<boolean>(false);
  
  // Check auth loading state for proper UI rendering
  console.log("Auth loading state:", isLoading);
  
  // Set a timeout to prevent showing loading spinner for too long
  // This helps prevent the UI from getting stuck in loading state indefinitely
  useEffect(() => {
    if (isLoading) {
      // Start with no timeout
      setLoadingTimeout(false);
      
      // Set a shorter timeout to prevent getting stuck in loading state
      // Reduced from 10 seconds to 3 seconds to avoid long waits
      const timer = setTimeout(() => {
        console.log("Auth loading timeout reached, forcing UI to render");
        setLoadingTimeout(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading]);
  
  // Force-continue immediately, no waiting for loading state
  // This completely bypasses the loading spinner for dashboard
  // because we've seen it gets stuck
  if (isLoading) {
    console.log("Auth is still loading, but we're rendering UI anyway to avoid getting stuck");
    // No longer showing a loading spinner at all, just proceed with rendering the app
  }
  
  return (
    <TabProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Switch>
          {/* Public routes, no login page required as it will be a card on dashboard */}
          <Route path="/register">
            <Register />
          </Route>
          <Route path="/unauthorized">
            <Unauthorized />
          </Route>
          <Route path="/privacy-policy">
            <PrivacyPolicy />
          </Route>
          <Route path="/terms-of-service">
            <TermsOfService />
          </Route>
          <Route path="/oauth-consent">
            <OAuthConsent />
          </Route>
          <Route path="/invite">
            <InvitePage />
          </Route>
          <Route path="/pricing">
            <Pricing />
          </Route>
          <Route path="/subscription/success">
            <SubscriptionSuccess />
          </Route>
          <Route path="/organization-selection/:googleId">
            <OrganizationSelection />
          </Route>
          
          {/* Debug pages - accessible without authentication */}
          <Route path="/debug">
            <DebugHome />
          </Route>
          <Route path="/oauth-debug">
            <OAuthDebug />
          </Route>
          
          {/* All routes including dashboard with login card */}
          <Route>
            <ProtectedRoute>
              {/* Desktop Sidebar - hidden on mobile */}
              <div className="hidden md:block">
                <Sidebar />
              </div>
            
              {/* Mobile menu (off-canvas) */}
              <MobileSidebar isOpen={mobileMenuOpen} onClose={closeMobileMenu} />
              
              {/* Main content area */}
              <div className="flex flex-col flex-1 w-full">
                {/* App Header */}
                <Header toggleMobileMenu={toggleMobileMenu} />
                
                {/* Tab Manager - Now positioned above content */}
                <EnhancedTabManager />
                
                {/* Main content */}
                <main className="flex-1 overflow-y-auto bg-background p-4 pb-20 md:p-6 md:pb-6">
                  {/* Breadcrumbs */}
                  <EnhancedBreadcrumbs />
                  
                  <Switch>
                    {/* Dashboard routes - exact path first */}
                    <Route path="/dashboard">
                      <Dashboard />
                    </Route>
                    
                    <Route path="/">
                      <Dashboard />
                    </Route>
                    
                    {/* Projects routes */}
                    <Route path="/projects">
                      <Projects />
                    </Route>
                    <Route path="/projects/:id">
                      <ProjectDetails />
                    </Route>
                    
                    {/* Maintenance routes */}
                    <Route path="/maintenance">
                      <Maintenance />
                    </Route>
                    <Route path="/maintenance/map">
                      <MaintenanceMap />
                    </Route>
                    <Route path="/maintenance/list">
                      <MaintenanceList />
                    </Route>
                    
                    {/* Repairs route */}
                    <Route path="/repairs">
                      <Repairs />
                    </Route>
                    
                    {/* Client routes */}
                    <Route path="/clients">
                      <Clients />
                    </Route>
                    <Route path="/clients/add">
                      <ClientAdd />
                    </Route>
                    <Route path="/clients/:id/edit">
                      <ClientEdit />
                    </Route>
                    <Route path="/clients/:id/pool-wizard">
                      <PoolWizardPage />
                    </Route>
                    <Route path="/pool-wizard/:id">
                      <PoolWizardPage />
                    </Route>
                    <Route path="/clients/:id">
                      <ClientDetails />
                    </Route>
                    
                    {/* Technician routes */}
                    <Route path="/technicians">
                      <Technicians />
                    </Route>
                    
                    {/* Other routes */}
                    <Route path="/client-portal">
                      <ClientPortal />
                    </Route>
                    <Route path="/service-report/:id">
                      <ServiceReport />
                    </Route>
                    <Route path="/maintenance-report/:id">
                      <MaintenanceReportPage />
                    </Route>
                    <Route path="/communications">
                      <Communications />
                    </Route>
                    <Route path="/business">
                      <Business />
                    </Route>
                    <Route path="/inventory">
                      <InventoryManagement />
                    </Route>
                    <Route path="/inventory/transfers">
                      <InventoryTransfers />
                    </Route>
                    <Route path="/inventory/barcode-demo">
                      <BarcodeDemo />
                    </Route>
                    
                    {/* Fleetmatics routes */}
                    <Route path="/fleetmatics/settings">
                      <FleetmaticsSettings />
                    </Route>
                    <Route path="/fleetmatics/vehicle-mapping">
                      <VehicleMapping />
                    </Route>
                    <Route path="/fleetmatics/vehicle-tracking">
                      <VehicleTracking />
                    </Route>
                    
                    <Route path="/settings">
                      <Settings />
                    </Route>
                    <Route path="/admin">
                      <Admin />
                    </Route>
                    
                    {/* Catch-all */}
                    <Route>
                      <NotFound />
                    </Route>
                  </Switch>
                </main>
              </div>
            </ProtectedRoute>
          </Route>
        </Switch>
      </div>
      
      <Toaster />
    </TabProvider>
  );
}

// We no longer need this cleanup function since all tabs are treated equally
// This function is removed to let the tab system handle dashboard tabs normally
function cleanupDashboardTabs() {
  // This function is intentionally kept empty to avoid breaking existing code
  // It will be called but will do nothing
  return false;
}

// Main App component
function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  
  // Run tab cleanup on component mount
  useEffect(() => {
    cleanupDashboardTabs();
  }, []);
  
  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };
  
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleMapsProvider>
        <AuthProvider>
          <AppContent 
            mobileMenuOpen={mobileMenuOpen}
            toggleMobileMenu={toggleMobileMenu}
            closeMobileMenu={closeMobileMenu}
          />
        </AuthProvider>
      </GoogleMapsProvider>
    </QueryClientProvider>
  );
}

export default App;