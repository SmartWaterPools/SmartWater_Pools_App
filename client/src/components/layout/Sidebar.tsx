import { Link, useRoute } from "wouter";
import { 
  LayoutDashboard, 
  Building, 
  CalendarCheck, 
  Wrench, 
  Users, 
  UserRound, 
  Settings, 
  HelpCircle, 
  LogOut 
} from "lucide-react";

interface SidebarProps {
  user: {
    name: string;
    role: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const [isOnDashboard] = useRoute("/");
  const [isOnProjects] = useRoute("/projects");
  const [isOnMaintenance] = useRoute("/maintenance");
  const [isOnRepairs] = useRoute("/repairs");
  const [isOnClients] = useRoute("/clients");
  const [isOnTechnicians] = useRoute("/technicians");
  const [isOnSettings] = useRoute("/settings");
  
  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-full transition-all duration-300">
      <div className="flex items-center justify-center h-16 border-b border-gray-200 px-4">
        <h1 className="text-xl font-bold text-primary font-heading">SmartWater Pools</h1>
      </div>
      <div className="flex flex-col flex-grow py-4 overflow-y-auto">
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
        <nav className="flex-1 px-2 space-y-1">
          <Link href="/">
            <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isOnDashboard ? 'bg-primary text-white' : 'text-foreground hover:bg-blue-50'}`}>
              <LayoutDashboard className="mr-3 h-5 w-5" />
              Dashboard
            </a>
          </Link>
          <Link href="/projects">
            <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isOnProjects ? 'bg-primary text-white' : 'text-foreground hover:bg-blue-50'}`}>
              <Building className="mr-3 h-5 w-5" />
              Construction Projects
            </a>
          </Link>
          <Link href="/maintenance">
            <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isOnMaintenance ? 'bg-primary text-white' : 'text-foreground hover:bg-blue-50'}`}>
              <CalendarCheck className="mr-3 h-5 w-5" />
              Maintenance
            </a>
          </Link>
          <Link href="/repairs">
            <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isOnRepairs ? 'bg-primary text-white' : 'text-foreground hover:bg-blue-50'}`}>
              <Wrench className="mr-3 h-5 w-5" />
              Repairs
            </a>
          </Link>
          <Link href="/clients">
            <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isOnClients ? 'bg-primary text-white' : 'text-foreground hover:bg-blue-50'}`}>
              <Users className="mr-3 h-5 w-5" />
              Clients
            </a>
          </Link>
          <Link href="/technicians">
            <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isOnTechnicians ? 'bg-primary text-white' : 'text-foreground hover:bg-blue-50'}`}>
              <UserRound className="mr-3 h-5 w-5" />
              Technicians
            </a>
          </Link>
          <Link href="/settings">
            <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isOnSettings ? 'bg-primary text-white' : 'text-foreground hover:bg-blue-50'}`}>
              <Settings className="mr-3 h-5 w-5" />
              Settings
            </a>
          </Link>
        </nav>
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
      </div>
    </div>
  );
}
