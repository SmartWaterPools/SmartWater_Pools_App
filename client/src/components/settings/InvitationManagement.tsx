import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search, 
  Clock, 
  RefreshCcw, 
  UserPlus, 
  Mail, 
  XCircle,
  CheckCircle, 
  Calendar 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { InviteUserDialog } from "../admin/InviteUserDialog";

interface Invitation {
  id: number;
  email: string;
  name: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired';
  token: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  organizationId: number;
  createdBy: number;
}

export function InvitationManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch invitations
  const {
    data: invitations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["/api/invitations"],
    select: (data: any) => data.invitations || [],
  });

  // Mutation for canceling an invitation
  const cancelMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      return await apiRequest('DELETE', `/api/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invitation",
        variant: "destructive",
      });
    }
  });

  // Handle cancel invitation
  const handleCancel = (invitation: Invitation) => {
    if (window.confirm(`Are you sure you want to cancel the invitation to ${invitation.email}?`)) {
      cancelMutation.mutate(invitation.id);
    }
  };

  // Handle invitation success
  const handleInvitationSuccess = () => {
    refetch();
  };

  // Filter invitations based on search term
  const filteredInvitations = invitations.filter((invitation: Invitation) => {
    const searchVal = searchTerm.toLowerCase();
    return (
      invitation.name?.toLowerCase().includes(searchVal) ||
      invitation.email?.toLowerCase().includes(searchVal) ||
      invitation.role?.toLowerCase().includes(searchVal) ||
      invitation.status?.toLowerCase().includes(searchVal)
    );
  });

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "expired":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "system_admin":
        return "bg-red-100 text-red-800";
      case "org_admin":
        return "bg-orange-100 text-orange-800";
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "technician":
        return "bg-blue-100 text-blue-800";
      case "client":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format date to readable string
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle>User Invitations</CardTitle>
            <CardDescription className="mt-1">
              Manage pending invitations and invite new users to join
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              className="whitespace-nowrap"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            
            <InviteUserDialog onSuccess={handleInvitationSuccess} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input 
            className="pl-9" 
            placeholder="Search invitations by name, email, or role..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-pulse">Loading invitations...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-800 p-4 rounded-md">
            Error loading invitations. Please try again.
          </div>
        ) : filteredInvitations.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center border rounded-md">
            <Mail className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No invitations found</h3>
            <p className="text-gray-500 mb-4">You haven't sent any invitations yet or they don't match your search.</p>
            
            <InviteUserDialog onSuccess={handleInvitationSuccess} />
          </div>
        ) : (
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium">Recipient</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Role</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Sent</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Expires</th>
                    <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvitations.map((invitation: Invitation) => (
                    <tr key={invitation.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-4 align-middle">
                        <div className="flex flex-col">
                          <div className="font-medium">{invitation.name}</div>
                          <div className="text-xs text-gray-500">{invitation.email}</div>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <Badge className={getRoleBadgeColor(invitation.role)}>
                          {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center">
                          {invitation.status === 'pending' ? (
                            <Clock className="h-4 w-4 mr-2 text-blue-500" />
                          ) : invitation.status === 'accepted' ? (
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2 text-gray-500" />
                          )}
                          <Badge className={getStatusBadgeColor(invitation.status)}>
                            {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-4 align-middle text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {formatDate(invitation.createdAt)}
                        </div>
                      </td>
                      <td className="p-4 align-middle text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {formatDate(invitation.expiresAt)}
                        </div>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end space-x-1">
                          {invitation.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleCancel(invitation)}
                              disabled={cancelMutation.isPending}
                            >
                              <XCircle className="h-4 w-4" />
                              <span className="sr-only">Cancel</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}