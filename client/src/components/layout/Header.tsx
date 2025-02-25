import { useState } from "react";
import { Menu, BellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  toggleMobileMenu: () => void;
}

export function Header({ toggleMobileMenu }: HeaderProps) {
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
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-gray-500 hover:text-primary"
          >
            <BellIcon className="h-6 w-6" />
            <span className="absolute top-0 right-0 block w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>
          <div className="relative md:hidden">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
              A
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
