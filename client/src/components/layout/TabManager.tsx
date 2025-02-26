import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  X, 
  Copy, 
  MoreHorizontal, 
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

interface Tab {
  id: string;
  title: string;
  path: string;
  icon: React.ReactNode;
}

const getIconForPath = (path: string): React.ReactNode => {
  switch (path) {
    case '/':
      return <LayoutDashboard className="h-4 w-4" />;
    case '/projects':
      return <Building className="h-4 w-4" />;
    case '/maintenance':
      return <CalendarCheck className="h-4 w-4" />;
    case '/repairs':
      return <Wrench className="h-4 w-4" />;
    case '/clients':
      return <Users className="h-4 w-4" />;
    case '/technicians':
      return <UserRound className="h-4 w-4" />;
    case '/settings':
      return <Settings className="h-4 w-4" />;
    default:
      return <LayoutDashboard className="h-4 w-4" />;
  }
};

const getTitleForPath = (path: string): string => {
  // Check if this is a client details page
  const clientDetailsMatch = path.match(/^\/clients\/(\d+)$/);
  if (clientDetailsMatch) {
    // For client detail pages, we'll get the client name from the API
    return 'Client Details'; // This will be replaced with actual client name later
  }
  
  // Check if this is a client edit page
  const clientEditMatch = path.match(/^\/clients\/(\d+)\/edit$/);
  if (clientEditMatch) {
    return 'Edit Client'; // This will be customized with client name
  }
  
  // Check if this is a client add page
  if (path === '/clients/add') {
    return 'Add Client';
  }
  
  switch (path) {
    case '/':
      return 'Dashboard';
    case '/projects':
      return 'Projects';
    case '/maintenance':
      return 'Maintenance';
    case '/repairs':
      return 'Repairs';
    case '/clients':
      return 'Clients';
    case '/technicians':
      return 'Technicians';
    case '/settings':
      return 'Settings';
    default:
      return 'New Tab';
  }
};

