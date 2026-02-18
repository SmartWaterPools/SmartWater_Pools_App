import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "../contexts/AuthContext";
import { UserManagement } from "@/components/settings/UserManagement";
import { OrganizationManagement } from "@/components/settings/OrganizationManagement";
import { Shield, Users, Building, Loader2 } from "lucide-react";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [accessVerified, setAccessVerified] = useState(false);
  const [localLoading, setLocalLoading] = useState(true);
  
  // First check - verify authentication and redirect non-admin users
  useEffect(() => {
    // Start with local loading state to prevent flashing
    setLocalLoading(true);
    
    // Only proceed if auth checking is complete
    if (!isLoading) {
      console.log("Admin page: Auth check complete", { isAuthenticated, user });
      
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        console.log("Admin page: Not authenticated, redirecting to login");
        setLocation('/login?redirect=/admin');
        return;
      }
      
      // If authenticated but not admin or wrong email domain, redirect
      const hasAdminRole = user && ['admin', 'system_admin', 'org_admin'].includes(user.role);
      const hasSmartWaterEmail = user?.email?.toLowerCase().endsWith('@smartwaterpools.com');
      
      if (user && !hasAdminRole) {
        console.log("Admin page: Unauthorized role, redirecting");
        setLocation('/unauthorized');
        return;
      }
      
      if (user && hasAdminRole && !hasSmartWaterEmail) {
        console.log("Admin page: Admin role but wrong email domain, redirecting to dashboard");
        setLocation('/dashboard');
        return;
      }
      
      // If authenticated and has admin role with correct email, verify access
      if (isAuthenticated && user && hasAdminRole && hasSmartWaterEmail) {
        console.log("Admin page: Access verified");
        
        // Add a deliberate delay before showing content to avoid flashing
        setTimeout(() => {
          setAccessVerified(true);
          setLocalLoading(false);
        }, 100);
      }
    }
  }, [isLoading, isAuthenticated, user, setLocation]);
  
  // Don't render anything until we've verified access and completed local loading delay
  if (isLoading || localLoading || !accessVerified || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage system users, organizations, and permissions
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="organizations" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Add, edit, and manage user accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagement />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Management</CardTitle>
              <CardDescription>
                Manage organizations and their settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationManagement />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
              <CardDescription>
                Configure role-based permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Permission management will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}