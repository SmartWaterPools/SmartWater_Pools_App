import React, { useState, useEffect, createContext, useContext } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Define tab item interface
export interface TabItem {
  id: string;
  title: string;
  path: string;
  icon?: React.ReactNode;
}

// Define context type
interface TabContextType {
  tabs: TabItem[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  addTab: (tab: TabItem) => void;
  closeTab: (id: string) => void;
}

// Create context
const TabContext = createContext<TabContextType | undefined>(undefined);

// Custom hook to use tab context
export function useTabs() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTabs must be used within a TabProvider');
  }
  return context;
}

// Provider component to wrap the application
export function TabProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [tabs, setTabs] = useState<TabItem[]>([
    { 
      id: 'dashboard', 
      title: 'Dashboard', 
      path: '/',
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('dashboard');

  // Add a new tab
  const addTab = (tab: TabItem) => {
    // Check if tab with this path already exists
    const existingTab = tabs.find(t => t.path === tab.path);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    // Add new tab
    setTabs(prevTabs => [...prevTabs, tab]);
    setActiveTabId(tab.id);
  };

  // Close a tab
  const closeTab = (id: string) => {
    // Prevent closing the last tab
    if (tabs.length <= 1) return;

    // Find index of tab to close
    const tabIndex = tabs.findIndex(t => t.id === id);
    if (tabIndex === -1) return;

    // If closing the active tab, switch to another tab
    if (id === activeTabId) {
      const newActiveTab = tabs[tabIndex === 0 ? 1 : tabIndex - 1];
      setActiveTabId(newActiveTab.id);
      setLocation(newActiveTab.path);
    }

    // Remove the tab
    setTabs(prevTabs => prevTabs.filter(t => t.id !== id));
  };

  // Update active tab when location changes
  useEffect(() => {
    // Find tab with matching path
    const matchingTab = tabs.find(tab => tab.path === location);

    // If no matching tab exists, create one based on the path
    if (!matchingTab) {
      // Extract page name from path
      const pathSegments = location.split('/').filter(Boolean);
      const pageName = pathSegments.length > 0 
        ? pathSegments[pathSegments.length - 1] 
        : 'dashboard';

      // Create a title with first letter capitalized
      const title = pageName.charAt(0).toUpperCase() + pageName.slice(1);

      // Create a new tab
      const newTab = {
        id: `tab-${Date.now()}`,
        title,
        path: location,
      };

      addTab(newTab);
    } else {
      setActiveTabId(matchingTab.id);
    }
  }, [location]);

  return (
    <TabContext.Provider value={{ 
      tabs, 
      activeTabId, 
      setActiveTabId, 
      addTab, 
      closeTab 
    }}>
      {children}
    </TabContext.Provider>
  );
}

// The actual tab bar component that will be visible to users
export function TabManager() {
  const { tabs, activeTabId, setActiveTabId, closeTab } = useTabs();
  const [, setLocation] = useLocation();

  const handleTabClick = (tab: TabItem) => {
    setActiveTabId(tab.id);
    setLocation(tab.path);
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            className={cn(
              "flex items-center px-3 py-2 border-r border-gray-200 cursor-pointer min-w-fit max-w-[200px]",
              activeTabId === tab.id 
                ? "bg-blue-50 text-primary border-b-2 border-b-primary" 
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            {tab.icon && (
              <div className="flex items-center mr-2">
                {tab.icon}
              </div>
            )}
            <div className="truncate">{tab.title}</div>
            {tab.id !== 'dashboard' && (
              <div className="ml-2 flex items-center">
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className="p-0.5 rounded-md hover:bg-gray-200"
                  title="Close tab"
                >
                  <X className="h-3.5 w-3.5 text-gray-500" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}