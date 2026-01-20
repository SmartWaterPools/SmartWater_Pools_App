import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building, Edit, Plus, UserPlus } from "lucide-react";

// Define the organization schema
const organizationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").or(z.literal("")),
  website: z.string().url("Invalid URL").or(z.literal("")),
  active: z.boolean().default(true),
  isSystemAdmin: z.boolean().default(false),
});

type OrganizationFormValues = z.infer<typeof organizationSchema>;

interface Organization {
  id: number;
  name: string;
  slug: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  active: boolean;
  isSystemAdmin: boolean;
}

// Component for adding/editing organizations
function OrganizationForm({ 
  organization,
  onSuccess,
  onCancel
}: { 
  organization?: Organization;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize the form with default values or existing organization data
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: organization ? {
      name: organization.name,
      slug: organization.slug,
      address: organization.address || "",
      city: organization.city || "",
      state: organization.state || "",
      zipCode: organization.zipCode || "",
      phone: organization.phone || "",
      email: organization.email || "",
      website: organization.website || "",
      active: organization.active,
      isSystemAdmin: organization.isSystemAdmin,
    } : {
      name: "",
      slug: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
      website: "",
      active: true,
      isSystemAdmin: false,
    },
  });
  
  // Setup mutation for creating or updating an organization
  const mutation = useMutation({
    mutationFn: async (values: OrganizationFormValues) => {
      if (organization) {
        // Update existing organization
        return apiRequest('PATCH', `/api/organizations/${organization.id}`, values);
      } else {
        // Create new organization
        return apiRequest('POST', '/api/organizations', values);
      }
    },
    onSuccess: () => {
      // Show success toast and invalidate the organizations query
      toast({
        title: organization ? "Organization Updated" : "Organization Created",
        description: organization 
          ? `${form.getValues().name} was updated successfully.` 
          : `${form.getValues().name} was created successfully.`,
      });
      
      // Invalidate the organizations query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      
      // Call the onSuccess callback
      onSuccess();
    },
    onError: (error) => {
      console.error("Organization mutation error:", error);
      toast({
        title: "Error",
        description: "There was an error processing your request. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Form submission handler
  const onSubmit = (values: OrganizationFormValues) => {
    mutation.mutate(values);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter organization name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Slug</FormLabel>
                <FormControl>
                  <Input placeholder="organization-slug" {...field} />
                </FormControl>
                <FormDescription>
                  Used in URLs. Only lowercase letters, numbers, and hyphens.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="Enter address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="City" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input placeholder="State" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="zipCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zip Code</FormLabel>
                <FormControl>
                  <Input placeholder="Zip code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="Phone number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Organization email" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex flex-col space-y-4">
          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Active Organization
                  </FormLabel>
                  <FormDescription>
                    Inactive organizations cannot access the system.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="isSystemAdmin"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    System Administrator Access
                  </FormLabel>
                  <FormDescription>
                    Organizations with system admin access can manage all organizations.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : organization ? "Update Organization" : "Create Organization"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// OrganizationCard component
function OrganizationCard({ organization }: { organization: Organization }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {organization.name}
            </CardTitle>
            <CardDescription>
              {organization.city}, {organization.state}
            </CardDescription>
          </div>
          
          <div className="flex gap-1">
            {organization.isSystemAdmin && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                System Admin
              </Badge>
            )}
            
            {organization.active ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                Inactive
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="text-sm space-y-2">
          {organization.address && (
            <p className="text-gray-600">{organization.address}</p>
          )}
          
          {organization.email && (
            <p className="text-gray-600">
              <span className="font-medium">Email:</span> {organization.email}
            </p>
          )}
          
          {organization.phone && (
            <p className="text-gray-600">
              <span className="font-medium">Phone:</span> {organization.phone}
            </p>
          )}
          
          {organization.website && (
            <p className="text-gray-600">
              <span className="font-medium">Website:</span>{" "}
              <a 
                href={organization.website} 
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {organization.website}
              </a>
            </p>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t pt-4">
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Manage Users
        </Button>
        
        <Button size="sm" variant="ghost" onClick={() => setIsEditDialogOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Organization</DialogTitle>
              <DialogDescription>
                Update the organization details.
              </DialogDescription>
            </DialogHeader>
            
            <OrganizationForm
              organization={organization}
              onSuccess={() => setIsEditDialogOpen(false)}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}

// Main OrganizationManagement component
export function OrganizationManagement() {
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Fetch organizations
  const { data: organizations, isLoading, error } = useQuery({
    queryKey: ['/api/organizations'],
    queryFn: async () => {
      const response = await apiRequest('/api/organizations');
      return response as Organization[];
    },
  });
  
  // Show error if any
  if (error) {
    console.error("Error fetching organizations:", error);
    
    // Only show this toast once by checking if organizations is undefined
    if (!organizations) {
      toast({
        title: "Error Loading Organizations",
        description: "There was a problem loading the organizations. Please try again.",
        variant: "destructive",
      });
    }
  }
  
  // Only system admins can create new organizations
  const canCreateOrganization = user?.role === 'system_admin';
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold tracking-tight">Organizations</h2>
        
        {canCreateOrganization && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Organization
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Organization</DialogTitle>
                <DialogDescription>
                  Create a new organization in the system.
                </DialogDescription>
              </DialogHeader>
              
              <OrganizationForm
                onSuccess={() => setIsAddDialogOpen(false)}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : organizations && organizations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <OrganizationCard key={org.id} organization={org} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Building className="h-10 w-10 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">No Organizations Found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {canCreateOrganization
              ? "Get started by creating your first organization."
              : "No organizations available in the system."}
          </p>
          {canCreateOrganization && (
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="mt-4"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          )}
        </div>
      )}
    </div>
  );
}