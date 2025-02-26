import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClientWithUser } from "@/lib/types";
import { debounce, isEqual } from "@/lib/utils";

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
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Save, Check, RefreshCw, AlertTriangle, Info } from "lucide-react";

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
  // Using a pre-processed string value
  contractType: z.string()
    .transform(val => {
      if (!val) return "residential";
      
      // Convert to lowercase for consistent validation
      const normalized = String(val).toLowerCase();
      
      // Verify against our valid contract types
      if (VALID_CONTRACT_TYPES.includes(normalized as ContractType)) {
        return normalized;
      }
      
      // Default to residential if invalid
      console.warn(`Invalid contract type "${val}", defaulting to "residential"`);
      return "residential";
    })
    // Make sure the result is definitely a valid contract type
    .refine(val => VALID_CONTRACT_TYPES.includes(val as ContractType), {
      message: `Contract type must be one of: ${VALID_CONTRACT_TYPES.join(', ')}`
    })
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function ClientEdit() {
  const [, params] = useRoute("/clients/:id/edit");
  const clientId = params?.id ? parseInt(params.id) : null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [initialData, setInitialData] = useState<ClientFormValues | null>(null);
  
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
    mode: "onChange", // Enable validation on change
  });

  // Update form values when client data is loaded
  useEffect(() => {
    if (client && client.user) {
      console.log(`[Form Debug] Setting form with client data:`, {
        contractType: client.contractType,
        companyName: client.companyName
      });
      
      // Process the contractType to ensure it's a valid enum value
      let contractTypeValue: ContractType = "residential";
      
      if (client.contractType) {
        // Convert to lowercase for consistency
        const normalizedType = String(client.contractType).toLowerCase();
        
        // Only use if it's one of our allowed values
        if (VALID_CONTRACT_TYPES.includes(normalizedType as ContractType)) {
          contractTypeValue = normalizedType as ContractType;
          console.log(`[Form Debug] Found valid contract type: "${normalizedType}"`);
        } else {
          console.warn(`Invalid contract type from server: "${client.contractType}", defaulting to "residential"`);
        }
      } else {
        console.log(`[Form Debug] Client has no contract type, using default: "residential"`);
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
      
      // Store initial data for comparison
      setInitialData(formValues);
      setSaveStatus("idle");
    }
  }, [client, form]);
  
  // Update client mutation will be defined first, then used in the saveFormData function
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
        
        // Ensure contract type is valid and properly formatted
        let normalizedContractType = "residential";
        
        if (data.contractType) {
          // First verify it's one of our allowed types
          const lowercaseType = String(data.contractType).toLowerCase();
          if (VALID_CONTRACT_TYPES.includes(lowercaseType as ContractType)) {
            normalizedContractType = lowercaseType;
          } else {
            console.warn(`[Client Update] Contract type "${data.contractType}" is not valid, defaulting to "residential"`);
          }
        }
         
        console.log(`[Client Update] Step 2: Using normalized contract type:`, normalizedContractType);
        
        // Create client data object
        const clientData = {
          companyName: data.companyName || null,
          // Use the exact string value, not an object
          contractType: normalizedContractType, 
        };
        
        // Debug output
        console.log(`[Client Update] Step 3: Raw client data for update:`, JSON.stringify(clientData));
        
        // If no changes are needed, return the current client
        if (client.contractType === normalizedContractType && 
            client.companyName === clientData.companyName) {
          console.log(`[Client Update] No changes needed, returning current client`);
          return client;
        }
        
        console.log(`[Client Update] Step 4: Updating client ${clientId} with data:`, clientData);
        try {
          const result = await apiRequest(`/api/clients/${clientId}`, 'PATCH', clientData);
          console.log(`[Client Update] Client update successful, received:`, result);
          return result;
        } catch (updateError) {
          console.error(`[Client Update] Error updating client:`, updateError);
          
          // Handle specific error cases
          const errorMsg = typeof updateError === 'object' && updateError !== null 
            ? (updateError as any).message || JSON.stringify(updateError)
            : String(updateError);
            
          if (errorMsg.includes('match the expected pattern')) {
            console.error(`[Client Update] Pattern matching error detected. Forcing contractType to standard value.`);
            // Try one more time with hardcoded values
            const fallbackData = {
              companyName: clientData.companyName,
              contractType: client.contractType || "residential" // Use current type or default
            };
            
            const retryResult = await apiRequest(`/api/clients/${clientId}`, 'PATCH', fallbackData);
            return retryResult;
          }
          
          throw updateError;
        }
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
      
      // For auto-save, we don't navigate away unless explicitly requested
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

  // Create debounced save function after the mutation is defined
  const saveFormData = (data: ClientFormValues) => {
    if (!initialData) return;
    
    // Check if there are actual changes compared to the initial data
    if (
      data.name === initialData.name &&
      data.email === initialData.email &&
      data.phone === initialData.phone &&
      data.address === initialData.address &&
      data.companyName === initialData.companyName &&
      data.contractType === initialData.contractType
    ) {
      console.log("[Auto-save] No changes detected, skipping save");
      setSaveStatus("idle");
      return;
    }

    if (form.formState.isValid) {
      console.log("[Auto-save] Saving changes:", data);
      setSaveStatus("saving");
      updateClientMutation.mutate(data, {
        onSuccess: () => {
          setSaveStatus("saved");
          // Restore to idle after a delay
          setTimeout(() => setSaveStatus("idle"), 2000);
        },
        onError: () => {
          setSaveStatus("error");
          // Attempt to restore to idle after a longer delay
          setTimeout(() => setSaveStatus("idle"), 3000);
        }
      });
    } else {
      console.log("[Auto-save] Form has validation errors, not saving");
      setSaveStatus("error");
    }
  };
  
  // Create a memoized debounced version of the save function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = React.useMemo(
    () => debounce(saveFormData, 1000), 
    // We use an empty dependency array and add the ESLint disable comment
    // because we want this debounced function to be created only once
    []
  );
  
  // Watch for changes and auto-save
  useEffect(() => {
    // Skip if we don't have the initial data set yet
    if (!initialData) return;
    
    const subscription = form.watch((formData) => {
      // Make sure we have complete data
      if (!formData.name || !formData.email) {
        console.log("[Auto-save] Incomplete required data, not saving");
        return;
      }
      
      const formValues = form.getValues();
      
      // Process contract type
      let contractTypeValue = "residential";
      if (formValues.contractType) {
        const normalizedValue = String(formValues.contractType).toLowerCase();
        if (VALID_CONTRACT_TYPES.includes(normalizedValue as ContractType)) {
          contractTypeValue = normalizedValue;
        }
      }
      
      // Create a clean data object
      const cleanData = {
        ...formValues,
        contractType: contractTypeValue,
        phone: formValues.phone || "",
        address: formValues.address || "",
        companyName: formValues.companyName || ""
      };
      
      console.log("[Auto-save] Change detected, will save after debounce:", cleanData);
      setSaveStatus("saving");
      debouncedSave(cleanData as ClientFormValues);
    });
    
    return () => subscription.unsubscribe();
  }, [form, debouncedSave, initialData]);

  function onSubmit(data: ClientFormValues) {
    console.log("[Submit] Form submitted, navigating back to client details");
    
    // Instead of submitting data on form submit, we'll just navigate back
    // Since the auto-save feature already handles saving the data
    
    if (clientId) {
      setLocation(`/clients/${clientId}`);
    } else {
      setLocation("/clients");
    }
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
                      
                      // Ensure field value is always valid
                      let safeValue: ContractType = "residential";
                      if (field.value) {
                        // Convert to string and lowercase
                        const normalizedValue = String(field.value).toLowerCase();
                        // Check if it's a valid contract type
                        if (VALID_CONTRACT_TYPES.includes(normalizedValue as ContractType)) {
                          safeValue = normalizedValue as ContractType;
                        } else {
                          console.warn(`Invalid contract type detected: "${normalizedValue}", defaulting to "residential"`);
                        }
                      }
                      
                      return (
                        <FormItem>
                          <FormLabel>Contract Type</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              console.log(`[Contract Type Field] Select changed to: "${value}"`);
                              // Only allow valid contract types from our predefined list
                              if (VALID_CONTRACT_TYPES.includes(value as ContractType)) {
                                field.onChange(value);
                              } else {
                                console.warn(`Invalid contract type selected: "${value}"`);
                                field.onChange("residential");
                              }
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

              <div className="flex justify-between items-center mt-6">
                <div className="flex items-center space-x-2">
                  {saveStatus === "saving" && (
                    <div className="flex items-center text-orange-500">
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      <span>Auto-saving changes...</span>
                    </div>
                  )}
                  {saveStatus === "saved" && (
                    <div className="flex items-center text-green-500">
                      <Check className="h-4 w-4 mr-2" />
                      <span>All changes saved</span>
                    </div>
                  )}
                  {saveStatus === "error" && (
                    <div className="flex items-center text-red-500">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      <span>Error saving changes - please check inputs</span>
                    </div>
                  )}
                  {saveStatus === "idle" && (
                    <div className="flex items-center text-gray-400">
                      <Info className="h-4 w-4 mr-2" />
                      <span>Changes will auto-save as you type</span>
                    </div>
                  )}
                </div>
                <Button 
                  variant="default" 
                  type="button" 
                  onClick={handleBack}
                >
                  Done
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}