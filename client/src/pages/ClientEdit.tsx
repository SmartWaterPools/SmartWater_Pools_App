import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClientWithUser } from "@/lib/types";
import { AddressAutocomplete, AddressCoordinates } from "../components/ui/address-autocomplete";

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
import { ChevronLeft, Save, Loader2 } from "lucide-react";

const VALID_CONTRACT_TYPES = ["residential", "commercial", "service", "maintenance"] as const;
type ContractType = typeof VALID_CONTRACT_TYPES[number];

const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  contractType: z.string()
    .transform(val => {
      if (!val) return "residential";
      const normalized = String(val).toLowerCase();
      if (VALID_CONTRACT_TYPES.includes(normalized as ContractType)) {
        return normalized;
      }
      return "residential";
    })
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function ClientEdit() {
  const [, params] = useRoute("/clients/:id/edit");
  const clientId = params?.id ? parseInt(params.id) : null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: client, isLoading, error } = useQuery<ClientWithUser>({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
  });

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      companyName: "",
      latitude: null,
      longitude: null,
      contractType: "residential",
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      if (!client || !clientId) return null;

      const userData = {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
      };

      await apiRequest('PATCH', `/api/users/${client.user.id}`, userData);

      const normalizedContractType = data.contractType 
        ? String(data.contractType).toLowerCase() 
        : "residential";

      const clientData: Record<string, any> = {
        companyName: data.companyName || null,
        contractType: normalizedContractType,
      };

      if (data.latitude !== undefined && data.latitude !== null) {
        clientData.latitude = data.latitude;
      }
      if (data.longitude !== undefined && data.longitude !== null) {
        clientData.longitude = data.longitude;
      }

      const result = await apiRequest('PATCH', `/api/clients/${clientId}`, clientData);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      toast({
        title: "Client updated",
        description: "The client information has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating client",
        description: error?.message || "There was a problem saving the client information.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (client && client.user) {
      let contractTypeValue: ContractType = "residential";
      if (client.contractType) {
        const normalizedType = String(client.contractType).toLowerCase();
        if (VALID_CONTRACT_TYPES.includes(normalizedType as ContractType)) {
          contractTypeValue = normalizedType as ContractType;
        }
      }

      form.reset({
        name: client.user.name,
        email: client.user.email,
        phone: client.user.phone || "",
        address: client.user.address || "",
        companyName: client.companyName || client.client?.companyName || "",
        latitude: client.client?.latitude || null,
        longitude: client.client?.longitude || null,
        contractType: contractTypeValue,
      });
    }
  }, [client, form]);

  function onSubmit(data: ClientFormValues) {
    updateClientMutation.mutate(data);
  }

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
                          <AddressAutocomplete 
                            onAddressSelect={(address, coordinates) => {
                              field.onChange(address);
                              if (coordinates) {
                                form.setValue("latitude", coordinates.latitude);
                                form.setValue("longitude", coordinates.longitude);
                              }
                            }}
                            value={field.value || ""}
                            id={field.name}
                            onBlur={field.onBlur}
                          />
                        </FormControl>
                        <FormDescription>
                          Start typing to see address suggestions
                        </FormDescription>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 mt-6">
                <Button variant="outline" type="button" onClick={handleBack}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateClientMutation.isPending}>
                  {updateClientMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
