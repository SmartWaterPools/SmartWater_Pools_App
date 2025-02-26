import React, { useState, useEffect } from 'react';
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
  Settings,
  LayoutGrid
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ClientWithUser } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TabItem {
  id: string;
  title: string;
  path: string;
  icon: React.ReactNode;
}

export function PageTabs() {
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
  
  // Function to create a new tab
  const createTab = (path: string) => {
    // Check if this is a path we should create a tab for
    if (!path || path === '') return;
    
    // Create a unique ID for the tab
    const tabId = `tab-${Date.now()}`;
    
    // Get the title for the tab based on the path
    let title = 'New Tab';
    let icon = <LayoutDashboard className="h-4 w-4" />;
    
    // Handle special paths
    switch (path) {
      case '/':
        title = 'Dashboard';
        icon = <LayoutDashboard className="h-4 w-4" />;
        break;
      case '/projects':
        title = 'Projects';
        icon = <Building className="h-4 w-4" />;
        break;
      case '/maintenance':
        title = 'Maintenance';
        icon = <CalendarCheck className="h-4 w-4" />;
        break;
      case '/repairs':
        title = 'Repairs';
        icon = <Wrench className="h-4 w-4" />;
        break;
      case '/clients':
        title = 'Clients';
        icon = <Users className="h-4 w-4" />;
        break;
      case '/technicians':
        title = 'Technicians';
        icon = <UserRound className="h-4 w-4" />;
        break;
      case '/settings':
        title = 'Settings';
        icon = <Settings className="h-4 w-4" />;
        break;
      default:
        // Check if this is a client details page
        const clientDetailsMatch = path.match(/^\/clients\/(\d+)$/);
        const clientEditMatch = path.match(/^\/clients\/(\d+)\/edit$/);
        
        if (clientDetailsMatch) {
          title = `Client ${clientDetailsMatch[1]}`;
          icon = <Users className="h-4 w-4" />;
        } else if (clientEditMatch) {
          title = `Edit Client ${clientEditMatch[1]}`;
          icon = <Users className="h-4 w-4" />;
        } else if (path === '/clients/add') {
          title = 'Add Client';
          icon = <Users className="h-4 w-4" />;
        }
    }
    
    return { id: tabId, title, path, icon };
  };
  
  // Update tabs when location changes
  useEffect(() => {
    // If we're going to the dashboard, always use the dashboard tab
    if (location === '/') {
      setActiveTabId('dashboard');
      return;
    }
    
    // Check if a tab already exists for this location
    const existingTab = tabs.find(tab => tab.path === location);
    
    if (existingTab) {
      // Use the existing tab
      setActiveTabId(existingTab.id);
    } else {
      // Create a new tab
      const newTab = createTab(location);
      if (newTab) {
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
    }
  }, [location]);
  
  // Extract client ID from path if it's a client page (details or edit)
  const clientDetailsMatch = location.match(/^\/clients\/(\d+)$/);
  const clientEditMatch = location.match(/^\/clients\/(\d+)\/edit$/);
  const clientId = clientDetailsMatch ? parseInt(clientDetailsMatch[1]) : 
                 clientEditMatch ? parseInt(clientEditMatch[1]) : null;
  
  // Fetch client data if this is a client-related page
  const { data: clientData } = useQuery<ClientWithUser>({
    queryKey: ['/api/clients', clientId],
    enabled: !!clientId,
  });
  
  // Update tab titles when client data is loaded
  useEffect(() => {
    if (clientData && clientId) {
      const detailsTabIndex = tabs.findIndex(tab => tab.path === `/clients/${clientId}`);
      const editTabIndex = tabs.findIndex(tab => tab.path === `/clients/${clientId}/edit`);
      
      if (detailsTabIndex === -1 && editTabIndex === -1) return;
      
      const clientName = clientData.user?.name || `Client ${clientId}`;
      const updatedTabs = [...tabs];
      let hasChanges = false;
      
      if (detailsTabIndex !== -1) {
        updatedTabs[detailsTabIndex] = {
          ...updatedTabs[detailsTabIndex],
          title: clientName
        };
        hasChanges = true;
      }
      
      if (editTabIndex !== -1) {
        updatedTabs[editTabIndex] = {
          ...updatedTabs[editTabIndex],
          title: `Edit ${clientName}`
        };
        hasChanges = true;
      }
      
      if (hasChanges) {
        setTabs(updatedTabs);
      }
    }
  }, [clientData, clientId]);
  
  const handleTabClick = (tab: TabItem) => {
    setActiveTabId(tab.id);
    setLocation(tab.path);
  };
  
  const closeTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    
    // Don't close the dashboard tab
    if (tabId === 'dashboard') return;
    
    // Find the index of the tab to close
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    const isActiveTab = tabId === activeTabId;
    
    // Remove the tab
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    
    // If closing the active tab, activate another tab
    if (isActiveTab && newTabs.length > 0) {
      // Prefer the tab to the left
      const newActiveTab = newTabs[Math.max(0, tabIndex - 1)];
      setActiveTabId(newActiveTab.id);
      setLocation(newActiveTab.path);
    }
  };
  
  const duplicateTab = (e: React.MouseEvent, tab: TabItem) => {
    e.stopPropagation();
    
    // Don't duplicate the dashboard tab
    if (tab.id === 'dashboard') return;
    
    // Create a duplicate
    const newTab = {
      ...tab,
      id: `tab-${Date.now()}`,
      title: `${tab.title} (Copy)`
    };
    
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };
  
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="bg-gray-50 px-3 py-1 border-b border-gray-200 flex items-center">
        <LayoutGrid className="h-4 w-4 mr-2 text-primary" />
        <span className="text-xs font-medium text-gray-600">Open Pages</span>
      </div>
      
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
                  onClick={(e) => duplicateTab(e, tab)}
                  className="p-0.5 rounded-md hover:bg-gray-200"
                  title="Duplicate tab"
                >
                  <Copy className="h-3.5 w-3.5 text-gray-500" />
                </button>
                <button
                  onClick={(e) => closeTab(e, tab.id)}
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