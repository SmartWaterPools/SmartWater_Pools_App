import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Building, 
  CalendarCheck, 
  Wrench, 
  Menu 
} from "lucide-react";

export function MobileNav() {
  const [location] = useLocation();
  
  return (
    <div className="block md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <div className="flex justify-between px-4 py-2">
        <Link href="/">
          <a className={`flex flex-col items-center px-3 py-2 ${location === '/' ? 'text-primary' : 'text-gray-500'}`}>
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs mt-1">Dashboard</span>
          </a>
        </Link>
        <Link href="/projects">
          <a className={`flex flex-col items-center px-3 py-2 ${location === '/projects' ? 'text-primary' : 'text-gray-500'}`}>
            <Building className="h-5 w-5" />
            <span className="text-xs mt-1">Projects</span>
          </a>
        </Link>
        <Link href="/maintenance">
          <a className={`flex flex-col items-center px-3 py-2 ${location === '/maintenance' ? 'text-primary' : 'text-gray-500'}`}>
            <CalendarCheck className="h-5 w-5" />
            <span className="text-xs mt-1">Maintenance</span>
          </a>
        </Link>
        <Link href="/repairs">
          <a className={`flex flex-col items-center px-3 py-2 ${location === '/repairs' ? 'text-primary' : 'text-gray-500'}`}>
            <Wrench className="h-5 w-5" />
            <span className="text-xs mt-1">Repairs</span>
          </a>
        </Link>
        <a className="flex flex-col items-center px-3 py-2 text-gray-500">
          <Menu className="h-5 w-5" />
          <span className="text-xs mt-1">More</span>
        </a>
      </div>
    </div>
  );
}
