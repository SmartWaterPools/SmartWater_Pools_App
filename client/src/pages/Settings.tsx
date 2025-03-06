import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceTemplates } from "@/components/settings/ServiceTemplates";
import { Settings as SettingsIcon, FileText, Users, Shield, Bell, LayoutGrid } from "lucide-react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("service-templates");
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and templates
          </p>
        </div>
      </div>

      <Tabs 
        defaultValue="service-templates" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <TabsTrigger value="service-templates" className="flex gap-2 items-center">
            <FileText className="h-4 w-4" />
            <span className="hidden md:inline">Service Templates</span>
            <span className="md:hidden">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="user-management" className="flex gap-2 items-center" disabled>
            <Users className="h-4 w-4" />
            <span className="hidden md:inline">User Management</span>
            <span className="md:hidden">Users</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex gap-2 items-center" disabled>
            <Bell className="h-4 w-4" />
            <span className="hidden md:inline">Notifications</span>
            <span className="md:hidden">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex gap-2 items-center" disabled>
            <Shield className="h-4 w-4" />
            <span className="hidden md:inline">Permissions</span>
            <span className="md:hidden">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex gap-2 items-center" disabled>
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden md:inline">Appearance</span>
            <span className="md:hidden">Theme</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="service-templates" className="space-y-4">
          <ServiceTemplates />
        </TabsContent>
        
        <TabsContent value="user-management" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage system users, roles, and permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <SettingsIcon className="mx-auto h-12 w-12 opacity-30 mb-4" />
                  <p>User management settings coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure system-wide notification preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <SettingsIcon className="mx-auto h-12 w-12 opacity-30 mb-4" />
                  <p>Notification settings coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>
                Configure role-based permissions and access controls.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <SettingsIcon className="mx-auto h-12 w-12 opacity-30 mb-4" />
                  <p>Permission settings coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize the application's appearance and branding.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <SettingsIcon className="mx-auto h-12 w-12 opacity-30 mb-4" />
                  <p>Appearance settings coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}