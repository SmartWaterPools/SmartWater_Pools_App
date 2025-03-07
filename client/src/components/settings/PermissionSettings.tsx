import React, { useState } from "react";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  ClipboardEdit, 
  FileText, 
  CreditCard, 
  Settings, 
  Calendar, 
  Wrench,
  User,
  Briefcase,
  Building2,
  FileHeart
} from "lucide-react";

// Permissions schema for each role
const permissionItemSchema = z.object({
  view: z.boolean(),
  create: z.boolean(),
  edit: z.boolean(),
  delete: z.boolean(),
});

// Define full permissions schema
const permissionsSchema = z.object({
  admin: z.object({
    clients: permissionItemSchema,
    technicians: permissionItemSchema,
    projects: permissionItemSchema,
    maintenance: permissionItemSchema,
    repairs: permissionItemSchema,
    invoices: permissionItemSchema,
    reports: permissionItemSchema,
    settings: permissionItemSchema,
  }),
  manager: z.object({
    clients: permissionItemSchema,
    technicians: permissionItemSchema,
    projects: permissionItemSchema,
    maintenance: permissionItemSchema,
    repairs: permissionItemSchema,
    invoices: permissionItemSchema,
    reports: permissionItemSchema,
    settings: permissionItemSchema,
  }),
  technician: z.object({
    clients: permissionItemSchema,
    technicians: permissionItemSchema,
    projects: permissionItemSchema,
    maintenance: permissionItemSchema,
    repairs: permissionItemSchema,
    invoices: permissionItemSchema,
    reports: permissionItemSchema,
    settings: permissionItemSchema,
  }),
  client: z.object({
    clients: permissionItemSchema,
    technicians: permissionItemSchema,
    projects: permissionItemSchema,
    maintenance: permissionItemSchema,
    repairs: permissionItemSchema,
    invoices: permissionItemSchema,
    reports: permissionItemSchema,
    settings: permissionItemSchema,
  }),
});

type PermissionsFormValues = z.infer<typeof permissionsSchema>;

// Permission section icons
const sectionIcons = {
  clients: <User className="h-5 w-5" />,
  technicians: <Briefcase className="h-5 w-5" />,
  projects: <Building2 className="h-5 w-5" />,
  maintenance: <Calendar className="h-5 w-5" />,
  repairs: <Wrench className="h-5 w-5" />,
  invoices: <CreditCard className="h-5 w-5" />,
  reports: <FileHeart className="h-5 w-5" />,
  settings: <Settings className="h-5 w-5" />
};

export function PermissionSettings() {
  const [activeTab, setActiveTab] = useState("admin");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Setup permissions with default values
  const getDefaultPermissions = (isAdmin: boolean): PermissionsFormValues => {
    const adminValues = {
      view: true,
      create: true,
      edit: true,
      delete: true,
    };

    const restrictedValues = {
      view: false,
      create: false,
      edit: false,
      delete: false,
    };

    const techValues = {
      view: true,
      create: false,
      edit: false,
      delete: false,
    };

    const clientValues = {
      view: true,
      create: false,
      edit: false,
      delete: false,
    };

    return {
      admin: {
        clients: adminValues,
        technicians: adminValues,
        projects: adminValues,
        maintenance: adminValues,
        repairs: adminValues,
        invoices: adminValues,
        reports: adminValues,
        settings: adminValues,
      },
      manager: {
        clients: adminValues,
        technicians: adminValues,
        projects: adminValues,
        maintenance: adminValues,
        repairs: adminValues,
        invoices: adminValues,
        reports: adminValues,
        settings: { ...adminValues, delete: false },
      },
      technician: {
        clients: { ...techValues, view: true },
        technicians: { ...restrictedValues, view: true },
        projects: { ...techValues, edit: true },
        maintenance: { ...techValues, create: true, edit: true },
        repairs: { ...techValues, create: true, edit: true },
        invoices: { ...restrictedValues, view: true },
        reports: { ...techValues, create: true, edit: true },
        settings: restrictedValues,
      },
      client: {
        clients: { ...clientValues, edit: true },
        technicians: { ...restrictedValues, view: true },
        projects: { ...restrictedValues, view: true },
        maintenance: { ...restrictedValues, view: true },
        repairs: { ...restrictedValues, view: true, create: true },
        invoices: { ...restrictedValues, view: true },
        reports: { ...restrictedValues, view: true },
        settings: restrictedValues,
      },
    }
  };

  // Form setup
  const form = useForm<PermissionsFormValues>({
    resolver: zodResolver(permissionsSchema),
    defaultValues: getDefaultPermissions(true),
  });

  // Mock permissions save
  const mutation = useMutation({
    mutationFn: async (values: PermissionsFormValues) => {
      setIsUpdating(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return values;
    },
    onSuccess: () => {
      setIsUpdating(false);
      toast({
        title: "Permissions updated",
        description: "Role permissions have been successfully updated",
      });
    },
    onError: () => {
      setIsUpdating(false);
      toast({
        title: "Error",
        description: "Failed to update role permissions",
        variant: "destructive",
      });
    }
  });

  // Form submission handler
  function onSubmit(data: PermissionsFormValues) {
    mutation.mutate(data);
  }

  // Role icons mapping
  const roleIcons = {
    admin: <Users className="h-4 w-4" />,
    manager: <Briefcase className="h-4 w-4" />,
    technician: <Wrench className="h-4 w-4" />,
    client: <User className="h-4 w-4" />,
  };

  // Role labels mapping
  const roleLabels = {
    admin: "Administrator",
    manager: "Manager",
    technician: "Technician",
    client: "Client",
  };

  // Section labels mapping
  const sectionLabels = {
    clients: "Client Management",
    technicians: "Technician Management",
    projects: "Projects",
    maintenance: "Maintenance",
    repairs: "Repairs",
    invoices: "Invoices & Billing",
    reports: "Reports",
    settings: "System Settings",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Permissions</CardTitle>
        <CardDescription>
          Define access levels for each role in the system. Configure what users can view, create, edit, and delete.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs 
              defaultValue="admin" 
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
            >
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  {roleIcons.admin}
                  {roleLabels.admin}
                </TabsTrigger>
                <TabsTrigger value="manager" className="flex items-center gap-2">
                  {roleIcons.manager}
                  {roleLabels.manager}
                </TabsTrigger>
                <TabsTrigger value="technician" className="flex items-center gap-2">
                  {roleIcons.technician}
                  {roleLabels.technician}
                </TabsTrigger>
                <TabsTrigger value="client" className="flex items-center gap-2">
                  {roleIcons.client}
                  {roleLabels.client}
                </TabsTrigger>
              </TabsList>

              {(["admin", "manager", "technician", "client"] as const).map((role) => (
                <TabsContent key={role} value={role} className="space-y-6">
                  <div className="rounded-lg border">
                    <div className="grid divide-y">
                      {(Object.keys(sectionLabels) as Array<keyof typeof sectionLabels>).map((section) => (
                        <div key={section} className="p-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              {sectionIcons[section as keyof typeof sectionIcons]}
                            </div>
                            <h3 className="text-lg font-medium">{sectionLabels[section]}</h3>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <FormField
                              control={form.control}
                              name={`${role}.${section}.view`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-md border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm">View</FormLabel>
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
                              name={`${role}.${section}.create`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-md border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm">Create</FormLabel>
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
                              name={`${role}.${section}.edit`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-md border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm">Edit</FormLabel>
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
                              name={`${role}.${section}.delete`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-md border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm">Delete</FormLabel>
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
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save Permissions"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}