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

// List of valid contract types
const VALID_CONTRACT_TYPES = ["residential", "commercial", "service", "maintenance"] as const;
type ContractType = typeof VALID_CONTRACT_TYPES[number];

// Define the client form schema
const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  // Validate and normalize contract type
  contractType: z.string()
    .transform(val => {
      // Handle empty or null values
      if (!val || val === "") return null;
      
      // Always normalize to lowercase for consistency
      const normalized = String(val).toLowerCase();
      
      // Check if it's one of our valid contract types
      if (VALID_CONTRACT_TYPES.includes(normalized as any)) {
        return normalized as ContractType;
      }
      
      // If not valid, throw an error instead of silent fallback
      // This helps catch validation issues early
      throw new Error(`Invalid contract type: "${val}". Must be one of: ${VALID_CONTRACT_TYPES.join(', ')}`);
    })
    .or(z.literal(''))  // Accept empty string (will be transformed to null)
    .or(z.null())       // Also accept explicit null
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
      console.log(`[Form Debug] Setting form with client data:`, {
        contractType: client.contractType,
        companyName: client.companyName
      });
      
      // Process the contractType to ensure it's a valid enum value
      let contractTypeValue: "residential" | "commercial" | "service" | "maintenance" | null = "residential";
      
      if (client.contractType) {
        // Only use if it's one of our allowed values
        if (["residential", "commercial", "service", "maintenance"].includes(client.contractType.toLowerCase())) {
          contractTypeValue = client.contractType.toLowerCase() as "residential" | "commercial" | "service" | "maintenance";
        }
      }
      
      const formValues = {
        name: client.user.name,
        email: client.user.email,
        phone: client.user.phone || "",
        address: client.user.address || "",
        companyName: client.companyName || "",
        contractType: contractTypeValue,
      };
      
      console.log(`[Form Debug] Final form values:`, formValues);
      form.reset(formValues);
    }
  }, [client, form]);

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      if (!client || !clientId) return null;
      
      try {
        // Update user data first
        console.log(`[Client Update] Starting update process for client ID ${clientId}`);
        const userData = {
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
        };

        console.log(`[Client Update] Step 1: Updating user ${client.user.id} with data:`, userData);
        await apiRequest(`/api/users/${client.user.id}`, 'PATCH', userData);
        console.log(`[Client Update] User update successful`);

        // The contract type has already been validated and transformed by the schema
        // data.contractType is already either a valid value or null
        console.log(`[Client Update] Step 2: Using validated contract type: "${data.contractType}"`);
        
        // Update client data - rely on schema validation for correct values
        const clientData = {
          companyName: data.companyName || null,
          contractType: data.contractType,
        };
        
        console.log(`[Client Update] Step 3: Updating client ${clientId} with data:`, clientData);
        const result = await apiRequest(`/api/clients/${clientId}`, 'PATCH', clientData);
        console.log(`[Client Update] Client update successful, received:`, result);
        
        return result;
      } catch (error) {
        console.error(`[Client Update] Error during update process:`, error);
        throw error; // Re-throw to be caught by mutation error handler
      }
    },
    onSuccess: (data) => {
      console.log("[Client Update Success] Response data:", data);
      
      // Force invalidate all client-related queries to ensure fresh data
      console.log("[Client Update] Invalidating client queries");
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      
      // Force a refresh of the client details page data
      queryClient.refetchQueries({ queryKey: ['/api/clients', clientId] });
      
      // Force a delay before navigation to ensure cache is refreshed
      setTimeout(() => {
        toast({
          title: "Client updated",
          description: "The client information has been successfully updated.",
        });
        
        // Navigate back to client details page
        console.log("[Client Update] Navigation to client details page");
        setLocation(`/clients/${clientId}`);
      }, 500); // Increased delay to ensure data is refreshed
    },
    onError: (error: any) => {
      console.error("[Client Update Error]:", error);
      
      // Detailed error message for better debugging
      const errorMessage = error?.message || "Unknown error occurred";
      toast({
        title: "Error updating client",
        description: `There was a problem updating the client: ${errorMessage}. Please try again.`,
        variant: "destructive",
      });
      
      // Force refresh queries to ensure consistent state
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
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
                    render={({ field }) => {
                      console.log(`[Contract Type Field] Current value: "${field.value}"`);
                      
                      // Ensure field value is always lowercase and valid
                      let safeValue = field.value;
                      if (safeValue) {
                        safeValue = String(safeValue).toLowerCase();
                        // Ensure it's one of our valid values
                        if (!VALID_CONTRACT_TYPES.includes(safeValue as any)) {
                          console.warn(`Invalid contract type detected: "${safeValue}", defaulting to "residential"`);
                          safeValue = "residential";
                        }
                      } else {
                        // Default for empty/null values
                        safeValue = "residential";
                      }
                      
                      return (
                        <FormItem>
                          <FormLabel>Contract Type</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              console.log(`[Contract Type Field] Select changed to: "${value}"`);
                              // Always convert to lowercase before sending to form
                              const normalizedValue = value ? value.toLowerCase() : value;
                              field.onChange(normalizedValue);
                            }}
                            value={safeValue}
                            defaultValue="residential"
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
                          <FormDescription>
                            Current contract type: {safeValue}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
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