export function TabManager() {
  const [location, setLocation] = useLocation();
  const [tabs, setTabs] = useState<Tab[]>([
    { 
      id: 'dashboard', 
      title: 'Dashboard', 
      path: '/', 
      icon: <LayoutDashboard className="h-4 w-4" /> 
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('dashboard');
  
  // Store previous location to track changes
  const [previousLocation, setPreviousLocation] = useState<string>(location);
  
  // Update activeTabId and location when tabs change
  useEffect(() => {
    // Check if the current location has a tab
    const matchingTab = tabs.find(tab => tab.path === location);
    
    if (matchingTab) {
      setActiveTabId(matchingTab.id);
    }
  }, [tabs]);

  // Extract client ID from path if it's a client page (details or edit)
  const clientDetailsMatch = location.match(/^\/clients\/(\d+)$/);
  const clientEditMatch = location.match(/^\/clients\/(\d+)\/edit$/);
  const clientId = clientDetailsMatch ? parseInt(clientDetailsMatch[1]) : 
                   clientEditMatch ? parseInt(clientEditMatch[1]) : null;

  // Fetch client data if this is a client-related page
  const { data: clientData } = useQuery<ClientWithUser>({
    queryKey: ['/api/clients', clientId],
    enabled: !!clientId,
    retry: 3,
    staleTime: 5000,
  });

  // Update tab titles when client data is loaded
  useEffect(() => {
    if (clientData && clientId) {
      // Find if there's a tab for this client (either details or edit)
      const detailsTabIndex = tabs.findIndex(tab => tab.path === `/clients/${clientId}`);
      const editTabIndex = tabs.findIndex(tab => tab.path === `/clients/${clientId}/edit`);
      
      // Only update if we actually found tabs that need updating
      if (detailsTabIndex === -1 && editTabIndex === -1) return;
      
      // Get client name - split by space to get first and last name
      let displayName = 'Client';
      if (clientData.user && clientData.user.name) {
        const nameParts = clientData.user.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        displayName = `${firstName} ${lastName}`;
      } else {
        displayName = `Client ${clientId}`;
      }
      
      // Create a copy of the tabs array
      const updatedTabs = [...tabs];
      let needsUpdate = false;
      
      // Update the client details tab if it exists
      if (detailsTabIndex !== -1 && updatedTabs[detailsTabIndex].title !== displayName) {
        updatedTabs[detailsTabIndex] = {
          ...updatedTabs[detailsTabIndex],
          title: displayName
        };
        needsUpdate = true;
      }
      
      // Update the client edit tab if it exists
      if (editTabIndex !== -1 && updatedTabs[editTabIndex].title !== `Edit ${displayName}`) {
        updatedTabs[editTabIndex] = {
          ...updatedTabs[editTabIndex],
          title: `Edit ${displayName}`
        };
        needsUpdate = true;
      }
      
      // Only update state if we made changes
      if (needsUpdate) {
        setTabs(updatedTabs);
      }
    }
  }, [clientData, clientId]);

  // Update active tab based on location changes
  useEffect(() => {
    // Check if the location actually changed
    if (location !== previousLocation) {
      setPreviousLocation(location);
      
      // Special case for dashboard - just activate the existing tab
      if (location === '/') {
        const dashboardTab = tabs.find(tab => tab.id === 'dashboard');
        if (dashboardTab) {
          setActiveTabId('dashboard');
          return;
        }
      }
      
      // Check if tab with this path already exists
      const existingTab = tabs.find(tab => tab.path === location);
      
      if (existingTab) {
        // Just activate the existing tab
        setActiveTabId(existingTab.id);
      } else {
        // Create a new tab
        const newTab = {
          id: `tab-${Date.now()}`,
          title: getTitleForPath(location),
          path: location,
          icon: getIconForPath(location)
        };
        
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
    }
  }, [location, previousLocation, tabs]);

  const handleTabClick = (tab: Tab) => {
    setLocation(tab.path);
    setActiveTabId(tab.id);
  };

  const closeTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    
    // Don't close if it's the dashboard tab
    if (tabId === 'dashboard') return;
    
    // Don't close if it's the last tab
    if (tabs.length <= 1) return;
    
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    
    setTabs(newTabs);
    
    // If closing the active tab, activate another tab
    if (tabId === activeTabId) {
      // Prefer tab to the left if available
      const newActiveIndex = Math.max(0, tabIndex - 1);
      setActiveTabId(newTabs[newActiveIndex].id);
      setLocation(newTabs[newActiveIndex].path);
    }
  };

  const duplicateTab = (e: React.MouseEvent, tab: Tab) => {
    e.stopPropagation();
    
    // Don't duplicate if it's the dashboard tab
    if (tab.id === 'dashboard') return;
    
    const newTab = {
      id: `tab-${Date.now()}`,
      title: `${tab.title} (Copy)`,
      path: tab.path,
      icon: tab.icon
    };
    
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    setLocation(tab.path);
  };

  return (
    <div className="bg-white border-b border-gray-200 z-10 relative shadow-sm">
      {/* Tab Bar Title */}
      <div className="bg-gray-50 px-3 py-1 border-b border-gray-200 flex items-center">
        <LayoutGrid className="h-4 w-4 mr-2 text-primary" />
        <span className="text-xs font-medium text-gray-600">Open Pages</span>
      </div>
      
      {/* Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            className={`flex items-center min-w-fit max-w-[200px] px-3 py-2 border-r border-gray-200 select-none cursor-pointer transition-colors ${
              activeTabId === tab.id
                ? 'bg-blue-50 text-primary border-b-2 border-b-primary'
                : 'hover:bg-gray-50 text-gray-600'
            }`}
          >
            <div className="flex items-center mr-2">
              {tab.icon}
            </div>
            <div className="truncate">{tab.title}</div>
            {tab.id !== 'dashboard' && (
              <div className="ml-3 flex items-center space-x-1">
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
                  disabled={tabs.length <= 1}
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