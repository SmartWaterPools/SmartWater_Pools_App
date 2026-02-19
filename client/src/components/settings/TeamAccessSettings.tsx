import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Shield } from "lucide-react";
import { UserManagement } from "./UserManagement";
import { InvitationManagement } from "./InvitationManagement";
import { PermissionsManagement } from "./PermissionsManagement";

export function TeamAccessSettings() {
  const [activeSubTab, setActiveSubTab] = useState("users");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Team & Access</h2>
        <p className="text-sm text-muted-foreground">
          Manage users, send invitations, and configure role permissions
        </p>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="users" className="flex gap-2 items-center">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex gap-2 items-center">
            <UserPlus className="h-4 w-4" />
            Invitations
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex gap-2 items-center">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="invitations">
          <InvitationManagement />
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
