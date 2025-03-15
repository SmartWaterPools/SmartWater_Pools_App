import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash, Edit, Plus, Building, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Define organization interface
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
  createdAt: string;
  isSystemAdmin: boolean;
}

// Define organization form schema
const organizationFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  logo: z.string().optional(),
  active: z.boolean().default(true),
  isSystemAdmin: z.boolean().default(false),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

export function OrganizationManagement() {
  const [open, setOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch organizations
  const {
    data: organizations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/organizations"],
    select: (data: Organization[]) => data,
  });

  // Mutation for creating/updating organization
  const mutation = useMutation({
    mutationFn: async (values: OrganizationFormValues) => {
      if (editingOrg) {
        // Update existing organization
        return await apiRequest(
          `/api/organizations/${editingOrg.id}`, 
          "PATCH", 
          values
        );
      } else {
        // Create new organization
        return await apiRequest(
          "/api/organizations", 
          "POST", 
          values
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setOpen(false);
      toast({
        title: editingOrg ? "Organization updated" : "Organization created",
        description: editingOrg
          ? "Organization has been updated successfully"
          : "New organization has been created",
      });
      setEditingOrg(null);
    },
  });

  // Form setup
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
      website: "",
      logo: "",
      active: true,
      isSystemAdmin: false,
    },
  });

  // Reset form when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setEditingOrg(null);
    }
    setOpen(open);
  };

  // Edit organization
  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    form.reset({
      name: org.name,
      slug: org.slug,
      address: org.address || "",
      city: org.city || "",
      state: org.state || "",
      zipCode: org.zipCode || "",
      phone: org.phone || "",
      email: org.email || "",
      website: org.website || "",
      logo: org.logo || "",
      active: org.active,
      isSystemAdmin: org.isSystemAdmin,
    });
    setOpen(true);
  };

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  };

  // Auto-generate slug when name changes if slug is empty or matches previous auto-generated slug
  const handleNameChange = (name: string) => {
    const currentSlug = form.getValues("slug");
    const previousName = editingOrg?.name || "";
    const previousAutoSlug = generateSlug(previousName);
    
    if (!currentSlug || currentSlug === previousAutoSlug) {
      form.setValue("slug", generateSlug(name));
    }
  };

  // Form submission handler
  const onSubmit = (data: OrganizationFormValues) => {
    mutation.mutate(data);
  };

  // Filter organizations based on search term
  const filteredOrgs = organizations.filter(org => {
    const searchVal = searchTerm.toLowerCase();
    return (
      org.name?.toLowerCase().includes(searchVal) ||
      org.email?.toLowerCase().includes(searchVal) ||
      org.city?.toLowerCase().includes(searchVal) ||
      org.state?.toLowerCase().includes(searchVal)
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle>Organization Management</CardTitle>
            <CardDescription className="mt-1">
              Manage pool service organizations and their properties.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="default" className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingOrg ? "Edit Organization" : "Create Organization"}</DialogTitle>
                <DialogDescription>
                  {editingOrg
                    ? "Update existing organization details"
                    : "Add a new pool service organization to the system"}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Awesome Pool Services" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              handleNameChange(e.target.value);
                            }}
                          />
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
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="awesome-pool-services" {...field} />
                        </FormControl>
                        <FormDescription>
                          URL-friendly identifier (auto-generated from name)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="info@example.com" type="email" {...field} />
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
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Pool St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Poolville" {...field} />
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
                            <Input placeholder="CA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip Code</FormLabel>
                          <FormControl>
                            <Input placeholder="90210" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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

                  <FormField
                    control={form.control}
                    name="logo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/logo.png" {...field} />
                        </FormControl>
                        <FormDescription>
                          URL to the organization's logo image
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col gap-4">
                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Active</FormLabel>
                            <FormDescription>
                              Inactive organizations are hidden from most views
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isSystemAdmin"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>System Administrator Access</FormLabel>
                            <FormDescription>
                              This organization has system-wide administrator privileges
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? "Saving..." : "Save Organization"}
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
            placeholder="Search organizations by name, email, or location..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-pulse">Loading organizations...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-800 p-4 rounded-md">
            Error loading organizations. Please try again.
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="text-gray-500 mb-4">No organizations found</div>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Organization
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-10 px-4 text-left font-medium">Organization</th>
                    <th className="h-10 px-4 text-left font-medium">Contact</th>
                    <th className="h-10 px-4 text-left font-medium">Location</th>
                    <th className="h-10 px-4 text-left font-medium">Status</th>
                    <th className="h-10 px-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgs.map((org) => (
                    <tr key={org.id} className="border-b">
                      <td className="p-4 align-middle flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {org.logo ? (
                            <AvatarImage src={org.logo} alt={org.name} />
                          ) : (
                            <AvatarFallback className="bg-primary/10">
                              <Building className="h-4 w-4" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-xs text-gray-500">{org.slug}</div>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        {org.email && <div>{org.email}</div>}
                        {org.phone && <div className="text-xs text-gray-500">{org.phone}</div>}
                        {org.website && (
                          <div className="text-xs text-blue-500">
                            <a href={org.website} target="_blank" rel="noopener noreferrer">
                              {org.website.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        {org.city && org.state ? (
                          <div>{`${org.city}, ${org.state}`}</div>
                        ) : (
                          org.city || org.state || "—"
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex flex-col gap-1">
                          <Badge variant={org.active ? "outline" : "secondary"}>
                            {org.active ? "Active" : "Inactive"}
                          </Badge>
                          {org.isSystemAdmin && (
                            <Badge className="bg-red-100 text-red-800">
                              System Admin
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(org)}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
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