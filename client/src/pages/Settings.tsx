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
        <div className="mb-6 overflow-x-auto pb-2">
          <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-auto">
            <TabsTrigger value="service-templates" className="flex gap-2 items-center px-4 py-2">
              <FileText className="h-4 w-4" />
              <span className="whitespace-nowrap">Service Templates</span>
            </TabsTrigger>
            <TabsTrigger value="user-management" className="flex gap-2 items-center px-4 py-2" disabled>
              <Users className="h-4 w-4" />
              <span className="whitespace-nowrap">User Management</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex gap-2 items-center px-4 py-2" disabled>
              <Bell className="h-4 w-4" />
              <span className="whitespace-nowrap">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex gap-2 items-center px-4 py-2" disabled>
              <Shield className="h-4 w-4" />
              <span className="whitespace-nowrap">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex gap-2 items-center px-4 py-2" disabled>
              <LayoutGrid className="h-4 w-4" />
              <span className="whitespace-nowrap">Appearance</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
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