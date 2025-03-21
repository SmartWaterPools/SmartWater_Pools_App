import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ServiceTemplates } from "@/components/settings/ServiceTemplates";
import { UserManagement } from "@/components/settings/UserManagement";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { PermissionSettings } from "@/components/settings/PermissionSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { CommunicationProviders } from "@/components/settings/CommunicationProviders";
import { FileText, Users, Shield, Bell, LayoutGrid, MessageSquare, Phone, Mail, Settings as SettingsIcon, Server, User } from "lucide-react";

export default function Settings() {
  const [, params] = useLocation();
  const tabParam = new URLSearchParams(params).get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || "profile");
  
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
            <TabsTrigger value="profile" className="flex gap-2 items-center px-4 py-2">
              <User className="h-4 w-4" />
              <span className="whitespace-nowrap">My Profile</span>
            </TabsTrigger>
            <TabsTrigger value="service-templates" className="flex gap-2 items-center px-4 py-2">
              <FileText className="h-4 w-4" />
              <span className="whitespace-nowrap">Service Templates</span>
            </TabsTrigger>
            <TabsTrigger value="communication-providers" className="flex gap-2 items-center px-4 py-2">
              <Mail className="h-4 w-4" />
              <span className="whitespace-nowrap">Communication</span>
            </TabsTrigger>
            <TabsTrigger value="user-management" className="flex gap-2 items-center px-4 py-2">
              <Users className="h-4 w-4" />
              <span className="whitespace-nowrap">User Management</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex gap-2 items-center px-4 py-2">
              <Bell className="h-4 w-4" />
              <span className="whitespace-nowrap">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex gap-2 items-center px-4 py-2">
              <Shield className="h-4 w-4" />
              <span className="whitespace-nowrap">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex gap-2 items-center px-4 py-2">
              <LayoutGrid className="h-4 w-4" />
              <span className="whitespace-nowrap">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex gap-2 items-center px-4 py-2">
              <SettingsIcon className="h-4 w-4" />
              <span className="whitespace-nowrap">Advanced</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="profile" className="space-y-4">
          <ProfileSettings />
        </TabsContent>
        
        <TabsContent value="service-templates" className="space-y-4">
          <ServiceTemplates />
        </TabsContent>
        
        <TabsContent value="communication-providers" className="space-y-4">
          <CommunicationProviders />
        </TabsContent>
        
        <TabsContent value="user-management" className="space-y-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <PermissionSettings />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <AppearanceSettings />
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="mr-2 h-5 w-5" />
                  System Diagnostics
                </CardTitle>
                <CardDescription>
                  Advanced diagnostics tools for administrators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Access system diagnostic tools for troubleshooting connectivity and server issues.
                  This should only be used by system administrators.
                </p>
                <div className="mb-4 p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800">
                  <h4 className="font-semibold mb-1">Administrator access only</h4>
                  <p className="text-sm">
                    These tools are intended for system administrators and may affect system performance.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Link href="/connection-test">
                  <Button variant="outline" className="w-full">
                    <Server className="mr-2 h-4 w-4" />
                    Open Connection Diagnostics
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}