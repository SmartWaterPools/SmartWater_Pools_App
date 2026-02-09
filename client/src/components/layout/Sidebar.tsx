import React, { useState } from "react";
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
  AlignRight,
  MessageSquare,
  BarChart4,
  Barcode,
  MapPin,
  Truck,
  Cog,
  ShieldCheck,
  ClipboardList,
  FileText,
  Package,
  CalendarRange
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabs } from "./EnhancedTabManager";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  user?: {
    name: string;
    role: string;
  };
}

export function Sidebar({ user: propUser }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();
  const { addTab, navigateToTab } = useTabs(); // Get tab functions from our tab context
  const { user, logout } = useAuth(); // Get user and logout function from auth context
  
  // Use either the prop user (for backward compatibility) or the authenticated user
  const displayUser = propUser || (user ? {
    name: user.name || user.username,
    role: user.role
  } : {
    name: "Guest",
    role: "Not logged in"
  });
  
  // Check if user has admin-level permissions (system_admin, org_admin, or admin)
  const isAdminUser = user && ['system_admin', 'org_admin', 'admin'].includes(user.role);
  
  const [isOnDashboard] = useRoute("/");
  const [isOnDispatch] = useRoute("/dispatch");
  const [isOnProjects] = useRoute("/projects");
  const [isOnMaintenance] = useRoute("/maintenance");
  const [isOnRepairs] = useRoute("/repairs");
  const [isOnClients] = useRoute("/clients");
  const [isOnTechnicians] = useRoute("/technicians");
  const [isOnCommunications] = useRoute("/communications");
  const [isOnBusiness] = useRoute("/business");
  const [isOnReports] = useRoute("/reports");
  const [isOnInvoices] = useRoute("/invoices");
  const [isOnInventory] = useRoute("/inventory");
  const [isOnBarcodeDemo] = useRoute("/inventory/barcode-demo");
  const [isOnWorkOrders] = useRoute("/work-orders");
  const [isOnMaintenanceOrders] = useRoute("/maintenance-orders");
  const [isOnSettings] = useRoute("/settings");
  const [isOnAdmin] = useRoute("/admin");
  
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Handle sidebar navigation - single click navigates directly
  const handleSidebarNavigation = (e: React.MouseEvent, path: string) => {
    e.preventDefault(); // Prevent the default navigation
    
    // Single click - create the tab and navigate to it immediately
    const title = getTitleForPath(path);
    const newTabId = addTab(path, title, true);
    navigateToTab(newTabId);
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
      case '/work-orders':
        return 'Scheduling';
      case '/maintenance-orders':
        return 'Maintenance Orders';
      case '/clients':
        return 'Clients';
      case '/technicians':
        return 'Technicians';
      case '/communications':
        return 'Communications';
      case '/business':
        return 'Business';
      case '/reports':
        return 'Reports';
      case '/invoices':
        return 'Invoices';
      case '/settings':
        return 'Settings';
      case '/inventory':
        return 'Inventory';
      case '/admin':
        return 'Admin Dashboard';
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
      case '/work-orders':
        return <ClipboardList className="h-4 w-4" />;
      case '/maintenance-orders':
        return <CalendarRange className="h-4 w-4" />;
      case '/clients':
        return <Users className="h-4 w-4" />;
      case '/technicians':
        return <UserRound className="h-4 w-4" />;
      case '/communications':
        return <MessageSquare className="h-4 w-4" />;
      case '/business':
        return <BarChart4 className="h-4 w-4" />;
      case '/reports':
        return <FileText className="h-4 w-4" />;
      case '/invoices':
        return <FileText className="h-4 w-4" />;
      case '/settings':
        return <Settings className="h-4 w-4" />;
      case '/inventory':
        return <Package className="h-4 w-4" />;
      case '/admin':
        return <ShieldCheck className="h-4 w-4" />;
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
                {displayUser.name.charAt(0)}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">{displayUser.name}</p>
                <p className="text-xs text-gray-500">{displayUser.role}</p>
              </div>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center py-4">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-lg">
              {displayUser.name.charAt(0)}
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
          
          {/* Dispatch Board */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/dispatch")}
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
              isOnDispatch ? "text-primary" : "text-gray-500"
            )}>
              <Truck className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                isOnDispatch ? "text-primary" : "text-gray-700"
              )}>
                Dispatch
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                isOnDispatch ? "text-primary font-medium" : "text-gray-500"
              )}>
                Dispatch
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
          
          {/* Scheduling Hub (Work Orders) */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/work-orders")}
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
              isOnWorkOrders ? "text-primary" : "text-gray-500"
            )}>
              <ClipboardList className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                isOnWorkOrders ? "text-primary" : "text-gray-700"
              )}>
                Scheduling
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                isOnWorkOrders ? "text-primary font-medium" : "text-gray-500"
              )}>
                Scheduling
              </span>
            )}
          </div>

          {/* Maintenance Orders */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/maintenance-orders")}
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
              isOnMaintenanceOrders ? "text-primary" : "text-gray-500"
            )}>
              <CalendarRange className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                isOnMaintenanceOrders ? "text-primary" : "text-gray-700"
              )}>
                Maint. Orders
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                isOnMaintenanceOrders ? "text-primary font-medium" : "text-gray-500"
              )}>
                Maint. Orders
              </span>
            )}
          </div>
          
          {/* Communications */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/communications")}
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
              isOnCommunications ? "text-primary" : "text-gray-500"
            )}>
              <MessageSquare className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                isOnCommunications ? "text-primary" : "text-gray-700"
              )}>
                Communications
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                isOnCommunications ? "text-primary font-medium" : "text-gray-500"
              )}>
                Comms
              </span>
            )}
          </div>
          
          {/* Business */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/business")}
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
              isOnBusiness ? "text-primary" : "text-gray-500"
            )}>
              <BarChart4 className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                isOnBusiness ? "text-primary" : "text-gray-700"
              )}>
                Business
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                isOnBusiness ? "text-primary font-medium" : "text-gray-500"
              )}>
                Business
              </span>
            )}
          </div>
          
          {/* Reports */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/reports")}
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
              isOnReports ? "text-primary" : "text-gray-500"
            )}>
              <Droplet className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                isOnReports ? "text-primary" : "text-gray-700"
              )}>
                Reports
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                isOnReports ? "text-primary font-medium" : "text-gray-500"
              )}>
                Reports
              </span>
            )}
          </div>
          
          {/* Invoices */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/invoices")}
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
              isOnInvoices ? "text-primary" : "text-gray-500"
            )}>
              <FileText className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                isOnInvoices ? "text-primary" : "text-gray-700"
              )}>
                Invoices
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                isOnInvoices ? "text-primary font-medium" : "text-gray-500"
              )}>
                Invoices
              </span>
            )}
          </div>
          
          {/* Inventory Management */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/inventory")}
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
              isOnInventory ? "text-primary" : "text-gray-500"
            )}>
              <Truck className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                isOnInventory ? "text-primary" : "text-gray-700"
              )}>
                Inventory
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                isOnInventory ? "text-primary font-medium" : "text-gray-500"
              )}>
                Inventory
              </span>
            )}
          </div>
          
          {/* Barcode Scanner */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/inventory/barcode-demo")}
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
              isOnBarcodeDemo ? "text-primary" : "text-gray-500"
            )}>
              <Barcode className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                isOnBarcodeDemo ? "text-primary" : "text-gray-700"
              )}>
                Barcode Scanner
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                isOnBarcodeDemo ? "text-primary font-medium" : "text-gray-500"
              )}>
                Scanner
              </span>
            )}
          </div>
          
          {/* Fleetmatics Vehicle Tracking */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/fleetmatics/vehicle-tracking")}
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
              location.startsWith("/fleetmatics/vehicle-tracking") ? "text-primary" : "text-gray-500"
            )}>
              <MapPin className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                location.startsWith("/fleetmatics/vehicle-tracking") ? "text-primary" : "text-gray-700"
              )}>
                Vehicle Tracking
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                location.startsWith("/fleetmatics/vehicle-tracking") ? "text-primary font-medium" : "text-gray-500"
              )}>
                Tracking
              </span>
            )}
          </div>
          
          {/* Fleetmatics Vehicle Mapping */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/fleetmatics/vehicle-mapping")}
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
              location.startsWith("/fleetmatics/vehicle-mapping") ? "text-primary" : "text-gray-500"
            )}>
              <Truck className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                location.startsWith("/fleetmatics/vehicle-mapping") ? "text-primary" : "text-gray-700"
              )}>
                Vehicle Mapping
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                location.startsWith("/fleetmatics/vehicle-mapping") ? "text-primary font-medium" : "text-gray-500"
              )}>
                Mapping
              </span>
            )}
          </div>
          
          {/* Fleetmatics Settings */}
          <div
            onClick={(e) => handleSidebarNavigation(e, "/fleetmatics/settings")}
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
              location.startsWith("/fleetmatics/settings") ? "text-primary" : "text-gray-500"
            )}>
              <Cog className="h-5 w-5" />
            </div>
            {!isCollapsed ? (
              <span className={cn(
                "text-sm font-medium",
                location.startsWith("/fleetmatics/settings") ? "text-primary" : "text-gray-700"
              )}>
                Fleetmatics Settings
              </span>
            ) : (
              <span className={cn(
                "text-xs mt-0.5",
                location.startsWith("/fleetmatics/settings") ? "text-primary font-medium" : "text-gray-500"
              )}>
                Fleet Settings
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
          
          {/* Admin Dashboard - only shown for admin users */}
          {isAdminUser && (
            <div
              onClick={(e) => handleSidebarNavigation(e, "/admin")}
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
                isOnAdmin ? "text-primary" : "text-gray-500"
              )}>
                <ShieldCheck className="h-5 w-5" />
              </div>
              {!isCollapsed ? (
                <span className={cn(
                  "text-sm font-medium",
                  isOnAdmin ? "text-primary" : "text-gray-700"
                )}>
                  Admin Dashboard
                </span>
              ) : (
                <span className={cn(
                  "text-xs mt-0.5",
                  isOnAdmin ? "text-primary font-medium" : "text-gray-500"
                )}>
                  Admin
                </span>
              )}
            </div>
          )}
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
            
            <div 
              onClick={logout}
              className="flex items-center py-2 text-sm font-medium text-red-600 cursor-pointer"
            >
              <LogOut className="mr-3 h-5 w-5 text-red-600" />
              Logout
            </div>
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
          onClick={(e) => handleSidebarNavigation(e, "/work-orders")}
          className="flex flex-col items-center px-3 py-1"
        >
          <div className={cn("p-1 rounded-md", isOnWorkOrders ? "text-primary" : "text-gray-500")}>
            <ClipboardList className="h-5 w-5" />
          </div>
          <span className={cn("text-xs mt-0.5", isOnWorkOrders ? "text-primary font-medium" : "text-gray-500")}>Jobs</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/communications")}
          className="flex flex-col items-center px-3 py-1"
        >
          <div className={cn("p-1 rounded-md", isOnCommunications ? "text-primary" : "text-gray-500")}>
            <MessageSquare className="h-5 w-5" />
          </div>
          <span className={cn("text-xs mt-0.5", isOnCommunications ? "text-primary font-medium" : "text-gray-500")}>Comms</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/technicians")}
          className="flex flex-col items-center px-3 py-1"
        >
          <div className={cn("p-1 rounded-md", isOnTechnicians ? "text-primary" : "text-gray-500")}>
            <UserRound className="h-5 w-5" />
          </div>
          <span className={cn("text-xs mt-0.5", isOnTechnicians ? "text-primary font-medium" : "text-gray-500")}>Techs</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/business")}
          className="flex flex-col items-center px-3 py-1"
        >
          <div className={cn("p-1 rounded-md", isOnBusiness ? "text-primary" : "text-gray-500")}>
            <BarChart4 className="h-5 w-5" />
          </div>
          <span className={cn("text-xs mt-0.5", isOnBusiness ? "text-primary font-medium" : "text-gray-500")}>Business</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/invoices")}
          className="flex flex-col items-center px-3 py-1"
        >
          <div className={cn("p-1 rounded-md", isOnInvoices ? "text-primary" : "text-gray-500")}>
            <FileText className="h-5 w-5" />
          </div>
          <span className={cn("text-xs mt-0.5", isOnInvoices ? "text-primary font-medium" : "text-gray-500")}>Invoices</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/inventory")}
          className="flex flex-col items-center px-3 py-1"
        >
          <div className={cn("p-1 rounded-md", isOnInventory ? "text-primary" : "text-gray-500")}>
            <Truck className="h-5 w-5" />
          </div>
          <span className={cn("text-xs mt-0.5", isOnInventory ? "text-primary font-medium" : "text-gray-500")}>Inventory</span>
        </div>
        
        <div 
          onClick={(e) => handleSidebarNavigation(e, "/inventory/barcode-demo")}
          className="flex flex-col items-center px-3 py-1"
        >
          <div className={cn("p-1 rounded-md", isOnBarcodeDemo ? "text-primary" : "text-gray-500")}>
            <Barcode className="h-5 w-5" />
          </div>
          <span className={cn("text-xs mt-0.5", isOnBarcodeDemo ? "text-primary font-medium" : "text-gray-500")}>Scanner</span>
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

        {/* Admin Dashboard - only shown for admin users in mobile navigation */}
        {isAdminUser && (
          <div 
            onClick={(e) => handleSidebarNavigation(e, "/admin")}
            className="flex flex-col items-center px-3 py-1"
          >
            <div className={cn("p-1 rounded-md", isOnAdmin ? "text-primary" : "text-gray-500")}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className={cn("text-xs mt-0.5", isOnAdmin ? "text-primary font-medium" : "text-gray-500")}>Admin</span>
          </div>
        )}
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
