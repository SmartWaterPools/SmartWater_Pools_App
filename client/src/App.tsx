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
import ServiceReportPage from "./pages/ServiceReportPage";
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
import ApiKeyDebug from "./pages/ApiKeyDebug";
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
import OAuthDebug from "./pages/OAuthDebug";
import InvitePage from "./pages/InvitePage";

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  
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

  // Log application startup for debugging
  useEffect(() => {
    console.log("Checking session...");
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleMapsProvider>
        <AuthProvider>
          <TabProvider>
            <div className="flex h-screen overflow-hidden bg-background">
              <Switch>
                {/* Public routes */}
                <Route path="/login">
                  <Login />
                </Route>
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
                <Route path="/oauth-debug">
                  <OAuthDebug />
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
                
                {/* Protected routes */}
                <Route>
                  <ProtectedRoute>
                    {/* Desktop Sidebar - hidden on mobile */}
                    <div className="hidden md:block">
                      <Sidebar />
                    </div>
                  
                    {/* Mobile menu (off-canvas) */}
                    <MobileSidebar isOpen={mobileMenuOpen} onClose={closeMobileMenu} />
                    
                    {/* Main content area */}
                    <div className="flex flex-col flex-1 w-full overflow-hidden">
                      {/* App Header */}
                      <Header toggleMobileMenu={toggleMobileMenu} />
                      
                      {/* Tab Manager - Now positioned above content */}
                      <EnhancedTabManager />
                      
                      {/* Main content */}
                      <main className="flex-1 overflow-y-auto bg-background p-4 pb-20 md:p-6 md:pb-6">
                        {/* Breadcrumbs */}
                        <EnhancedBreadcrumbs />
                        
                        <Switch>
                          <Route path="/" component={Dashboard} />
                          
                          {/* Projects routes */}
                          <Route path="/projects" component={Projects} />
                          <Route path="/projects/:id" component={ProjectDetails} />
                          
                          {/* Maintenance routes */}
                          <Route path="/maintenance" component={Maintenance} />
                          <Route path="/maintenance/map" component={MaintenanceMap} />
                          <Route path="/maintenance/list" component={MaintenanceList} />
                          
                          {/* Repairs route */}
                          <Route path="/repairs" component={Repairs} />
                          
                          {/* Client routes */}
                          <Route path="/clients" component={Clients} />
                          <Route path="/clients/add" component={ClientAdd} />
                          <Route path="/clients/:id/edit" component={ClientEdit} />
                          <Route path="/clients/:id/pool-wizard" component={PoolWizardPage} />
                          <Route path="/pool-wizard/:id" component={PoolWizardPage} />
                          <Route path="/clients/:id" component={ClientDetails} />
                          
                          {/* Technician routes */}
                          <Route path="/technicians" component={Technicians} />
                          
                          {/* Other routes */}
                          <Route path="/client-portal" component={ClientPortal} />
                          <Route path="/service-report/:id" component={ServiceReport} />
                          <Route path="/service-report-page/:id" component={ServiceReportPage} />
                          <Route path="/maintenance-report/:id" component={MaintenanceReportPage} />
                          <Route path="/communications" component={Communications} />
                          <Route path="/business" component={Business} />
                          <Route path="/inventory" component={InventoryManagement} />
                          <Route path="/inventory/transfers" component={InventoryTransfers} />
                          <Route path="/inventory/barcode-demo" component={BarcodeDemo} />
                          
                          {/* Fleetmatics routes */}
                          <Route path="/fleetmatics/settings" component={FleetmaticsSettings} />
                          <Route path="/fleetmatics/vehicle-mapping" component={VehicleMapping} />
                          <Route path="/fleetmatics/vehicle-tracking" component={VehicleTracking} />
                          
                          <Route path="/settings" component={Settings} />
                          <Route path="/admin" component={Admin} />
                          <Route path="/api-key-debug" component={ApiKeyDebug} />
                          
                          {/* Catch-all */}
                          <Route component={NotFound} />
                        </Switch>
                      </main>
                    </div>
                  </ProtectedRoute>
                </Route>
              </Switch>
            </div>
            
            <Toaster />
          </TabProvider>
        </AuthProvider>
      </GoogleMapsProvider>
    </QueryClientProvider>
  );
}

export default App;