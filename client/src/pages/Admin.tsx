import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "../contexts/AuthContext";
import { UserManagement } from "@/components/settings/UserManagement";
import { OrganizationManagement } from "@/components/settings/OrganizationManagement";
import { Shield, Users, Building } from "lucide-react";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Redirect non-admin users
  useEffect(() => {
    if (user && !['admin', 'system_admin', 'org_admin'].includes(user.role)) {
      setLocation('/unauthorized');
    }
  }, [user, setLocation]);
  
  if (!user || !['admin', 'system_admin', 'org_admin'].includes(user.role)) {
    return null; // Don't render anything while redirecting
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