import { useState } from "react";
import { X, Droplet, Home, Activity, Briefcase, UserCircle, Users, Settings, LogOut, Wrench, Phone, MessageSquare, Barcode, CalendarCheck, CalendarRange, ChevronDown, Truck, MapPin, Cog, DollarSign, FileText, Calculator, Package, Navigation } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Link, useLocation } from "wouter";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { user, logout } = useAuth();
  const { canView } = usePermissions();
  const [location] = useLocation();
  const [isMaintenanceExpanded, setIsMaintenanceExpanded] = useState(() => location.startsWith('/maintenance'));
  const [isBillingExpanded, setIsBillingExpanded] = useState(() => location.startsWith('/invoices') || location.startsWith('/estimates'));
  const [isFleetExpanded, setIsFleetExpanded] = useState(() => location.startsWith('/fleetmatics'));

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
    onClose();
  };
  
  // If sidebar is closed, don't render anything to improve performance
  if (!isOpen) return null;

  // Check if current path matches link to highlight active item
  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  return (
    // Use aria-modal and role for accessibility
    <div className="fixed inset-0 z-50 md:hidden" aria-modal="true" role="dialog">
      {/* Backdrop with improved animation */}
      <div 
        className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ease-out duration-300" 
        onClick={onClose}
        aria-hidden="true"
      ></div>
      
      {/* Mobile sidebar with smoother animations */}
      <div className="fixed inset-y-0 left-0 flex flex-col w-72 max-w-sm bg-white h-full shadow-xl transform transition-all duration-300 ease-in-out">
        {/* Header with logo and close button */}
        <div className="flex items-center justify-between h-16 border-b border-gray-200 px-4">
          <div className="flex items-center">
            <Droplet className="h-6 w-6 text-primary mr-2" fill="currentColor" />
            <h1 className="text-xl font-bold text-primary font-heading">SmartWater Pools</h1>
          </div>
          <button 
            className="text-gray-500 p-2 rounded-full hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" 
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* User profile section with improved styling */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-lg shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="font-medium text-gray-900 truncate">{user?.name || user?.username || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || user?.role || ''}</p>
              <div className="mt-1">
                <Link href="/settings" onClick={onClose}>
                  <span className="text-xs text-primary hover:underline cursor-pointer">View Profile</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation Links with active state highlighting */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {/* Dashboard */}
            <Link href="/" onClick={onClose}>
              <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                isActive('/') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <Home className="mr-3 h-5 w-5" />
                Dashboard
              </div>
            </Link>
            
            {/* Projects */}
            {canView('projects') && (
            <Link href="/projects" onClick={onClose}>
              <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                isActive('/projects') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <Briefcase className="mr-3 h-5 w-5" />
                Projects
              </div>
            </Link>
            )}
            
            {/* Maintenance Group */}
            {canView('maintenance') && (
            <div>
              <div
                onClick={() => setIsMaintenanceExpanded(!isMaintenanceExpanded)}
                className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                  isActive('/maintenance') ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center">
                  <CalendarCheck className="mr-3 h-5 w-5" />
                  Maintenance
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isMaintenanceExpanded ? 'rotate-180' : ''}`} />
              </div>
              {isMaintenanceExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  <Link href="/maintenance" onClick={onClose}>
                    <div className={`flex items-center px-3 py-1.5 text-sm rounded-md cursor-pointer ${
                      location === '/maintenance' ? 'text-primary font-medium' : 'text-gray-600 hover:bg-blue-50'
                    }`}>
                      <CalendarCheck className="mr-2 h-4 w-4" />
                      Maintenance
                    </div>
                  </Link>
                  <Link href="/maintenance-orders" onClick={onClose}>
                    <div className={`flex items-center px-3 py-1.5 text-sm rounded-md cursor-pointer ${
                      isActive('/maintenance-orders') ? 'text-primary font-medium' : 'text-gray-600 hover:bg-blue-50'
                    }`}>
                      <CalendarRange className="mr-2 h-4 w-4" />
                      Maint. Orders
                    </div>
                  </Link>
                  <Link href="/dispatch" onClick={onClose}>
                    <div className={`flex items-center px-3 py-1.5 text-sm rounded-md cursor-pointer ${
                      isActive('/dispatch') ? 'text-primary font-medium' : 'text-gray-600 hover:bg-blue-50'
                    }`}>
                      <Navigation className="mr-2 h-4 w-4" />
                      Dispatch Board
                    </div>
                  </Link>
                </div>
              )}
            </div>
            )}
            
            {/* Repairs */}
            {canView('repairs') && (
            <Link href="/repairs" onClick={onClose}>
              <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                isActive('/repairs') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <Wrench className="mr-3 h-5 w-5" />
                Repairs
              </div>
            </Link>
            )}
            
            {/* Clients */}
            {canView('clients') && (
            <Link href="/clients" onClick={onClose}>
              <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                isActive('/clients') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <Users className="mr-3 h-5 w-5" />
                Clients
              </div>
            </Link>
            )}
            
            {/* Technicians */}
            {canView('technicians') && (
            <Link href="/technicians" onClick={onClose}>
              <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                isActive('/technicians') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <UserCircle className="mr-3 h-5 w-5" />
                Technicians
              </div>
            </Link>
            )}
            
            {/* Communications */}
            {canView('communications') && (
            <Link href="/communications" onClick={onClose}>
              <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                isActive('/communications') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <MessageSquare className="mr-3 h-5 w-5" />
                Communications
              </div>
            </Link>
            )}
            
            {/* Business */}
            {canView('settings') && (
            <Link href="/business" onClick={onClose}>
              <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                isActive('/business') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <Phone className="mr-3 h-5 w-5" />
                Business
              </div>
            </Link>
            )}
            
            {/* Reports */}
            {canView('reports') && (
            <Link href="/reports" onClick={onClose}>
              <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                isActive('/reports') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <Phone className="mr-3 h-5 w-5" />
                Reports
              </div>
            </Link>
            )}
            
            {/* Billing Group */}
            {canView('invoices') && (
            <div>
              <div
                onClick={() => setIsBillingExpanded(!isBillingExpanded)}
                className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                  isActive('/invoices') || isActive('/estimates') ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center">
                  <DollarSign className="mr-3 h-5 w-5" />
                  Billing
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isBillingExpanded ? 'rotate-180' : ''}`} />
              </div>
              {isBillingExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  <Link href="/invoices" onClick={onClose}>
                    <div className={`flex items-center px-3 py-1.5 text-sm rounded-md cursor-pointer ${
                      isActive('/invoices') ? 'text-primary font-medium' : 'text-gray-600 hover:bg-blue-50'
                    }`}>
                      <FileText className="mr-2 h-4 w-4" />
                      Invoices
                    </div>
                  </Link>
                  <Link href="/estimates" onClick={onClose}>
                    <div className={`flex items-center px-3 py-1.5 text-sm rounded-md cursor-pointer ${
                      isActive('/estimates') ? 'text-primary font-medium' : 'text-gray-600 hover:bg-blue-50'
                    }`}>
                      <Calculator className="mr-2 h-4 w-4" />
                      Estimates
                    </div>
                  </Link>
                </div>
              )}
            </div>
            )}
            
            {/* Fleet Group */}
            {canView('vehicles') && (
            <div>
              <div
                onClick={() => setIsFleetExpanded(!isFleetExpanded)}
                className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                  isActive('/fleetmatics') ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center">
                  <Truck className="mr-3 h-5 w-5" />
                  Fleet
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isFleetExpanded ? 'rotate-180' : ''}`} />
              </div>
              {isFleetExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  <Link href="/fleetmatics/vehicle-tracking" onClick={onClose}>
                    <div className={`flex items-center px-3 py-1.5 text-sm rounded-md cursor-pointer ${
                      isActive('/fleetmatics/vehicle-tracking') ? 'text-primary font-medium' : 'text-gray-600 hover:bg-blue-50'
                    }`}>
                      <MapPin className="mr-2 h-4 w-4" />
                      Vehicle Tracking
                    </div>
                  </Link>
                  <Link href="/fleetmatics/vehicle-mapping" onClick={onClose}>
                    <div className={`flex items-center px-3 py-1.5 text-sm rounded-md cursor-pointer ${
                      isActive('/fleetmatics/vehicle-mapping') ? 'text-primary font-medium' : 'text-gray-600 hover:bg-blue-50'
                    }`}>
                      <Truck className="mr-2 h-4 w-4" />
                      Vehicle Mapping
                    </div>
                  </Link>
                  <Link href="/fleetmatics/settings" onClick={onClose}>
                    <div className={`flex items-center px-3 py-1.5 text-sm rounded-md cursor-pointer ${
                      isActive('/fleetmatics/settings') ? 'text-primary font-medium' : 'text-gray-600 hover:bg-blue-50'
                    }`}>
                      <Cog className="mr-2 h-4 w-4" />
                      Fleet Settings
                    </div>
                  </Link>
                </div>
              )}
            </div>
            )}
            
            {/* Inventory */}
            {canView('inventory') && (
            <Link href="/inventory" onClick={onClose}>
              <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                isActive('/inventory') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <Package className="mr-3 h-5 w-5" />
                Inventory
              </div>
            </Link>
            )}
            
            {/* Barcode Scanner Demo */}
            {canView('inventory') && (
            <Link href="/inventory/barcode-demo" onClick={onClose}>
              <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                isActive('/inventory/barcode-demo') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <Barcode className="mr-3 h-5 w-5" />
                Barcode Scanner
              </div>
            </Link>
            )}
          </div>
        </nav>
        
        {/* Footer actions */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-1">
            {canView('settings') && (
            <Link href="/settings" onClick={onClose}>
              <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                isActive('/settings') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}>
                <Settings className="mr-3 h-5 w-5" />
                Settings
              </div>
            </Link>
            )}
            
            <button 
              onClick={handleLogout} 
              className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}