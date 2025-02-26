
import React from "react";
import { TabProvider, TabManager } from "./TabManager";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <TabProvider>
      <div className="flex flex-col min-h-screen">
        <TabManager />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </TabProvider>
  );
}
