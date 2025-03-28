import React from 'react';
import { Button } from '@/components/ui/button';
import { Wrench, Shield, Database } from 'lucide-react';
import { Link } from 'wouter';

export default function DebugHome() {
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-3xl mx-auto text-center space-y-12">
        <h1 className="text-4xl font-bold tracking-tight">SmartWater Pools Debug Tools</h1>
        <p className="text-xl text-muted-foreground mt-4">
          Developer tools for testing and debugging authentication features
        </p>

        <div className="grid gap-6 mt-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col items-center p-6 bg-card rounded-lg border">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium">OAuth Debug</h3>
            <p className="text-sm text-muted-foreground text-center mt-2 mb-4">
              Test OAuth authentication flow and session management
            </p>
            <Link href="/oauth-debug">
              <Button className="mt-auto" size="sm">
                Open OAuth Debug
              </Button>
            </Link>
          </div>

          <div className="flex flex-col items-center p-6 bg-card rounded-lg border">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Database className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium">Session Debug</h3>
            <p className="text-sm text-muted-foreground text-center mt-2 mb-4">
              Inspect session details and test session operations
            </p>
            <Button className="mt-auto" variant="outline" size="sm">
              Coming Soon
            </Button>
          </div>

          <div className="flex flex-col items-center p-6 bg-card rounded-lg border">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Wrench className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium">API Tools</h3>
            <p className="text-sm text-muted-foreground text-center mt-2 mb-4">
              Test API endpoints and responses
            </p>
            <Button className="mt-auto" variant="outline" size="sm">
              Coming Soon
            </Button>
          </div>
        </div>

        <div className="mt-16">
          <p className="text-sm text-muted-foreground">
            These tools are for development and troubleshooting purposes only.
          </p>
        </div>
      </div>
    </div>
  );
}