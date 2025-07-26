import React from 'react';
import { cn } from "@/lib/utils";
import { Droplet } from "lucide-react";

interface DefaultLayoutProps {
  children: React.ReactNode;
}

/**
 * Default Layout Component
 * 
 * Provides a minimal layout for unauthenticated users and fallback scenarios.
 * Used when user role is unknown or authentication is pending.
 */
export const DefaultLayout: React.FC<DefaultLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Droplet className="h-8 w-8 text-primary mr-3" fill="currentColor" />
              <div>
                <h1 className="text-xl font-bold text-primary">SmartWater Pools</h1>
                <p className="text-sm text-gray-500">Professional Pool Management</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default DefaultLayout;