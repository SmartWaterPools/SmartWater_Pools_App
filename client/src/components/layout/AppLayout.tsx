
import React, { useState } from "react";
import { TabProvider } from "./EnhancedTabManager";
import { EnhancedTabManager } from "./EnhancedTabManager";
import { EnhancedBreadcrumbs } from "./EnhancedBreadcrumbs";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileSidebar } from "./MobileSidebar";
import { useAuth } from "../../contexts/AuthContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <TabProvider>
      <div className="flex min-h-screen bg-gray-50">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar user={user ? {
            name: user.name || user.username,
            role: user.role
          } : undefined} />
        </div>
        
        {/* Mobile Sidebar */}
        <MobileSidebar 
          isOpen={mobileMenuOpen} 
          onClose={() => setMobileMenuOpen(false)}
        />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header with mobile menu toggle */}
          <Header toggleMobileMenu={toggleMobileMenu} />
          
          {/* Tab Manager */}
          <div className="bg-white border-b">
            <EnhancedTabManager />
          </div>
          
          {/* Breadcrumbs */}
          <div className="bg-white px-4 py-2 border-b">
            <EnhancedBreadcrumbs />
          </div>
          
          {/* Main Content */}
          <main className="flex-1 p-4 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </TabProvider>
  );
}
