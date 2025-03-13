import { X, Droplet, Home, Activity, Briefcase, UserCircle, Users, Settings, LogOut, Wrench, Phone, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

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
                  <a className="text-xs text-primary hover:underline">View Profile</a>
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
              <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <Home className="mr-3 h-5 w-5" />
                Dashboard
              </a>
            </Link>
            
            {/* Projects */}
            <Link href="/projects" onClick={onClose}>
              <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/projects') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <Briefcase className="mr-3 h-5 w-5" />
                Projects
              </a>
            </Link>
            
            {/* Maintenance */}
            <Link href="/maintenance" onClick={onClose}>
              <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/maintenance') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <Activity className="mr-3 h-5 w-5" />
                Maintenance
              </a>
            </Link>
            
            {/* Repairs */}
            <Link href="/repairs" onClick={onClose}>
              <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/repairs') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <Wrench className="mr-3 h-5 w-5" />
                Repairs
              </a>
            </Link>
            
            {/* Clients */}
            <Link href="/clients" onClick={onClose}>
              <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/clients') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <Users className="mr-3 h-5 w-5" />
                Clients
              </a>
            </Link>
            
            {/* Technicians */}
            <Link href="/technicians" onClick={onClose}>
              <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/technicians') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <UserCircle className="mr-3 h-5 w-5" />
                Technicians
              </a>
            </Link>
            
            {/* Communications */}
            <Link href="/communications" onClick={onClose}>
              <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/communications') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <MessageSquare className="mr-3 h-5 w-5" />
                Communications
              </a>
            </Link>
            
            {/* Business */}
            <Link href="/business" onClick={onClose}>
              <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/business') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-blue-50'
              }`}>
                <Phone className="mr-3 h-5 w-5" />
                Business
              </a>
            </Link>
          </div>
        </nav>
        
        {/* Footer actions */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-1">
            <Link href="/settings" onClick={onClose}>
              <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive('/settings') ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}>
                <Settings className="mr-3 h-5 w-5" />
                Settings
              </a>
            </Link>
            
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