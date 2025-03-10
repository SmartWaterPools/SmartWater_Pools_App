import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { TabProvider } from "./components/layout/EnhancedTabManager";
import { EnhancedTabManager } from "./components/layout/EnhancedTabManager";
import { EnhancedBreadcrumbs } from "./components/layout/EnhancedBreadcrumbs";
import { Toaster } from "./components/ui/toaster";
import { X, Droplet } from "lucide-react";

import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Maintenance from "./pages/Maintenance";
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
import EnvTestPage from "./pages/EnvTest";
import MapTest from "./pages/MapTest";
import NotFound from "./pages/not-found";

// Mock user data - in a real app this would come from authentication
const user = {
  name: "Alex Johnson",
  role: "Service Manager"
};

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
      <TabProvider>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <Sidebar user={user} />
        
        {/* Mobile menu (off-canvas) */}
        <div className={`fixed inset-0 z-40 md:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" 
            onClick={closeMobileMenu}
          ></div>
          
          {/* Mobile sidebar */}
          <div className="relative flex flex-col w-full max-w-xs bg-white h-full">
            <div className="flex items-center justify-between h-16 border-b border-gray-200 px-4">
              <div className="flex items-center">
                <Droplet className="h-6 w-6 text-primary mr-2" fill="#0077B6" />
                <h1 className="text-xl font-bold text-primary font-heading">SmartWater Pools</h1>
              </div>
              <button className="text-gray-500 p-1 rounded-full hover:bg-gray-100" onClick={closeMobileMenu}>
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-4">
                <div className="flex items-center p-2 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-lg">
                    {user.name.charAt(0)}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                </div>
              </div>
              <nav className="px-2 space-y-1">
                <a 
                  href="/" 
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-primary text-white"
                  onClick={(e) => {
                    e.preventDefault();
                    closeMobileMenu();
                    // Use the TabProvider context directly
                    // We'll need to get access to the TabProvider context
                    // For now, we'll use a direct navigation as a fallback
                    window.location.href = "/";
                  }}
                >
                  <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </a>
                <a 
                  href="/projects" 
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-blue-50"
                  onClick={(e) => {
                    e.preventDefault();
                    closeMobileMenu();
                    // Use direct navigation for now
                    window.location.href = "/projects";
                  }}
                >
                  <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Construction Projects
                </a>
                <a 
                  href="/maintenance"
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-blue-50"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = "/maintenance";
                    closeMobileMenu();
                  }}
                >
                  <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Maintenance
                </a>
                <a 
                  href="/repairs"
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-blue-50"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = "/repairs";
                    closeMobileMenu();
                  }}
                >
                  <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Repairs
                </a>
                <a 
                  href="/clients"
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-blue-50"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = "/clients";
                    closeMobileMenu();
                  }}
                >
                  <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Clients
                </a>
                <a 
                  href="/technicians"
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-blue-50"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = "/technicians";
                    closeMobileMenu();
                  }}
                >
                  <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Technicians
                </a>
              </nav>
            </div>
          </div>
        </div>
        
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
              <Route path="/projects" component={Projects} />
              <Route path="/projects/:id" component={ProjectDetails} />
              <Route path="/maintenance" component={Maintenance} />
              <Route path="/repairs" component={Repairs} />
              <Route path="/clients" component={Clients} />
              <Route path="/clients/add" component={ClientAdd} />
              <Route path="/clients/:id/edit" component={ClientEdit} />
              <Route path="/clients/:id/pool-wizard" component={PoolWizardPage} />
              <Route path="/pool-wizard/:id" component={PoolWizardPage} />
              <Route path="/clients/:id" component={ClientDetails} />
              <Route path="/technicians" component={Technicians} />
              <Route path="/client-portal" component={ClientPortal} />
              <Route path="/service-report/:id" component={ServiceReport} />
              <Route path="/service-report-page/:id" component={ServiceReportPage} />
              <Route path="/communications" component={Communications} />
              <Route path="/business" component={Business} />
              <Route path="/settings" component={Settings} />
              <Route path="/env-test" component={EnvTestPage} />
              <Route path="/map-test" component={MapTest} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
      
      <Toaster />
      </TabProvider>
    </QueryClientProvider>
  );
}

export default App;