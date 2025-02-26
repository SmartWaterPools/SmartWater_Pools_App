import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { X, Copy, MoreHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ClientWithUser } from '@/lib/types';
import { 
  LayoutDashboard, 
  Building, 
  CalendarCheck, 
  Wrench, 
  Users, 
  UserRound,
  Settings
} from "lucide-react";

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
  const clientMatch = path.match(/^\/clients\/(\d+)$/);
  if (clientMatch) {
    // For client detail pages, we'll get the client name from the API
    return 'Client Details'; // This will be replaced with actual client name later
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

  // Extract client ID from path if it's a client details page
  const clientMatch = location.match(/^\/clients\/(\d+)$/);
  const clientId = clientMatch ? parseInt(clientMatch[1]) : null;

  // Fetch client data if this is a client details page
  const { data: clientData } = useQuery<ClientWithUser>({
    queryKey: ['/api/clients', clientId],
    enabled: !!clientId,
  });

  // Update tab titles when client data is loaded
  useEffect(() => {
    if (clientData && clientId) {
      // Find if there's a tab for this client
      const tabIndex = tabs.findIndex(tab => tab.path === `/clients/${clientId}`);
      
      if (tabIndex !== -1) {
        // Get client name - split by space to get first and last name
        const nameParts = clientData.user.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        const displayName = `${firstName} ${lastName}`;
        
        // Update the tab title
        const updatedTabs = [...tabs];
        updatedTabs[tabIndex] = {
          ...updatedTabs[tabIndex],
          title: displayName
        };
        
        setTabs(updatedTabs);
      }
    }
  }, [clientData, clientId]);

  // Update active tab based on location
  useEffect(() => {
    const tabExists = tabs.find(tab => tab.path === location);
    
    if (!tabExists) {
      // Create new tab for this path
      const newTab = {
        id: `tab-${Date.now()}`,
        title: getTitleForPath(location),
        path: location,
        icon: getIconForPath(location)
      };
      
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    } else {
      setActiveTabId(tabExists.id);
    }
  }, [location]);

  const handleTabClick = (tab: Tab) => {
    setLocation(tab.path);
    setActiveTabId(tab.id);
  };

  const closeTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    
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
    <div className="bg-gray-100 border-b border-gray-200">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            className={`flex items-center min-w-fit max-w-[200px] px-3 py-2 border-r border-gray-200 select-none cursor-pointer transition-colors ${
              activeTabId === tab.id
                ? 'bg-white text-primary border-b-2 border-b-primary'
                : 'hover:bg-white/60 text-gray-600'
            }`}
          >
            <div className="flex items-center mr-2">
              {tab.icon}
            </div>
            <div className="truncate">{tab.title}</div>
            <div className="ml-3 flex items-center space-x-1">
              <button
                onClick={(e) => duplicateTab(e, tab)}
                className="p-1 rounded-md hover:bg-gray-200"
              >
                <Copy className="h-3.5 w-3.5 text-gray-500" />
              </button>
              <button
                onClick={(e) => closeTab(e, tab.id)}
                className="p-1 rounded-md hover:bg-gray-200"
                disabled={tabs.length <= 1}
              >
                <X className="h-3.5 w-3.5 text-gray-500" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}