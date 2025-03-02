import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  Save, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  Info,
  Wifi,
  WifiOff,
  Database,
  Clock
} from "lucide-react";

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
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [initialData, setInitialData] = useState<ClientFormValues | null>(null);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [offlineData, setOfflineData] = useState<ClientFormValues | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [forceSaving, setForceSaving] = useState(false);
  
  // Check if there's saved form data in localStorage
  const getSavedFormData = (): ClientFormValues | null => {
    if (!clientId) return null;
    const savedData = localStorage.getItem(`client_edit_${clientId}`);
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (e) {
        console.error('Error parsing saved form data:', e);
        return null;
      }
    }
    return null;
  };
  
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
  
  // Update client mutation definition
  const updateClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      if (!client || !clientId) return null;
      
      try {
        // Update user data first
        console.log(`[Client Update] Starting update process for client ID ${clientId}`);
        const userData = {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          address: data.address || null,
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
        
        // Create client data object - ONLY SEND THE CLIENT FIELDS
        // Strip out any user fields, and explicitly send only what changed
        // This gives us a higher chance of successful updates
        const clientData: Record<string, any> = {};
        
        // Only add fields that have changed
        if (client.companyName !== (data.companyName || null)) {
          clientData.companyName = data.companyName || null;
        }
        
        // For contract type, we need to be extra careful to handle case differences
        // Compare after normalizing both to lowercase for proper comparison
        const dbContractType = client.contractType ? String(client.contractType).toLowerCase() : null;
        
        if (dbContractType !== normalizedContractType) {
          clientData.contractType = normalizedContractType;
          console.log(`[Client Update] CONTRACT TYPE CHANGE: "${client.contractType}" → "${normalizedContractType}"`);
        }
        
        // Debug output
        console.log(`[Client Update] Step 3: Raw client data for update:`, JSON.stringify(clientData));
        
        // Check if we have any fields to update in clientData
        const hasClientChanges = Object.keys(clientData).length > 0;
          
        // If no client changes, skip the client update
        if (!hasClientChanges) {
          console.log(`[Client Update] No client field changes detected, skipping client update`);
          return client;
        }
        
        // Log what fields are being changed
        console.log(`[Client Update] Fields being updated:`, Object.keys(clientData).join(", "));
        
        console.log(`[Client Update] Step 4: Updating client ${clientId} with client-specific data:`, clientData);
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
            
            console.log('[Client Update] Trying with fallback data:', fallbackData);
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

  // Set up online/offline listeners
  useEffect(() => {
    // Define event handlers
    const handleOnline = () => {
      console.log('[Network] Device is now online');
      setIsOnline(true);
      toast({
        title: "Back online",
        description: "Your changes will now sync with the server",
      });

      // If we have offline data, try to sync it
      if (offlineData && clientId && client) {
        console.log('[Network] Attempting to sync offline data');
        setForceSaving(true);
        
        // Manual sync process when coming back online
        const syncOfflineData = async () => {
          try {
            // Step 1: Update user data first
            console.log(`[Network Sync] Updating user ${client.user.id} with offline data`);
            const userData = {
              name: offlineData.name,
              email: offlineData.email,
              phone: offlineData.phone || null,
              address: offlineData.address || null,
            };
            
            // Direct API call to update user
            await apiRequest(`/api/users/${client.user.id}`, 'PATCH', userData);
            console.log('[Network Sync] User update successful');
            
            // Step 2: Update client data if needed
            const clientData: Record<string, any> = {};
            
            if (client.companyName !== (offlineData.companyName || null)) {
              clientData.companyName = offlineData.companyName || null;
            }
            
            // Normalize and compare contract types
            const normalizedType = String(offlineData.contractType).toLowerCase();
            const dbContractType = client.contractType 
              ? String(client.contractType).toLowerCase() 
              : null;
              
            if (dbContractType !== normalizedType) {
              clientData.contractType = normalizedType;
            }
            
            // If client data needs updating
            if (Object.keys(clientData).length > 0) {
              console.log(`[Network Sync] Updating client ${clientId} with data:`, clientData);
              await apiRequest(`/api/clients/${clientId}`, 'PATCH', clientData);
            }
            
            console.log('[Network Sync] Sync completed successfully');
            
            // Success handling
            localStorage.removeItem(`client_edit_${clientId}`);
            setOfflineData(null);
            setForceSaving(false);
            
            // Force refresh data
            queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
            queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
            
            toast({
              title: "Data synced",
              description: "Your offline changes have been saved to the server",
            });
            
            return true;
          } catch (error) {
            console.error('[Network Sync] Failed to sync offline data:', error);
            setForceSaving(false);
            toast({
              title: "Sync failed",
              description: "Unable to save your offline changes. They'll be saved locally until you're back online.",
              variant: "destructive",
            });
            return false;
          }
        };
        
        syncOfflineData();
      }
    };

    const handleOffline = () => {
      console.log('[Network] Device is now offline');
      setIsOnline(false);
      toast({
        title: "You're offline",
        description: "Changes will be saved locally until you reconnect",
        variant: "default",
      });
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clean up
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [clientId, offlineData, toast, client, queryClient]);

  // Check for saved data in localStorage when component mounts
  useEffect(() => {
    if (clientId) {
      const savedData = getSavedFormData();
      if (savedData) {
        console.log('[Local Storage] Found saved form data:', savedData);
        setOfflineData(savedData);
        toast({
          title: "Unsaved changes found",
          description: "We've restored your previous edits",
        });
      }
    }
  }, [clientId, toast]);

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
      
      // Check if we have local changes that should be used instead
      const savedData = getSavedFormData();
      
      const formValues = savedData || {
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
      
      // If we loaded from saved data, notify the user
      if (savedData) {
        toast({
          title: "Restored unsaved changes",
          description: "You had unsaved changes that have been restored",
        });
      }
    }
  }, [client, form, toast]);

  // Function to save form data to localStorage
  const saveToLocalStorage = (data: ClientFormValues) => {
    if (!clientId) return;
    
    try {
      localStorage.setItem(`client_edit_${clientId}`, JSON.stringify(data));
      setLastSaved(new Date());
      console.log('[Local Storage] Saved client edit data to localStorage');
    } catch (error) {
      console.error('[Local Storage] Error saving to localStorage:', error);
    }
  };
  
  // Create debounced save function after the mutation is defined
  const saveFormData = (data: ClientFormValues) => {
    if (!initialData || !client) return;
    
    // Always save to localStorage for offline support
    if (isAutoSaveEnabled) {
      saveToLocalStorage(data);
    }
    
    // Debug logging for contract type changes
    console.log("[Auto-save] Comparing contract types:", {
      initial: initialData.contractType,
      current: data.contractType,
      initialType: typeof initialData.contractType,
      currentType: typeof data.contractType,
      equal: data.contractType === initialData.contractType,
      normalizedEqual: String(data.contractType).toLowerCase() === String(initialData.contractType).toLowerCase()
    });
    
    // Check if there are actual changes compared to the initial data
    if (
      data.name === initialData.name &&
      data.email === initialData.email &&
      data.phone === initialData.phone &&
      data.address === initialData.address &&
      data.companyName === initialData.companyName &&
      String(data.contractType).toLowerCase() === String(initialData.contractType).toLowerCase()
    ) {
      console.log("[Auto-save] No changes detected, skipping server save");
      setSaveStatus("idle");
      return;
    }
    
    // Debug - log the differences
    const differences = {
      name: data.name !== initialData.name,
      email: data.email !== initialData.email,
      phone: data.phone !== initialData.phone,
      address: data.address !== initialData.address,
      companyName: data.companyName !== initialData.companyName,
      contractType: String(data.contractType).toLowerCase() !== String(initialData.contractType).toLowerCase()
    };
    console.log("[Auto-save] Changes detected in:", differences);

    // Only attempt to save to server if we're online
    if (form.formState.isValid && (isOnline || forceSaving)) {
      console.log("[Auto-save] Saving changes to server:", data);
      setSaveStatus("saving");
      
      // Manual implementation of the update process
      const saveProcess = async () => {
        try {
          // Step 1: Update user data first
          console.log(`[Manual Save] Updating user ${client.user.id} with data`);
          const userData = {
            name: data.name,
            email: data.email,
            phone: data.phone || null,
            address: data.address || null,
          };
          
          // Direct API call to update user
          await apiRequest(`/api/users/${client.user.id}`, 'PATCH', userData);
          console.log('[Manual Save] User update successful');
          
          // Step 2: Update client data if needed
          const clientData: Record<string, any> = {};
          
          if (client.companyName !== (data.companyName || null)) {
            clientData.companyName = data.companyName || null;
          }
          
          // Normalize and compare contract types
          const normalizedType = String(data.contractType).toLowerCase();
          const dbContractType = client.contractType 
            ? String(client.contractType).toLowerCase() 
            : null;
            
          if (dbContractType !== normalizedType) {
            clientData.contractType = normalizedType;
          }
          
          // If client data needs updating
          if (Object.keys(clientData).length > 0) {
            console.log(`[Manual Save] Updating client ${clientId} with data:`, clientData);
            await apiRequest(`/api/clients/${clientId}`, 'PATCH', clientData);
          }
          
          console.log('[Manual Save] Save completed successfully');
          
          // Success handling
          setSaveStatus("saved");
          
          // Force refresh data
          queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
          queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
          
          // Update initialData with the new values to prevent duplicate saves
          setInitialData(data);
          
          // Clear any offline data since we successfully saved
          setOfflineData(null);
          
          // Remove localStorage data on successful save
          if (clientId) {
            localStorage.removeItem(`client_edit_${clientId}`);
          }
          
          // Restore to idle after a delay
          setTimeout(() => setSaveStatus("idle"), 2000);
          
          setLastSaved(new Date());
          setForceSaving(false);
          
          return true;
        } catch (error) {
          console.error("[Manual Save] Error saving data:", error);
          setSaveStatus("error");
          
          // Store for offline mode
          setOfflineData(data);
          
          // Attempt to restore to idle after a longer delay
          setTimeout(() => setSaveStatus("idle"), 3000);
          
          setForceSaving(false);
          return false;
        }
      };
      
      // Execute the save process
      saveProcess();
    } else if (!isOnline) {
      // If we're offline, just store the data for later sync
      console.log("[Auto-save] Device offline, storing changes for later sync");
      setOfflineData(data);
      setSaveStatus("saved"); // Show saved state even though it's just local
      setTimeout(() => setSaveStatus("idle"), 2000);
      setLastSaved(new Date());
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
      
      // Create a clean data object - IMPORTANT: Don't send all fields to the API
      // We have two separate endpoints - one for user data and one for client data
      // We only need to send the client-specific fields to the client update endpoint
      const cleanData = {
        // These are user fields, but needed for the form validation and comparison
        name: formValues.name,
        email: formValues.email,
        phone: formValues.phone || "",
        address: formValues.address || "",
        
        // These are client fields, the only ones that will get sent to the client API
        companyName: formValues.companyName || "",
        contractType: contractTypeValue
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
              {/* Network status indicator */}
              <div className="flex justify-end mb-4">
                <Badge variant={isOnline ? "default" : "outline"} className="flex items-center gap-1">
                  {isOnline ? (
                    <>
                      <Wifi className="h-3 w-3" />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3" />
                      <span>Offline</span>
                    </>
                  )}
                </Badge>
              </div>
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
                              console.log(`[Contract Type Field] Select changed to: "${value}" (from UI)`);
                              
                              if (!VALID_CONTRACT_TYPES.includes(value as ContractType)) {
                                console.warn(`Invalid contract type selected: "${value}"`);
                                toast({
                                  title: "Invalid selection",
                                  description: `"${value}" is not a valid contract type`,
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              // Use the dedicated contract type API
                              setSaveStatus("saving");
                              
                              // First update the form field immediately for better UI feedback
                              const normalizedValue = value.toLowerCase();
                              field.onChange(normalizedValue);
                              
                              console.log(`[Contract Type Field] Using direct API for type update to "${normalizedValue}"`);
                              
                              // Call the specialized endpoint just for contract type
                              apiRequest(`/api/clients/${clientId}/contract-type`, "POST", {
                                contractType: normalizedValue
                              })
                                .then(response => {
                                  console.log(`[Contract Type Field] Direct API response:`, response);
                                  
                                  // Success - update UI state
                                  setSaveStatus("saved");
                                  setTimeout(() => setSaveStatus("idle"), 2000);
                                  
                                  // Update initial data
                                  setInitialData({
                                    ...initialData,
                                    contractType: normalizedValue
                                  } as ClientFormValues);
                                  
                                  // Force refresh data
                                  queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
                                  queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
                                  
                                  toast({
                                    title: "Contract type updated",
                                    description: `Contract type successfully changed to ${normalizedValue}`,
                                  });
                                })
                                .catch(error => {
                                  console.error(`[Contract Type Field] Direct API error:`, error);
                                  setSaveStatus("error");
                                  toast({
                                    title: "Update failed",
                                    description: `Could not update contract type: ${error.message || "Unknown error"}`,
                                    variant: "destructive",
                                  });
                                });
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
                            Contract type: {safeValue} (DB value: {client?.contractType || "none"})
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4 mt-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autosave"
                    checked={isAutoSaveEnabled}
                    onCheckedChange={setIsAutoSaveEnabled}
                  />
                  <Label htmlFor="autosave">Auto-save</Label>
                </div>
                
                {lastSaved && (
                  <div className="flex items-center text-gray-400 text-sm">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                  </div>
                )}
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
                      <span>{isOnline ? "All changes saved" : "Saved locally"}</span>
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
                      <span>
                        {isAutoSaveEnabled 
                          ? "Changes will auto-save as you type" 
                          : "Auto-save is disabled"}
                      </span>
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