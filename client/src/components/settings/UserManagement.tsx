import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash, Edit, Plus, User, Search, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User as UserType, Organization } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Define user form schema
const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["system_admin", "org_admin", "manager", "technician", "client", "office_staff"]),
  active: z.boolean().default(true),
  organizationId: z.number().min(1, "Organization is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
  confirmPassword: z
    .string()
    .optional(),
}).refine(data => !data.password || data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"]
});

type UserFormValues = z.infer<typeof userFormSchema>;

export function UserManagement() {
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users
  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/users"],
    select: (data: UserType[]) => data,
  });
  
  // Fetch organizations
  const {
    data: organizations = [],
    isLoading: isLoadingOrgs,
    error: orgError
  } = useQuery({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/organizations');
        console.log("Organizations API response:", response);
        
        // If no organizations are returned or there's an error, provide a fallback
        if (!response || !Array.isArray(response) || response.length === 0) {
          console.log("No organizations found, using fallback organization");
          return [{ 
            id: 1, 
            name: "SmartWater Pools",
            slug: "smartwater-pools",
            active: true
          }] as Organization[];
        }
        
        return response as Organization[];
      } catch (error) {
        console.error("Error fetching organizations:", error);
        // Return a fallback organization
        return [{ 
          id: 1, 
          name: "SmartWater Pools",
          slug: "smartwater-pools",
          active: true
        }] as Organization[];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Mutation for creating/updating user
  const mutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      if (editingUser) {
        // Update existing user
        return await apiRequest(
          `/api/users/${editingUser.id}`, 
          "PATCH", 
          values
        );
      } else {
        // Create new user
        return await apiRequest(
          "/api/users", 
          "POST", 
          values
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setOpen(false);
      toast({
        title: editingUser ? "User updated" : "User created",
        description: editingUser
          ? "User has been updated successfully"
          : "New user has been created",
      });
      setEditingUser(null);
    },
  });
  
  // Mutation for deleting or deactivating user
  const deleteMutation = useMutation({
    mutationFn: async ({ userId, permanent }: { userId: number, permanent: boolean }) => {
      console.log(`Calling DELETE API for user ID: ${userId}, permanent: ${permanent}`);
      return await apiRequest(`/api/users/${userId}${permanent ? '?permanent=true' : ''}`, "DELETE");
    },
    onSuccess: (data) => {
      console.log('Delete user response:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      const actionType = data.permanent ? "deleted" : "deactivated";
      
      toast({
        title: `User ${actionType}`,
        description: data.message || `User has been ${actionType} successfully`,
      });
    },
    onError: (error: any) => {
      console.error('Error modifying user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to modify user",
        variant: "destructive",
      });
    }
  });
  
  // Handle deactivate or delete user
  const handleDelete = (user: UserType) => {
    // Create a confirmation dialog with both options
    if (confirm(`What would you like to do with ${user.name}?\n\n- Click OK to permanently DELETE this user\n- Click Cancel to just DEACTIVATE (user will be set to inactive status)`)) {
      // User clicked OK - permanently delete
      console.log(`Permanently deleting user with ID: ${user.id}`);
      deleteMutation.mutate({ userId: user.id, permanent: true });
    } else if (confirm(`Are you sure you want to deactivate ${user.name}? (They can be reactivated later)`)) {
      // User clicked OK to deactivate
      console.log(`Deactivating user with ID: ${user.id}`);
      deleteMutation.mutate({ userId: user.id, permanent: false });
    }
    // If they cancel both dialogs, do nothing
  };

  // Form setup
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      role: "technician",
      active: true,
      organizationId: 1, // Default to SmartWater Pools (Main)
      password: "",
      confirmPassword: "",
    },
  });

  // Reset form when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setEditingUser(null);
    }
    setOpen(open);
  };

  // Edit user
  const handleEdit = (user: UserType) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      name: user.name,
      email: user.email || "",
      role: user.role as "system_admin" | "org_admin" | "manager" | "office_staff" | "technician" | "client",
      active: user.active,
      organizationId: user.organizationId || 1, // Default to org ID 1 if not set
    });
    setOpen(true);
  };

  // Form submission handler
  const onSubmit = (data: UserFormValues) => {
    // If updating and password is empty, remove it from the data
    if (editingUser && (!data.password || data.password.length === 0)) {
      const { password, confirmPassword, ...submitData } = data;
      mutation.mutate(submitData as UserFormValues);
    } else {
      mutation.mutate(data);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const searchVal = searchTerm.toLowerCase();
    
    // Get organization name for the user
    const orgName = organizations.find(org => org.id === user.organizationId)?.name || "";
    
    return (
      user.name?.toLowerCase().includes(searchVal) ||
      user.username?.toLowerCase().includes(searchVal) ||
      user.email?.toLowerCase().includes(searchVal) ||
      user.role?.toLowerCase().includes(searchVal) ||
      orgName.toLowerCase().includes(searchVal)
    );
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "system_admin":
        return "bg-red-100 text-red-800";
      case "org_admin":
        return "bg-orange-100 text-orange-800";
      case "manager":
        return "bg-purple-100 text-purple-800";
      case "office_staff":
        return "bg-amber-100 text-amber-800";
      case "technician":
        return "bg-blue-100 text-blue-800";
      case "client":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription className="mt-1">
              Manage system users, assign roles, and control access permissions.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="default" className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
                <DialogDescription>
                  {editingUser
                    ? "Update existing user details and permissions"
                    : "Add a new user to the system"}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" {...field} />
                        </FormControl>
                        <FormDescription>
                          Unique username for login
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john.doe@example.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="system_admin">System Admin</SelectItem>
                            <SelectItem value="org_admin">Organization Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="office_staff">Office Staff</SelectItem>
                            <SelectItem value="technician">Technician</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          User's role determines their permissions
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="organizationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an organization" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {organizations.length === 0 ? (
                              <SelectItem value="1">Loading organizations...</SelectItem>
                            ) : (
                              organizations.map((org) => (
                                <SelectItem key={org.id} value={org.id.toString()}>
                                  {org.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Organization the user belongs to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="h-4 w-4 mt-1"
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Inactive users cannot log in to the system
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Only show password fields for new users or when editing */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{editingUser ? "New Password (leave blank to keep current)" : "Password"}</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? "Saving..." : "Save User"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input 
            className="pl-9" 
            placeholder="Search users by name, email, role, or organization..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-pulse">Loading users...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-800 p-4 rounded-md">
            Error loading users. Please try again.
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="text-gray-500 mb-4">No users found</div>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-10 px-4 text-left font-medium">User</th>
                    <th className="h-10 px-4 text-left font-medium">Username</th>
                    <th className="h-10 px-4 text-left font-medium">Organization</th>
                    <th className="h-10 px-4 text-left font-medium">Role</th>
                    <th className="h-10 px-4 text-left font-medium">Status</th>
                    <th className="h-10 px-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="p-4 align-middle flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10">{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="p-4 align-middle">{user.username}</td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          {user.organizationId ? 
                            (organizations.find(org => org.id === user.organizationId)?.name || 
                            (isLoadingOrgs ? "Loading..." : "SmartWater Pools")) : 
                            "SmartWater Pools"}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle">
                        <Badge variant={user.active ? "outline" : "secondary"}>
                          {user.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          {/* Don't show delete button for system_admin users or for the current user */}
                          {user.role !== 'system_admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(user)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
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