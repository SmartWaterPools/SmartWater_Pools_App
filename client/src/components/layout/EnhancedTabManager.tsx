import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useLocation } from 'wouter';
import { 
  X, 
  Copy, 
  Plus,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard, 
  Building, 
  CalendarCheck, 
  Wrench, 
  Users, 
  UserRound,
  Settings,
  FileText,
  Clock,
  Package
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ClientWithUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define tab interface
export interface TabItem {
  id: string;
  title: string;
  path: string;
  icon: React.ReactNode;
  lastAccessed: number; // Timestamp to track when tab was last accessed
}

// Define context interface
interface TabContextType {
  tabs: TabItem[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  addTab: (path: string, title?: string, forceNew?: boolean) => string; // Returns the tab id
  closeTab: (id: string) => void;
  duplicateTab: (tab: TabItem) => void;
  getTabById: (id: string) => TabItem | undefined;
  getTabByPath: (path: string) => TabItem | undefined;
  navigateToTab: (tabId: string) => void;
  recentTabs: TabItem[]; // Last accessed tabs
}

// Create context with undefined initial value
const TabContext = createContext<TabContextType | undefined>(undefined);

// Path to title and icon mapping
const getIconForPath = (path: string): React.ReactNode => {
  // Check if path matches a specific pattern
  if (path === '/') {
    return <LayoutDashboard className="h-4 w-4" />;
  } else if (path === '/projects') {
    return <Building className="h-4 w-4" />;
  } else if (path === '/maintenance') {
    return <CalendarCheck className="h-4 w-4" />;
  } else if (path === '/repairs') {
    return <Wrench className="h-4 w-4" />;
  } else if (path === '/clients') {
    return <Users className="h-4 w-4" />;
  } else if (path === '/technicians') {
    return <UserRound className="h-4 w-4" />;
  } else if (path === '/client-portal') {
    return <FileText className="h-4 w-4" />;
  } else if (path.startsWith('/clients/') && path.endsWith('/edit')) {
    return <UserRound className="h-4 w-4" />;
  } else if (path.startsWith('/clients/')) {
    return <UserRound className="h-4 w-4" />;
  } else if (path === '/inventory') {
    return <Package className="h-4 w-4" />;
  }
  
  // Default icon
  return <FileText className="h-4 w-4" />;
};

const getTitleForPath = (path: string): string => {
  if (path === '/') return 'Dashboard';
  if (path === '/projects') return 'Build';
  if (path === '/maintenance') return 'Schedule';
  if (path === '/repairs') return 'Service';
  if (path === '/clients') return 'Clients';
  if (path === '/technicians') return 'Technicians';
  if (path === '/client-portal') return 'Client Portal';
  if (path === '/inventory') return 'Inventory';
  
  // Client detail pages need special handling since we don't know the client name yet
  const clientDetailsMatch = path.match(/^\/clients\/(\d+)$/);
  if (clientDetailsMatch) {
    return `Client ${clientDetailsMatch[1]}`;
  }
  
  // Client edit pages
  const clientEditMatch = path.match(/^\/clients\/(\d+)\/edit$/);
  if (clientEditMatch) {
    return `Edit Client ${clientEditMatch[1]}`;
  }
  
  // Default title based on path segments
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ');
  }
  
  return 'New Tab';
};

// Provider component to wrap the application

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  
  // Initialize tabs from localStorage or create a new dashboard tab as default
  const [tabs, setTabs] = useState<TabItem[]>(() => {
    // Try to load tabs from localStorage
    if (typeof window !== 'undefined') {
      try {
        const savedTabs = localStorage.getItem('smartwater_tabs');
        if (savedTabs) {
          const parsedTabs = JSON.parse(savedTabs);
          
          // Ensure we have valid tabs
          if (Array.isArray(parsedTabs) && parsedTabs.length > 0) {
            // When deserializing, we need to re-add the React elements for icons
            return parsedTabs.map((tab: Omit<TabItem, 'icon'>) => {
              // Restore the icon based on the path
              const icon = getIconForPath(tab.path);
              
              return {
                ...tab,
                icon
              };
            });
          }
        }
      } catch (error) {
        console.error('Error loading tabs from localStorage:', error);
      }
    }
    
    // Fallback to default dashboard tab
    return [{ 
      id: `tab-${Date.now()}`, 
      title: 'Dashboard', 
      path: '/', 
      icon: <LayoutDashboard className="h-4 w-4" />,
      lastAccessed: Date.now()
    }];
  });
  
  // Initialize activeTabId from localStorage or default to first tab
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedActiveTabId = localStorage.getItem('smartwater_active_tab');
        if (savedActiveTabId) {
          // Make sure the tab with this ID exists
          if (tabs.some(tab => tab.id === savedActiveTabId)) {
            return savedActiveTabId;
          }
        }
      } catch (error) {
        console.error('Error loading active tab from localStorage:', error);
      }
    }
    // Default to the first tab in the list
    return tabs.length > 0 ? tabs[0].id : `tab-${Date.now()}`;
  });
  
  // Get a tab by ID
  const getTabById = useCallback((id: string): TabItem | undefined => {
    return tabs.find(tab => tab.id === id);
  }, [tabs]);
  
  // Get a tab by path
  const getTabByPath = useCallback((path: string): TabItem | undefined => {
    return tabs.find(tab => tab.path === path);
  }, [tabs]);
  
  // Navigate to a tab by ID and update last accessed
  const navigateToTab = useCallback((tabId: string) => {
    const tab = getTabById(tabId);
    if (tab) {
      setActiveTabId(tabId);
      setLocation(tab.path);
      
      // Update last accessed timestamp
      setTabs(currentTabs => 
        currentTabs.map(t => 
          t.id === tabId ? { ...t, lastAccessed: Date.now() } : t
        )
      );
    }
  }, [getTabById, setLocation]);
  
  // Add a new tab or switch to existing one
  const addTab = useCallback((path: string, title?: string, forceNew: boolean = false): string => {
    // Special handling for dashboard path ('/')
    // If it's the dashboard path and we're not forcing a new tab, check if one already exists
    if (path === '/' && !forceNew) {
      const existingDashboardTab = tabs.find(tab => tab.path === '/');
      if (existingDashboardTab) {
        // Update the last accessed time of existing dashboard tab and return its ID
        setTabs(currentTabs => 
          currentTabs.map(t => 
            t.id === existingDashboardTab.id ? { ...t, lastAccessed: Date.now() } : t
          )
        );
        return existingDashboardTab.id;
      }
    }
    
    // For paths other than dashboard, or if forceNew is true, or if no dashboard tab exists
    const newTabId = `tab-${Date.now()}`;
    const tabTitle = title || getTitleForPath(path);
    const newTab: TabItem = {
      id: newTabId,
      title: tabTitle,
      path,
      icon: getIconForPath(path),
      lastAccessed: Date.now()
    };
    
    // Add the new tab
    setTabs(currentTabs => [...currentTabs, newTab]);
    
    return newTabId;
  }, [tabs]);
  
  // Close a tab
  const closeTab = useCallback((id: string) => {
    // Find the index of the tab to close
    const tabIndex = tabs.findIndex(tab => tab.id === id);
    const isActiveTab = id === activeTabId;
    
    // Get the tabs that will remain after closing
    const remainingTabs = tabs.filter(tab => tab.id !== id);
    
    // If closing the active tab, activate another tab
    if (isActiveTab && remainingTabs.length > 0) {
      // Sort remaining tabs by last accessed timestamp (descending)
      const sortedTabs = [...remainingTabs].sort((a, b) => b.lastAccessed - a.lastAccessed);
      
      // Activate the most recently accessed tab
      const tabToActivate = sortedTabs[0];
      setActiveTabId(tabToActivate.id);
      setLocation(tabToActivate.path);
    }
    
    // Remove the tab
    setTabs(remainingTabs);
  }, [tabs, activeTabId, setLocation]);
  
  // Duplicate a tab
  const duplicateTab = useCallback((tab: TabItem) => {
    // Create a duplicate with a new ID
    const newTab: TabItem = {
      ...tab,
      id: `tab-${Date.now()}`,
      title: `${tab.title} (Copy)`,
      lastAccessed: Date.now()
    };
    
    setTabs(prev => [...prev, newTab]);
    navigateToTab(newTab.id);
  }, [navigateToTab]);
  
  // Create a list of recent tabs sorted by last accessed time
  const recentTabs = [...tabs].sort((a, b) => b.lastAccessed - a.lastAccessed);
  
  // Dashboard tab deduplication is now implemented
  // We prevent multiple dashboard tabs from automatic creation
  // But still allow users to explicitly create them if desired
  
  // Watch for location changes to sync tabs
  // When location changes, find the matching tab and set it as active
  useEffect(() => {
    // First check if the currently active tab already matches the location
    const activeTab = getTabById(activeTabId);
    if (activeTab && activeTab.path === location) {
      // Active tab already matches location, no sync needed - just update last accessed
      return;
    }
    
    // Find all tabs matching this location
    const matchingTabs = tabs.filter(tab => tab.path === location);
    
    if (matchingTabs.length > 0) {
      // Prefer the most recently accessed tab for this path
      const mostRecentTab = matchingTabs.sort((a, b) => b.lastAccessed - a.lastAccessed)[0];
      
      // If a tab exists for this location, make it active and update its last accessed time
      if (activeTabId !== mostRecentTab.id) {
        setActiveTabId(mostRecentTab.id);
        setTabs(currentTabs => 
          currentTabs.map(t => 
            t.id === mostRecentTab.id ? { ...t, lastAccessed: Date.now() } : t
          )
        );
      }
    } else {
      // Special case - don't create new tabs for 404 pages or other special routes
      if (location === '/404' || location === '/error') {
        return;
      }
      
      // Create a new tab for any path (addTab will handle dashboard path specially)
      const newTabId = addTab(location);
      // Set the new tab as active
      setActiveTabId(newTabId);
    }
  }, [location, getTabById, tabs, addTab, activeTabId]);
  
  // Listen for custom addTab events
  useEffect(() => {
    const handleAddTabEvent = (event: CustomEvent) => {
      if (event.detail) {
        const { path, title, icon, forceNew = false, navigateToNewTab = true } = event.detail;
        if (path) {
          // Create a new tab for all paths
          const tabId = addTab(path, title, forceNew);
          
          if (navigateToNewTab) {
            navigateToTab(tabId);
          }
        }
      }
    };
    
    // Add the event listener to the window
    window.addEventListener('addTab', handleAddTabEvent as EventListener);
    
    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('addTab', handleAddTabEvent as EventListener);
    };
  }, [addTab, navigateToTab]);
  
  // Extract client ID for client-related pages to update tab titles
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
  
  // Save tabs to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && tabs.length > 0) {
      try {
        // We need to serialize the tabs without the React elements (icons)
        const tabsToSave = tabs.map(tab => {
          // Create a serializable version without the icon React element
          const { icon, ...rest } = tab;
          return {
            ...rest,
            // Special handling is now implemented in addTab function
            iconName: undefined
          };
        });
        
        localStorage.setItem('smartwater_tabs', JSON.stringify(tabsToSave));
      } catch (error) {
        console.error('Error saving tabs to localStorage:', error);
      }
    }
  }, [tabs]);
  
  // Save activeTabId to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && activeTabId) {
      try {
        localStorage.setItem('smartwater_active_tab', activeTabId);
      } catch (error) {
        console.error('Error saving active tab to localStorage:', error);
      }
    }
  }, [activeTabId]);
  
  // Make the context available globally to allow direct access from components
  // that don't have direct access to the context
  const contextValue = { 
    tabs, 
    activeTabId, 
    setActiveTabId,
    addTab, 
    closeTab, 
    duplicateTab,
    getTabById,
    getTabByPath,
    navigateToTab,
    recentTabs
  };
  
  // Expose the context to the window object
  if (typeof window !== 'undefined') {
    (window as any).__TAB_CONTEXT__ = contextValue;
  }
  
  return (
    <TabContext.Provider value={contextValue}>
      {children}
    </TabContext.Provider>
  );
}

