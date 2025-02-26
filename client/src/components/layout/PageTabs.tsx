import React, { useState, useEffect, createContext, useContext } from 'react';
import { useLocation } from 'wouter';
import { 
  X, 
  Copy, 
  LayoutDashboard, 
  Building, 
  CalendarCheck, 
  Wrench, 
  Users, 
  UserRound,
  Settings
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ClientWithUser } from '@/lib/types';
import { cn } from '@/lib/utils';

// Define tab interface
export interface TabItem {
  id: string;
  title: string;
  path: string;
  icon: React.ReactNode;
}

// Create a context to share tab state across components
interface TabContextType {
  tabs: TabItem[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  addTab: (path: string, forceNew?: boolean) => void;
  closeTab: (id: string) => void;
  duplicateTab: (tab: TabItem) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

// Provider component to wrap the application
export function TabProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [tabs, setTabs] = useState<TabItem[]>([
    { 
      id: 'dashboard', 
      title: 'Dashboard', 
      path: '/', 
      icon: <LayoutDashboard className="h-4 w-4" /> 
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('dashboard');

  // Helper function to get tab title and icon based on path
  const getTabInfo = (path: string): { title: string; icon: React.ReactNode } => {
    switch (path) {
      case '/':
        return { title: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> };
      case '/projects':
        return { title: 'Projects', icon: <Building className="h-4 w-4" /> };
      case '/maintenance':
        return { title: 'Maintenance', icon: <CalendarCheck className="h-4 w-4" /> };
      case '/repairs':
        return { title: 'Repairs', icon: <Wrench className="h-4 w-4" /> };
      case '/clients':
        return { title: 'Clients', icon: <Users className="h-4 w-4" /> };
      case '/technicians':
        return { title: 'Technicians', icon: <UserRound className="h-4 w-4" /> };
      case '/settings':
        return { title: 'Settings', icon: <Settings className="h-4 w-4" /> };
      default:
        // Handle client-specific pages
        const clientDetailsMatch = path.match(/^\/clients\/(\d+)$/);
        const clientEditMatch = path.match(/^\/clients\/(\d+)\/edit$/);
        
        if (clientDetailsMatch) {
          return { title: `Client ${clientDetailsMatch[1]}`, icon: <Users className="h-4 w-4" /> };
        } else if (clientEditMatch) {
          return { title: `Edit Client ${clientEditMatch[1]}`, icon: <Users className="h-4 w-4" /> };
        } else if (path === '/clients/add') {
          return { title: 'Add Client', icon: <Users className="h-4 w-4" /> };
        }
        
        return { title: 'New Tab', icon: <LayoutDashboard className="h-4 w-4" /> };
    }
  };

  // Add a new tab
  const addTab = (path: string, forceNew: boolean = false) => {
    // Don't add a tab for the dashboard since it's permanent
    if (path === '/') {
      setActiveTabId('dashboard');
      setLocation('/');
      return;
    }
    
    // Remove timestamp parameter if present
    const cleanPath = path.includes('?t=') ? path.split('?')[0] : path;
    
    // If not forcing a new tab, check if tab already exists for this path
    // and just activate it instead of creating a duplicate
    if (!forceNew) {
      const existingTab = tabs.find(tab => tab.path === cleanPath);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        setLocation(cleanPath);
        return;
      }
    }
    
    // Create a new tab with a unique timestamp-based ID
    const { title, icon } = getTabInfo(cleanPath);
    const newTab: TabItem = {
      id: `tab-${Date.now()}`,
      title,
      path: cleanPath,
      icon
    };
    
    console.log('Creating new tab:', newTab);
    
    // Add the new tab and make it active
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setLocation(cleanPath);
  };

  // Close a tab
  const closeTab = (id: string) => {
    // Don't close the dashboard tab
    if (id === 'dashboard') return;
    
    // Find the index of the tab to close
    const tabIndex = tabs.findIndex(tab => tab.id === id);
    const isActiveTab = id === activeTabId;
    
    // Remove the tab
    const newTabs = tabs.filter(tab => tab.id !== id);
    setTabs(newTabs);
    
    // If closing the active tab, activate another tab
    if (isActiveTab && newTabs.length > 0) {
      // Prefer the tab to the left
      const newActiveTab = newTabs[Math.max(0, tabIndex - 1)];
      setActiveTabId(newActiveTab.id);
      setLocation(newActiveTab.path);
    }
  };

  // Duplicate a tab
  const duplicateTab = (tab: TabItem) => {
    // Don't duplicate the dashboard tab
    if (tab.id === 'dashboard') return;
    
    // Create a duplicate with a new ID
    const newTab = {
      ...tab,
      id: `tab-${Date.now()}`,
      title: `${tab.title} (Copy)`
    };
    
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  // Handle direct URL navigation without a sidebar click
  useEffect(() => {
    // If we're at the dashboard, just activate dashboard tab
    if (location === '/') {
      setActiveTabId('dashboard');
      return;
    }
    
    // If we're navigating to a path without a timestamp query (not from sidebar)
    // and there's no tab for this path yet, create one
    if (!location.includes('?t=')) {
      const existingTab = tabs.find(tab => tab.path === location);
      if (!existingTab) {
        // Create a new tab for this path
        const { title, icon } = getTabInfo(location);
        const newTab: TabItem = {
          id: `tab-${Date.now()}`,
          title,
          path: location,
          icon
        };
        
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
      } else {
        // Just activate the existing tab
        setActiveTabId(existingTab.id);
      }
    }
  }, [location]);

  // Log debug information
  useEffect(() => {
    console.log('Tabs:', tabs);
    console.log('Active tab ID:', activeTabId);
  }, [tabs, activeTabId]);

  // Extract client ID for client-related pages
  const clientDetailsMatch = location.match(/^\/clients\/(\d+)$/);
  const clientEditMatch = location.match(/^\/clients\/(\d+)\/edit$/);
  const clientId = clientDetailsMatch ? parseInt(clientDetailsMatch[1]) : 
                 clientEditMatch ? parseInt(clientEditMatch[1]) : null;
  
  // Fetch client data to update tab titles
  const { data: clientData } = useQuery<ClientWithUser>({
    queryKey: ['/api/clients', clientId],
    enabled: !!clientId,
  });
  
  // Update tab titles when client data is loaded
  useEffect(() => {
    if (clientData && clientId) {
      const clientName = clientData.user?.name || `Client ${clientId}`;
      
      // Update all tabs for this client
      setTabs(currentTabs => 
        currentTabs.map(tab => {
          if (tab.path === `/clients/${clientId}`) {
            return { ...tab, title: clientName };
          } else if (tab.path === `/clients/${clientId}/edit`) {
            return { ...tab, title: `Edit ${clientName}` };
          }
          return tab;
        })
      );
    }
  }, [clientData, clientId]);

  return (
    <TabContext.Provider value={{ 
      tabs, 
      activeTabId, 
      setActiveTabId, 
      addTab, 
      closeTab, 
      duplicateTab 
    }}>
      {children}
    </TabContext.Provider>
  );
}

// Custom hook to use tab context
export function useTabs() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTabs must be used within a TabProvider');
  }
  return context;
}

// The actual tab bar component
export function PageTabs() {
  const { tabs, activeTabId, setActiveTabId, closeTab, duplicateTab } = useTabs();
  const [, setLocation] = useLocation();
  
  const handleTabClick = (tab: TabItem) => {
    setActiveTabId(tab.id);
    setLocation(tab.path);
  };
  
  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };
  
  const handleDuplicateTab = (e: React.MouseEvent, tab: TabItem) => {
    e.stopPropagation();
    duplicateTab(tab);
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
            <div className="flex items-center mr-2">
              {tab.icon}
            </div>
            <div className="truncate">{tab.title}</div>
            {tab.id !== 'dashboard' && (
              <div className="ml-2 flex items-center space-x-1">
                <button
                  onClick={(e) => handleDuplicateTab(e, tab)}
                  className="p-0.5 rounded-md hover:bg-gray-200"
                  title="Duplicate tab"
                >
                  <Copy className="h-3.5 w-3.5 text-gray-500" />
                </button>
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