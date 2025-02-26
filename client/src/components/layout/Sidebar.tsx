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
  
  // Desktop sidebar
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
        <nav className={cn(
          "flex-1 space-y-1",
          isCollapsed ? "px-3" : "px-2"
        )}>
          <div
            onClick={(e) => handleSidebarNavigation(e, "/")}
            className={cn(
              "flex items-center py-2 text-sm font-medium rounded-md cursor-pointer",
              isCollapsed ? "justify-center px-2" : "px-3",
              isOnDashboard ? 'bg-primary text-white' : 'text-foreground hover:bg-blue-50'
            )}
          >
            <LayoutDashboard className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
            {!isCollapsed && <span>Dashboard</span>}
          </div>
          <div
            onClick={(e) => handleSidebarNavigation(e, "/projects")}
            className={cn(
              "flex items-center py-2 text-sm font-medium rounded-md cursor-pointer",
              isCollapsed ? "justify-center px-2" : "px-3",
              isOnProjects ? 'bg-primary text-white' : 'text-foreground hover:bg-blue-50'
            )}
          >
            <Building className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
            {!isCollapsed && <span>Construction Projects</span>}
          </div>
          
          <div
            onClick={(e) => handleSidebarNavigation(e, "/maintenance")}
            className={cn(
              "flex items-center py-2 text-sm font-medium rounded-md cursor-pointer",
              isCollapsed ? "justify-center px-2" : "px-3",
              isOnMaintenance ? 'bg-primary text-white' : 'text-foreground hover:bg-blue-50'
            )}
          >
            <CalendarCheck className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
            {!isCollapsed && <span>Maintenance</span>}
          </div>
          
          <div
            onClick={(e) => handleSidebarNavigation(e, "/repairs")}
            className={cn(
              "flex items-center py-2 text-sm font-medium rounded-md cursor-pointer",
              isCollapsed ? "justify-center px-2" : "px-3",
              isOnRepairs ? 'bg-primary text-white' : 'text-foreground hover:bg-blue-50'
            )}
          >
            <Wrench className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
            {!isCollapsed && <span>Repairs</span>}
          </div>
          
          <div
            onClick={(e) => handleSidebarNavigation(e, "/clients")}
            className={cn(
              "flex items-center py-2 text-sm font-medium rounded-md cursor-pointer",
              isCollapsed ? "justify-center px-2" : "px-3",
              isOnClients ? 'bg-primary text-white' : 'text-foreground hover:bg-blue-50'
            )}
          >
            <Users className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
            {!isCollapsed && <span>Clients</span>}
          </div>
          
          <div
            onClick={(e) => handleSidebarNavigation(e, "/technicians")}
            className={cn(
              "flex items-center py-2 text-sm font-medium rounded-md cursor-pointer",
              isCollapsed ? "justify-center px-2" : "px-3",
              isOnTechnicians ? 'bg-primary text-white' : 'text-foreground hover:bg-blue-50'
            )}
          >
            <UserRound className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
            {!isCollapsed && <span>Technicians</span>}
          </div>
          
          <div
            onClick={(e) => handleSidebarNavigation(e, "/settings")}
            className={cn(
              "flex items-center py-2 text-sm font-medium rounded-md cursor-pointer",
              isCollapsed ? "justify-center px-2" : "px-3",
              isOnSettings ? 'bg-primary text-white' : 'text-foreground hover:bg-blue-50'
            )}
          >
            <Settings className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
            {!isCollapsed && <span>Settings</span>}
          </div>
        </nav>
        {!isCollapsed && (
          <div className="px-4 mt-6">
            <a href="#help" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-blue-50">
              <HelpCircle className="mr-3 h-5 w-5" />
              Help & Support
            </a>
            <a href="#logout" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50">
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </a>
          </div>
        )}
        {isCollapsed && (
          <div className="flex flex-col items-center gap-3 mt-6">
            <a href="#help" className="p-2 text-foreground hover:bg-blue-50 rounded-md">
              <HelpCircle className="h-5 w-5" />
            </a>
            <a href="#logout" className="p-2 text-red-600 hover:bg-red-50 rounded-md">
              <LogOut className="h-5 w-5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
  
  // Mobile bottom navigation bar (from screenshots)
  const MobileBottomNav = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-between px-4 py-2">
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/")}
          className="flex flex-col items-center px-3 py-1"
        >
          <LayoutDashboard className={cn("h-6 w-6", isOnDashboard ? "text-primary" : "text-gray-500")} />
          <span className={cn("text-xs mt-0.5", isOnDashboard ? "text-primary font-medium" : "text-gray-500")}>Dashboard</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/clients")}
          className="flex flex-col items-center px-3 py-1"
        >
          <Users className={cn("h-6 w-6", isOnClients ? "text-primary" : "text-gray-500")} />
          <span className={cn("text-xs mt-0.5", isOnClients ? "text-primary font-medium" : "text-gray-500")}>Clients</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/projects")}
          className="flex flex-col items-center px-3 py-1"
        >
          <Building className={cn("h-6 w-6", isOnProjects ? "text-primary" : "text-gray-500")} />
          <span className={cn("text-xs mt-0.5", isOnProjects ? "text-primary font-medium" : "text-gray-500")}>Build</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/maintenance")}
          className="flex flex-col items-center px-3 py-1"
        >
          <CalendarCheck className={cn("h-6 w-6", isOnMaintenance ? "text-primary" : "text-gray-500")} />
          <span className={cn("text-xs mt-0.5", isOnMaintenance ? "text-primary font-medium" : "text-gray-500")}>Schedule</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/repairs")}
          className="flex flex-col items-center px-3 py-1"
        >
          <Wrench className={cn("h-6 w-6", isOnRepairs ? "text-primary" : "text-gray-500")} />
          <span className={cn("text-xs mt-0.5", isOnRepairs ? "text-primary font-medium" : "text-gray-500")}>Service</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/settings")}
          className="flex flex-col items-center px-3 py-1"
        >
          <AlignRight className="h-6 w-6 text-gray-500" />
          <span className="text-xs mt-0.5 text-gray-500">More</span>
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
