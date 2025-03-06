import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Building, 
  CalendarCheck, 
  Wrench, 
  Users, 
  UserRound, 
  Settings, 
  HelpCircle, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Droplet,
  AlignRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabs } from "./EnhancedTabManager";

interface SidebarProps {
  user: {
    name: string;
    role: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();
  const { addTab } = useTabs(); // Get addTab function from our tab context
  
  const [isOnDashboard] = useRoute("/");
  const [isOnProjects] = useRoute("/projects");
  const [isOnMaintenance] = useRoute("/maintenance");
  const [isOnRepairs] = useRoute("/repairs");
  const [isOnClients] = useRoute("/clients");
  const [isOnTechnicians] = useRoute("/technicians");
  const [isOnSettings] = useRoute("/settings");
  
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Handle sidebar navigation by adding a new tab or navigating to an existing one
  const handleSidebarNavigation = (e: React.MouseEvent, path: string) => {
    e.preventDefault(); // Prevent the default navigation
    console.log('Sidebar navigation to:', path);
    
    // When clicking sidebar items, use the appropriate title
    const title = getTitleForPath(path);
    
    // This won't force a complete page reload and will use our tab manager
    // The third parameter is forceNew - setting to false means it will reuse existing tabs
    addTab(path, title, false);
  };
  
  // Helper functions to get title and icon for the path
  const getTitleForPath = (path: string): string => {
    switch (path) {
      case '/':
        return 'Dashboard';
      case '/projects':
        return 'Build';
      case '/maintenance':
        return 'Maintenance';
      case '/repairs':
        return 'Repair';
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
  
  // Desktop sidebar updated to match mobile navigation functionality and styling
  const DesktopSidebar = () => (
    <div 
      className={cn(
        "hidden md:flex flex-col bg-white border-r border-gray-200 h-full transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className={cn(
        "flex items-center h-16 border-b border-gray-200 px-4",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {!isCollapsed && (
          <div className="flex items-center">
            <Droplet className="h-6 w-6 text-primary mr-2" fill="#0077B6" />
            <h1 className="text-xl font-bold text-primary font-heading">SmartWater Pools</h1>
          </div>
        )}
        {isCollapsed && (
          <Droplet className="h-8 w-8 text-primary" fill="#0077B6" />
        )}
        <button 
          onClick={toggleSidebar}
          className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
      
      <div className="flex flex-col flex-grow py-4 overflow-y-auto">
        {!isCollapsed && (
          <div className="px-4 mb-6">
            <div className="flex items-center p-2 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-lg">
                {user.name.charAt(0)}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center py-4">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-lg">
              {user.name.charAt(0)}
            </div>
          </div>
        )}
        
        {/* Primary navigation items - exactly matching mobile navigation */}
        <nav className={cn(
          "flex-1",
          isCollapsed ? "px-1 space-y-3" : "px-4 space-y-2"
        )}>
          {/* Dashboard - matched to mobile navigation */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/")}
            className={cn(
              "flex cursor-pointer",
              isCollapsed 
                ? "flex-col items-center justify-center p-2" 
                : "items-center py-2 px-3 rounded-md hover:bg-gray-50"
            )}
          >
            <div className={cn(
              "flex items-center justify-center",
              isCollapsed ? "p-1 rounded-md" : "mr-3",
              isOnDashboard ? "text-primary" : "text-gray-500"
            )}>
              <LayoutDashboard className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                isOnDashboard ? "text-primary" : "text-gray-700"
              )}>
                Dashboard
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                isOnDashboard ? "text-primary font-medium" : "text-gray-500"
              )}>
                Dashboard
              </span>
            )}
          </div>
          
          {/* Clients - matched to mobile navigation */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/clients")}
            className={cn(
              "flex cursor-pointer",
              isCollapsed 
                ? "flex-col items-center justify-center p-2" 
                : "items-center py-2 px-3 rounded-md hover:bg-gray-50"
            )}
          >
            <div className={cn(
              "flex items-center justify-center",
              isCollapsed ? "p-1 rounded-md" : "mr-3",
              isOnClients ? "text-primary" : "text-gray-500"
            )}>
              <Users className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                isOnClients ? "text-primary" : "text-gray-700"
              )}>
                Clients
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                isOnClients ? "text-primary font-medium" : "text-gray-500"
              )}>
                Clients
              </span>
            )}
          </div>
          
          {/* Projects/Build - matched to mobile navigation */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/projects")}
            className={cn(
              "flex cursor-pointer",
              isCollapsed 
                ? "flex-col items-center justify-center p-2" 
                : "items-center py-2 px-3 rounded-md hover:bg-gray-50"
            )}
          >
            <div className={cn(
              "flex items-center justify-center",
              isCollapsed ? "p-1 rounded-md" : "mr-3",
              isOnProjects ? "text-primary" : "text-gray-500"
            )}>
              <Building className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                isOnProjects ? "text-primary" : "text-gray-700"
              )}>
                Build
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                isOnProjects ? "text-primary font-medium" : "text-gray-500"
              )}>
                Build
              </span>
            )}
          </div>
          
          {/* Maintenance - matched to mobile navigation */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/maintenance")}
            className={cn(
              "flex cursor-pointer",
              isCollapsed 
                ? "flex-col items-center justify-center p-2" 
                : "items-center py-2 px-3 rounded-md hover:bg-gray-50"
            )}
          >
            <div className={cn(
              "flex items-center justify-center",
              isCollapsed ? "p-1 rounded-md" : "mr-3",
              isOnMaintenance ? "text-primary" : "text-gray-500"
            )}>
              <CalendarCheck className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                isOnMaintenance ? "text-primary" : "text-gray-700"
              )}>
                Maintenance
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                isOnMaintenance ? "text-primary font-medium" : "text-gray-500"
              )}>
                Maintenance
              </span>
            )}
          </div>
          
          {/* Repairs - matched to mobile navigation */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/repairs")}
            className={cn(
              "flex cursor-pointer",
              isCollapsed 
                ? "flex-col items-center justify-center p-2" 
                : "items-center py-2 px-3 rounded-md hover:bg-gray-50"
            )}
          >
            <div className={cn(
              "flex items-center justify-center",
              isCollapsed ? "p-1 rounded-md" : "mr-3",
              isOnRepairs ? "text-primary" : "text-gray-500"
            )}>
              <Wrench className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                isOnRepairs ? "text-primary" : "text-gray-700"
              )}>
                Repair
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                isOnRepairs ? "text-primary font-medium" : "text-gray-500"
              )}>
                Repair
              </span>
            )}
          </div>
          
          {/* Settings - updated from More */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/settings")}
            className={cn(
              "flex cursor-pointer",
              isCollapsed 
                ? "flex-col items-center justify-center p-2" 
                : "items-center py-2 px-3 rounded-md hover:bg-gray-50"
            )}
          >
            <div className={cn(
              "flex items-center justify-center",
              isCollapsed ? "p-1 rounded-md" : "mr-3",
              isOnSettings ? "text-primary" : "text-gray-500"
            )}>
              <Settings className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                isOnSettings ? "text-primary" : "text-gray-700"
              )}>
                Settings
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                isOnSettings ? "text-primary font-medium" : "text-gray-500"
              )}>
                Settings
              </span>
            )}
          </div>
        </nav>
        
        {/* These additional links only show in expanded desktop mode */}
        {!isCollapsed && (
          <div className="px-4 mt-6 border-t pt-6">
            <div
              onClick={(e) => handleSidebarNavigation(e, "/technicians")}
              className={cn(
                "flex items-center py-2 rounded-md cursor-pointer",
                isOnTechnicians ? "bg-blue-50" : ""
              )}
            >
              <div className={cn(
                "mr-3",
                isOnTechnicians ? "text-primary" : "text-gray-500"
              )}>
                <UserRound className="h-5 w-5" />
              </div>
              <span className={cn(
                "text-sm font-medium",
                isOnTechnicians ? "text-primary" : "text-gray-700"
              )}>
                Technicians
              </span>
            </div>
            
            <a href="#help" className="flex items-center py-2 text-sm font-medium text-gray-700">
              <HelpCircle className="mr-3 h-5 w-5 text-gray-500" />
              Help & Support
            </a>
            
            <a href="#logout" className="flex items-center py-2 text-sm font-medium text-red-600">
              <LogOut className="mr-3 h-5 w-5 text-red-600" />
              Logout
            </a>
          </div>
        )}
      </div>
    </div>
  );
  
  // Mobile bottom navigation bar (matching the UI in screenshots)
  const MobileBottomNav = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 overflow-x-auto">
      <div className="flex items-center justify-between gap-4 px-3 py-2 min-w-max">
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/")}
          className="flex flex-col items-center px-3 py-1"
        >
          <div className={cn("p-1 rounded-md", isOnDashboard ? "text-primary" : "text-gray-500")}>
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <span className={cn("text-xs mt-0.5", isOnDashboard ? "text-primary font-medium" : "text-gray-500")}>Dashboard</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/clients")}
          className="flex flex-col items-center px-3 py-1"
        >
          <div className={cn("p-1 rounded-md", isOnClients ? "text-primary" : "text-gray-500")}>
            <Users className="h-5 w-5" />
          </div>
          <span className={cn("text-xs mt-0.5", isOnClients ? "text-primary font-medium" : "text-gray-500")}>Clients</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/projects")}
          className="flex flex-col items-center px-3 py-1"
        >
          <div className={cn("p-1 rounded-md", isOnProjects ? "text-primary" : "text-gray-500")}>
            <Building className="h-5 w-5" />
          </div>
          <span className={cn("text-xs mt-0.5", isOnProjects ? "text-primary font-medium" : "text-gray-500")}>Build</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/maintenance")}
          className="flex flex-col items-center px-3 py-1"
        >
          <div className={cn("p-1 rounded-md", isOnMaintenance ? "text-primary" : "text-gray-500")}>
            <CalendarCheck className="h-5 w-5" />
          </div>
          <span className={cn("text-xs mt-0.5", isOnMaintenance ? "text-primary font-medium" : "text-gray-500")}>Maintenance</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/repairs")}
          className="flex flex-col items-center px-3 py-1"
        >
          <div className={cn("p-1 rounded-md", isOnRepairs ? "text-primary" : "text-gray-500")}>
            <Wrench className="h-5 w-5" />
          </div>
          <span className={cn("text-xs mt-0.5", isOnRepairs ? "text-primary font-medium" : "text-gray-500")}>Repair</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/settings")}
          className="flex flex-col items-center px-3 py-1"
        >
          <div className={cn("p-1 rounded-md", isOnSettings ? "text-primary" : "text-gray-500")}>
            <Settings className="h-5 w-5" />
          </div>
          <span className={cn("text-xs mt-0.5", isOnSettings ? "text-primary font-medium" : "text-gray-500")}>Settings</span>
        </div>
      </div>
    </div>
  );
  
  return (
    <>
      <DesktopSidebar />
      <MobileBottomNav />
    </>
  );
}
