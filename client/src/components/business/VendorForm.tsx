import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { GoogleAddressAutocomplete } from "../maps/GoogleAddressAutocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

// Define the form schema
const vendorFormSchema = z.object({
  name: z.string({
    required_error: "Vendor name is required",
  }).min(2, "Vendor name must be at least 2 characters"),
  category: z.string({
    required_error: "Category is required",
  }),
  contactName: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

interface VendorFormProps {
  vendorCategories?: string[];
  vendorToEdit?: VendorFormValues & { id?: number };
  onClose: () => void;
}

export function VendorForm({ vendorCategories, vendorToEdit, onClose }: VendorFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);

  // Default vendor categories if not provided
  const categories = vendorCategories || [
    "chemical supplier",
    "equipment",
    "parts",
    "service",
    "tools",
    "office",
    "utilities",
    "marketing",
    "other"
  ];

  // Get default values for form
  const defaultValues: Partial<VendorFormValues> = {
    name: vendorToEdit?.name || "",
    category: vendorToEdit?.category || "",
    contactName: vendorToEdit?.contactName || "",
    email: vendorToEdit?.email || "",
    phone: vendorToEdit?.phone || "",
    address: vendorToEdit?.address || "",
    website: vendorToEdit?.website || "",
    notes: vendorToEdit?.notes || "",
    isActive: vendorToEdit?.isActive ?? true,
  };

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues,
  });

  // Mutation for creating/updating a vendor
  const mutation = useMutation({
    mutationFn: async (values: VendorFormValues) => {
      if (vendorToEdit?.id) {
        // Update existing vendor
        return apiRequest("PATCH", `/api/vendors/${vendorToEdit.id}`, values);
      } else {
        // Create new vendor
        return apiRequest("POST", "/api/vendors", values);
      }
    },
    onSuccess: () => {
      toast({
        title: vendorToEdit?.id ? "Vendor updated" : "Vendor created",
        description: vendorToEdit?.id
          ? "The vendor has been updated successfully."
          : "A new vendor has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${vendorToEdit?.id ? "update" : "create"} vendor. ${error.message}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: VendorFormValues) {
    mutation.mutate(values);
  }

  function handleClose() {
    setIsOpen(false);
    onClose();
  }

  // Format category display name
  const formatCategory = (category: string): string => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[95vw] sm:max-w-[600px] md:w-full overflow-y-auto max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {vendorToEdit?.id ? "Edit Vendor" : "Add New Vendor"}
          </DialogTitle>
          <DialogDescription>
            {vendorToEdit?.id
              ? "Update the details of this vendor."
              : "Enter the details of the new vendor."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Vendor Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter vendor name" {...field} className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Field */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {formatCategory(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Name Field - Full width on mobile */}
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Primary contact person" {...field} value={field.value || ""} className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email Field - Full width on mobile */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="contact@vendor.com" 
                      {...field} 
                      value={field.value || ""} 
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone Field - Full width on mobile */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="555-123-4567" {...field} value={field.value || ""} className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Website Field - Full width on mobile */}
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://www.vendor.com" 
                      {...field} 
                      value={field.value || ""} 
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Field */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <GoogleAddressAutocomplete value={field.value || ""} onChange={(address) => field.onChange(address)} placeholder="Vendor address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Is Active Field */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active Vendor</FormLabel>
                    <FormDescription className="text-xs sm:text-sm">
                      Inactive vendors will not appear in select dropdowns for new orders.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Notes Field */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional notes about this vendor"
                      {...field}
                      value={field.value || ""}
                      className="w-full min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="gap-1 w-full sm:w-auto"
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="gap-1 w-full sm:w-auto">
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {vendorToEdit?.id ? "Update Vendor" : "Create Vendor"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}