// Define as separate named function using React.useContext for HMR compatibility
export function useTabs() {
  const context = React.useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTabs must be used within a TabProvider');
  }
  return context;
}

// The actual tab bar component
export function EnhancedTabManager() {
  const { tabs, activeTabId, setActiveTabId, navigateToTab, closeTab, duplicateTab, addTab } = useTabs();
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Handle scrolling of tabs if they overflow
  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      const newScrollPos = Math.max(0, scrollPosition - 200);
      scrollContainerRef.current.scrollTo({ left: newScrollPos, behavior: 'smooth' });
      setScrollPosition(newScrollPos);
    }
  };
  
  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      const maxScroll = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
      const newScrollPos = Math.min(maxScroll, scrollPosition + 200);
      scrollContainerRef.current.scrollTo({ left: newScrollPos, behavior: 'smooth' });
      setScrollPosition(newScrollPos);
    }
  };
  
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollLeft);
    }
  };
  
  // Check if we can scroll in either direction
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  useEffect(() => {
    const checkScrollability = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5); // 5px buffer for small rounding errors
      }
    };
    
    checkScrollability();
    
    // Add resize observer to check when container size changes
    const resizeObserver = new ResizeObserver(checkScrollability);
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }
    
    return () => {
      if (scrollContainerRef.current) {
        resizeObserver.unobserve(scrollContainerRef.current);
      }
    };
  }, [tabs]);
  
  // Handle tab click - single click navigates directly to the tab
  const handleTabClick = (tab: TabItem) => {
    navigateToTab(tab.id);
  };
  
  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };
  
  const handleDuplicateTab = (e: React.MouseEvent, tab: TabItem) => {
    e.stopPropagation();
    duplicateTab(tab);
  };
  
  const handleNewTab = () => {
    // Explicitly force a new Dashboard tab when the user clicks the + button
    // This allows users to create multiple dashboard tabs if desired
    addTab('/', 'Dashboard', true);
  };
  
  // Track previous tabs length to detect new tabs being added
  const prevTabsLengthRef = React.useRef(tabs.length);
  
  // Auto-scroll to the latest (rightmost) tab when new tabs are added
  useEffect(() => {
    if (tabs.length > prevTabsLengthRef.current && scrollContainerRef.current) {
      // New tab was added, scroll to the end
      const container = scrollContainerRef.current;
      setTimeout(() => {
        container.scrollTo({ 
          left: container.scrollWidth, 
          behavior: 'smooth' 
        });
        setScrollPosition(container.scrollWidth - container.clientWidth);
      }, 50); // Small delay to ensure the new tab is rendered
    }
    prevTabsLengthRef.current = tabs.length;
  }, [tabs.length]);
  
  // Scroll active tab into view when it changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeTabElement = scrollContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
      if (activeTabElement) {
        const container = scrollContainerRef.current;
        const tabRect = activeTabElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Check if tab is outside visible area
        if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
          // Scroll the active tab into view
          activeTabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          
          // Update scroll position after scrolling
          setTimeout(() => {
            setScrollPosition(container.scrollLeft);
          }, 300);
        }
      }
    }
  }, [activeTabId]);
  
  return (
    <div className="bg-white border-b border-gray-200 relative overflow-hidden">
      {/* Tab Navigation */}
      <div className="relative flex items-center w-full">
        {/* Left scroll button */}
        {canScrollLeft && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute left-0 z-10 px-1 h-full rounded-none shadow-sm bg-white/80 backdrop-blur-sm" 
            onClick={handleScrollLeft}
            title="Scroll Left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        
        {/* Scrollable tab container - constrained width to prevent page stretching */}
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto scrollbar-hide flex-1 min-w-0"
          onScroll={handleScroll}
          style={{ scrollBehavior: 'smooth' }}
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => handleTabClick(tab)}
              title="Click to navigate to this tab"
              className={cn(
                "flex items-center py-2.5 px-4 cursor-pointer w-[140px] relative",
                activeTabId === tab.id 
                  ? "text-primary border-b-2 border-b-primary border-t-0 border-l-0 border-r-0" 
                  : "text-gray-600 border-b-transparent border-b-2 border-t-0 border-l-0 border-r-0"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center min-w-0 flex-1">
                  {/* Show icon if available */}
                  {tab.icon && (
                    <span className={cn(
                      "mr-1.5 flex-shrink-0", 
                      activeTabId === tab.id ? "text-primary" : "text-gray-500"
                    )}>
                      {tab.icon}
                    </span>
                  )}
                  <span className="truncate text-sm">{tab.title}</span>
                </div>
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className="p-0.5 rounded-full hover:bg-gray-100 ml-2 flex-shrink-0"
                  title="Close Tab"
                >
                  <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            </div>
          ))}
          
          {/* Add new tab button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="px-3 py-3 h-full rounded-none" 
            onClick={handleNewTab}
            title="New Tab"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Right scroll button */}
        {canScrollRight && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute right-0 z-10 px-1 h-full rounded-none shadow-sm bg-white/80 backdrop-blur-sm" 
            onClick={handleScrollRight}
            title="Scroll Right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}