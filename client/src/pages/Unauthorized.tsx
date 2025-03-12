import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';

export default function Unauthorized() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <ShieldAlert className="h-24 w-24 text-red-500 mx-auto" />
        
        <h1 className="text-4xl font-bold tracking-tight">Access Denied</h1>
        
        <p className="text-xl text-muted-foreground">
          You don't have permission to access this page.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <Button 
            onClick={() => window.history.back()} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          
          <Button 
            onClick={() => setLocation('/')} 
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}