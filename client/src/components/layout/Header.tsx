import { useState } from "react";
import { Menu, BellIcon, UserCircle, Settings, LogOut, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  toggleMobileMenu: () => void;
}

export function Header({ toggleMobileMenu }: HeaderProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Mock notifications for demonstration
  const notifications = [
    { id: 1, type: 'alert', message: 'Pool maintenance due for client #1452', time: '10 minutes ago' },
    { id: 2, type: 'success', message: 'Invoice #2341 has been paid', time: '1 hour ago' },
  ];

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  const handleProfileClick = () => {
    setLocation('/settings');
  };

  const handleSettingsClick = () => {
    setLocation('/settings');
  };

  const handleNotificationClick = (id: number) => {
    toast({
      title: "Notification acknowledged",
      description: "You've viewed this notification.",
    });
    // In a real implementation, you would mark the notification as read in the backend
  };

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Mobile menu toggle */}
        <div className="flex items-center md:hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleMobileMenu}
            className="text-gray-600 hover:text-primary focus:outline-none"
            aria-label="Open mobile menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
        
        {/* Logo/Title (mobile) */}
        <div className="md:hidden flex items-center justify-center flex-1">
          <h1 className="text-lg font-bold text-primary font-heading">SmartWater Pools</h1>
        </div>
        
        {/* Desktop Logo/Title (hidden on mobile) */}
        <div className="hidden md:flex items-center">
          <h1 className="text-xl font-bold text-primary font-heading">SmartWater Pools Management</h1>
        </div>
        
        {/* Right side icons */}
        <div className="flex items-center space-x-3">
          {/* Notifications Dropdown */}
          <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative text-gray-600 hover:text-primary focus:outline-none"
                aria-label="View notifications"
              >
                <BellIcon className="h-6 w-6" />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 block w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[90vw] max-w-md sm:w-80">
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <span className="font-medium">Notifications</span>
                <Button variant="ghost" size="sm" className="text-xs">
                  Mark all as read
                </Button>
              </div>
              {notifications.length > 0 ? (
                <div className="max-h-[50vh] sm:max-h-[300px] overflow-y-auto">
                  {notifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id}
                      className="p-3 cursor-pointer focus:bg-blue-50"
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="flex items-start">
                        <div className="mr-2 mt-1 flex-shrink-0">
                          {notification.type === 'alert' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 break-words">{notification.message}</p>
                          <p className="text-xs text-gray-500">{notification.time}</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-gray-500">
                  <p>No new notifications</p>
                </div>
              )}
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button 
                  variant="outline"
                  className="w-full justify-center text-primary text-sm"
                  onClick={() => {
                    setNotificationsOpen(false);
                    setLocation('/notifications');
                  }}
                >
                  View all notifications
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full focus:outline-none"
                aria-label="User menu"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[90vw] max-w-sm sm:w-64">
              <div className="flex items-center justify-start p-4 border-b">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-lg mr-4 flex-shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="font-medium text-gray-900 truncate">{user?.name || user?.username || 'User'}</p>
                  <p className="truncate text-sm text-gray-500">
                    {user?.email || 'No email provided'}
                  </p>
                </div>
              </div>
              <div className="p-2">
                <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer rounded-md p-2 focus:bg-blue-50">
                  <UserCircle className="mr-2 h-5 w-5 text-gray-500" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer rounded-md p-2 focus:bg-blue-50">
                  <Settings className="mr-2 h-5 w-5 text-gray-500" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-md p-2 focus:bg-blue-50">
                  <LogOut className="mr-2 h-5 w-5 text-gray-500" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
