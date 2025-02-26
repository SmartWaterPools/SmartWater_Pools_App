import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClientWithUser } from "@/lib/types";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft } from "lucide-react";

// Define the client form schema
const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  contractType: z.string().optional().nullable(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function ClientEdit() {
  const [, params] = useRoute("/clients/:id/edit");
  const clientId = params?.id ? parseInt(params.id) : null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch client details
  const { data: client, isLoading, error } = useQuery<ClientWithUser>({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
  });

  // Define form with empty default values (will be filled when client data loads)
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      companyName: "",
      contractType: "residential",
    },
  });

  // Update form values when client data is loaded
  useEffect(() => {
    if (client && client.user) {
      form.reset({
        name: client.user.name,
        email: client.user.email,
        phone: client.user.phone || "",
        address: client.user.address || "",
        companyName: client.companyName || "",
        contractType: client.contractType || "residential",
      });
    }
  }, [client, form]);

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      if (!client || !clientId) return null;
      
      // Update user data
      const userData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
      };

      await apiRequest(`/api/users/${client.user.id}`, 'PATCH', userData);

      // Update client data
      const clientData = {
        companyName: data.companyName,
        contractType: data.contractType,
      };

      return await apiRequest(`/api/clients/${clientId}`, 'PATCH', clientData);
    },
    onSuccess: () => {
      // Invalidate and refetch clients query to update the list
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      
      toast({
        title: "Client updated",
        description: "The client information has been successfully updated.",
      });
      
      // Navigate back to client details page
      setLocation(`/clients/${clientId}`);
    },
    onError: (error) => {
      console.error("Error updating client:", error);
      toast({
        title: "Error",
        description: "There was a problem updating the client. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ClientFormValues) {
    updateClientMutation.mutate(data);
  }

  // Go back to client details page
  const handleBack = () => {
    if (clientId) {
      setLocation(`/clients/${clientId}`);
    } else {
      setLocation("/clients");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading client details...</p>
      </div>
    );
  }
  
  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-500">Error loading client details.</p>
        <Button variant="outline" className="mt-4" onClick={handleBack}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Client</CardTitle>
          <CardDescription>Update the client's information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="example@email.com" {...field} />
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
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 555-5555" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St, City, State" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Client Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Company Name" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>
                          Leave blank for residential clients
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contractType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || "residential"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select contract type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="residential">Residential</SelectItem>
                            <SelectItem value="commercial">Commercial</SelectItem>
                            <SelectItem value="service">Service Only</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={handleBack}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateClientMutation.isPending}
                >
                  {updateClientMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}