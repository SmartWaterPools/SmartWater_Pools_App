import { X, Droplet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { user } = useAuth();

  const navigateTo = (path: string) => {
    onClose();
    window.location.href = path;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" 
        onClick={onClose}
      ></div>
      
      {/* Mobile sidebar */}
      <div className="relative flex flex-col w-full max-w-xs bg-white h-full">
        <div className="flex items-center justify-between h-16 border-b border-gray-200 px-4">
          <div className="flex items-center">
            <Droplet className="h-6 w-6 text-primary mr-2" fill="#0077B6" />
            <h1 className="text-xl font-bold text-primary font-heading">SmartWater Pools</h1>
          </div>
          <button className="text-gray-500 p-1 rounded-full hover:bg-gray-100" onClick={onClose}>
            <span className="sr-only">Close sidebar</span>
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4">
            <div className="flex items-center p-2 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-lg">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">{user?.name || user?.username || 'User'}</p>
                <p className="text-xs text-gray-500">{user?.role || 'Role'}</p>
              </div>
            </div>
          </div>
          <nav className="px-2 space-y-1">
            <div 
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-primary text-white cursor-pointer"
              onClick={() => navigateTo("/")}
            >
              <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </div>
            
            <div 
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-blue-50 cursor-pointer"
              onClick={() => navigateTo("/projects")}
            >
              <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Construction Projects
            </div>
            <div 
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-blue-50 cursor-pointer"
              onClick={() => navigateTo("/maintenance")}
            >
              <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Maintenance
            </div>
            
            <div 
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-blue-50 cursor-pointer"
              onClick={() => navigateTo("/repairs")}
            >
              <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Repairs
            </div>
            
            <div 
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-blue-50 cursor-pointer"
              onClick={() => navigateTo("/clients")}
            >
              <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Clients
            </div>
            
            <div 
              className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-blue-50 cursor-pointer"
              onClick={() => navigateTo("/technicians")}
            >
              <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Technicians
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}