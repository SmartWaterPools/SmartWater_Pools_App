import { X, Droplet, Home, Activity, Briefcase, UserCircle, Users, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
    onClose();
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      ></div>
      
      {/* Mobile sidebar */}
      <div className="fixed inset-y-0 left-0 flex flex-col w-64 max-w-xs bg-white h-full shadow-xl transform transition-transform duration-300 ease-in-out">
        <div className="flex items-center justify-between h-16 border-b border-gray-200 px-4">
          <div className="flex items-center">
            <Droplet className="h-6 w-6 text-primary mr-2" fill="currentColor" />
            <h1 className="text-xl font-bold text-primary font-heading">SmartWater</h1>
          </div>
          <button 
            className="text-gray-500 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary" 
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* User profile section */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-lg">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <p className="font-medium text-gray-900">{user?.name || user?.username || 'User'}</p>
              <p className="text-xs text-gray-500">{user?.role || 'Role'}</p>
            </div>
          </div>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            <Link href="/" onClick={onClose}>
              <a className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-primary text-white">
                <Home className="mr-3 h-5 w-5" />
                Dashboard
              </a>
            </Link>
            
            <Link href="/projects" onClick={onClose}>
              <a className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-blue-50">
                <Briefcase className="mr-3 h-5 w-5" />
                Projects
              </a>
            </Link>
            
            <Link href="/maintenance" onClick={onClose}>
              <a className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-blue-50">
                <Activity className="mr-3 h-5 w-5" />
                Maintenance
              </a>
            </Link>
            
            <Link href="/clients" onClick={onClose}>
              <a className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-blue-50">
                <Users className="mr-3 h-5 w-5" />
                Clients
              </a>
            </Link>
            
            <Link href="/technicians" onClick={onClose}>
              <a className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-blue-50">
                <UserCircle className="mr-3 h-5 w-5" />
                Technicians
              </a>
            </Link>
          </div>
        </nav>
        
        {/* Footer actions */}
        <div className="border-t border-gray-200 p-4">
          <div className="space-y-1">
            <Link href="/settings" onClick={onClose}>
              <a className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100">
                <Settings className="mr-3 h-5 w-5 text-gray-500" />
                Settings
              </a>
            </Link>
            
            <button 
              onClick={handleLogout} 
              className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="mr-3 h-5 w-5 text-gray-500" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}