
import React from "react";
import { TabProvider } from "./EnhancedTabManager";
import { EnhancedTabManager } from "./EnhancedTabManager";
import { EnhancedBreadcrumbs } from "./EnhancedBreadcrumbs";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <TabProvider>
      <div className="flex flex-col min-h-screen">
        <EnhancedTabManager />
        <main className="flex-1 p-4">
          <EnhancedBreadcrumbs />
          <Outlet />
        </main>
      </div>
    </TabProvider>
  );
}
