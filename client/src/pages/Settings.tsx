import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceTemplates } from "@/components/settings/ServiceTemplates";
import { UserManagement } from "@/components/settings/UserManagement";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { PermissionSettings } from "@/components/settings/PermissionSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { CommunicationProviders } from "@/components/settings/CommunicationProviders";
import { FileText, Users, Shield, Bell, LayoutGrid, MessageSquare, Phone, Mail } from "lucide-react";

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
          </TabsList>
        </div>
        
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
      </Tabs>
    </div>
  );
}