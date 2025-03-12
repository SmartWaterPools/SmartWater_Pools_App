import { useState } from "react";
import { Switch, Route, Link } from "wouter";
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
import Communications from "./pages/Communications";
import Business from "./pages/Business";
import Settings from "./pages/Settings";
import ApiKeyDebug from "./pages/ApiKeyDebug";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/not-found";

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
          <TabProvider>
            <div className="flex h-screen overflow-hidden">
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
                
                {/* Protected routes */}
                <Route>
                  <ProtectedRoute>
                    {/* Sidebar */}
                    <Sidebar />
                  
                    {/* Mobile menu (off-canvas) */}
                    <MobileSidebar isOpen={mobileMenuOpen} onClose={closeMobileMenu} />
                    
                    {/* Main content area */}
                    <div className="flex flex-col flex-1 overflow-hidden">
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
                          <Route path="/communications" component={Communications} />
                          <Route path="/business" component={Business} />
                          <Route path="/settings" component={Settings} />
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