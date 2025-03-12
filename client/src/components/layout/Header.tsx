import { useState } from "react";
import { Menu, BellIcon, UserCircle, Settings, LogOut, List, X, AlertTriangle, CheckCircle } from "lucide-react";
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
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center md:hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleMobileMenu}
            className="text-foreground hover:text-primary"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
        <div className="md:hidden flex items-center justify-center flex-1">
          <h1 className="text-lg font-bold text-primary font-heading">SmartWater Pools</h1>
        </div>
        <div className="flex items-center space-x-4">
          {/* Notifications Dropdown */}
          <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative text-gray-500 hover:text-primary"
              >
                <BellIcon className="h-6 w-6" />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 block w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <span className="font-medium">Notifications</span>
                <Button variant="ghost" size="sm" className="text-xs">
                  Mark all as read
                </Button>
              </div>
              {notifications.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id}
                      className="p-3 cursor-pointer focus:bg-blue-50"
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="flex items-start">
                        <div className="mr-2 mt-1">
                          {notification.type === 'alert' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{notification.message}</p>
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
              <Button 
                variant="ghost" 
                className="w-full justify-center text-primary text-sm"
                onClick={() => {
                  setNotificationsOpen(false);
                  setLocation('/notifications');
                }}
              >
                View all notifications
              </Button>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{user?.name || user?.username || 'User'}</p>
                  <p className="w-[200px] truncate text-sm text-gray-500">
                    {user?.email || 'No email provided'}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
