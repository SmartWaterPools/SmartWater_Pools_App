import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Building, 
  CalendarCheck, 
  Wrench, 
  Menu,
  Users,
  UserRound,
  Settings,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTabs } from "./EnhancedTabManager";
import { useState } from "react";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { addTab } = useTabs();

  // Check current route to highlight active menu item
  const isOnDashboard = location === "/";
  const isOnProjects = location === "/projects";
  const isOnMaintenance = location === "/maintenance";
  const isOnRepairs = location === "/repairs";
  const isOnClients = location === "/clients";
  const isOnTechnicians = location === "/technicians";
  const isOnSettings = location === "/settings";

  // Handle mobile navigation through the tab system
  const handleMobileNavigation = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    
    // Close mobile menu after navigation
    setIsOpen(false);
    
    // Get appropriate title for the tab
    const title = getTitleForPath(path);
    
    // Use tab manager to navigate
    addTab(path, title, false);
  };
  
  // Helper to get title for a given path
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

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 rounded-full shadow-lg bg-primary text-white flex items-center justify-center"
        >
          {isOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Mobile navigation overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40">
          <div className="bg-white w-64 h-full absolute right-0 flex flex-col shadow-xl p-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
              <h2 className="text-lg font-bold">Menu</h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X size={18} />
              </Button>
            </div>
            
            <nav className="flex-1 space-y-2">
              <div
                onClick={(e) => handleMobileNavigation(e, "/")}
                className={cn(
                  "flex items-center py-3 px-4 rounded-md",
                  isOnDashboard 
                    ? "bg-primary text-white" 
                    : "hover:bg-blue-50 text-gray-700"
                )}
              >
                <LayoutDashboard className="h-5 w-5 mr-3" />
                <span className="font-medium">Dashboard</span>
              </div>
              
              <div
                onClick={(e) => handleMobileNavigation(e, "/projects")}
                className={cn(
                  "flex items-center py-3 px-4 rounded-md",
                  isOnProjects 
                    ? "bg-primary text-white" 
                    : "hover:bg-blue-50 text-gray-700"
                )}
              >
                <Building className="h-5 w-5 mr-3" />
                <span className="font-medium">Projects</span>
              </div>
              
              <div
                onClick={(e) => handleMobileNavigation(e, "/maintenance")}
                className={cn(
                  "flex items-center py-3 px-4 rounded-md",
                  isOnMaintenance 
                    ? "bg-primary text-white" 
                    : "hover:bg-blue-50 text-gray-700"
                )}
              >
                <CalendarCheck className="h-5 w-5 mr-3" />
                <span className="font-medium">Maintenance</span>
              </div>
              
              <div
                onClick={(e) => handleMobileNavigation(e, "/repairs")}
                className={cn(
                  "flex items-center py-3 px-4 rounded-md",
                  isOnRepairs 
                    ? "bg-primary text-white" 
                    : "hover:bg-blue-50 text-gray-700"
                )}
              >
                <Wrench className="h-5 w-5 mr-3" />
                <span className="font-medium">Repairs</span>
              </div>
              
              <div
                onClick={(e) => handleMobileNavigation(e, "/clients")}
                className={cn(
                  "flex items-center py-3 px-4 rounded-md",
                  isOnClients 
                    ? "bg-primary text-white" 
                    : "hover:bg-blue-50 text-gray-700"
                )}
              >
                <Users className="h-5 w-5 mr-3" />
                <span className="font-medium">Clients</span>
              </div>
              
              <div
                onClick={(e) => handleMobileNavigation(e, "/technicians")}
                className={cn(
                  "flex items-center py-3 px-4 rounded-md",
                  isOnTechnicians 
                    ? "bg-primary text-white" 
                    : "hover:bg-blue-50 text-gray-700"
                )}
              >
                <UserRound className="h-5 w-5 mr-3" />
                <span className="font-medium">Technicians</span>
              </div>
              
              <div
                onClick={(e) => handleMobileNavigation(e, "/settings")}
                className={cn(
                  "flex items-center py-3 px-4 rounded-md",
                  isOnSettings 
                    ? "bg-primary text-white" 
                    : "hover:bg-blue-50 text-gray-700"
                )}
              >
                <Settings className="h-5 w-5 mr-3" />
                <span className="font-medium">Settings</span>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
