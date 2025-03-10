import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

// Define the form schema
const inventoryItemFormSchema = z.object({
  name: z.string({
    required_error: "Item name is required",
  }).min(2, "Item name must be at least 2 characters"),
  sku: z.string({
    required_error: "SKU is required",
  }).min(2, "SKU must be at least 2 characters"),
  category: z.string({
    required_error: "Category is required",
  }),
  description: z.string().optional(),
  quantity: z.coerce.number({
    required_error: "Quantity is required",
    invalid_type_error: "Quantity must be a number",
  }).min(0, "Quantity cannot be negative"),
  minQuantity: z.coerce.number({
    required_error: "Minimum quantity is required",
    invalid_type_error: "Minimum quantity must be a number",
  }).min(0, "Minimum quantity cannot be negative"),
  unitPrice: z.coerce.number({
    required_error: "Unit price is required",
    invalid_type_error: "Unit price must be a number",
  }).min(0, "Unit price cannot be negative"),
  location: z.string().optional(),
  lastRestockDate: z.date().optional(),
  notes: z.string().optional(),
});

type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>;

interface InventoryItemFormProps {
  itemCategories?: string[];
  itemToEdit?: InventoryItemFormValues & { id?: number };
  onClose: () => void;
}

export function InventoryItemForm({ itemCategories, itemToEdit, onClose }: InventoryItemFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);

  // Default inventory categories if not provided
  const categories = itemCategories || [
    "chemicals",
    "equipment",
    "parts",
    "tools",
    "office",
    "safety",
    "other"
  ];

  // Get default values for form
  const defaultValues: Partial<InventoryItemFormValues> = {
    name: itemToEdit?.name || "",
    sku: itemToEdit?.sku || "",
    category: itemToEdit?.category || "",
    description: itemToEdit?.description || "",
    quantity: itemToEdit?.quantity || 0,
    minQuantity: itemToEdit?.minQuantity || 0,
    unitPrice: itemToEdit?.unitPrice 
      ? itemToEdit.unitPrice / 100 // Convert cents to dollars for form display
      : undefined,
    location: itemToEdit?.location || "",
    lastRestockDate: itemToEdit?.lastRestockDate 
      ? new Date(itemToEdit.lastRestockDate) 
      : undefined,
    notes: itemToEdit?.notes || "",
  };

  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemFormSchema),
    defaultValues,
  });

  // Mutation for creating/updating inventory item
  const mutation = useMutation({
    mutationFn: async (values: InventoryItemFormValues) => {
      // Convert dollars to cents for storage
      const data = {
        ...values,
        unitPrice: Math.round(values.unitPrice * 100), // Convert to cents
      };

      if (itemToEdit?.id) {
        // Update existing item
        return apiRequest(`/api/business/inventory/${itemToEdit.id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      } else {
        // Create new item
        return apiRequest("/api/business/inventory", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      toast({
        title: itemToEdit?.id ? "Inventory item updated" : "Inventory item created",
        description: itemToEdit?.id
          ? "The inventory item has been updated successfully."
          : "A new inventory item has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/business/inventory'] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${itemToEdit?.id ? "update" : "create"} inventory item. ${error.message}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: InventoryItemFormValues) {
    mutation.mutate(values);
  }

  function handleClose() {
    setIsOpen(false);
    onClose();
  }

  // Format category display name
  const formatCategory = (category: string): string => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {itemToEdit?.id ? "Edit Inventory Item" : "Add Inventory Item"}
          </DialogTitle>
          <DialogDescription>
            {itemToEdit?.id
              ? "Update the details of this inventory item."
              : "Enter the details of the new inventory item."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Item Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter item name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SKU Field */}
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter SKU" {...field} />
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
                        <SelectTrigger>
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
            </div>

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter item description" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Quantity Field */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Min Quantity Field */}
              <FormField
                control={form.control}
                name="minQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Alert when below this level
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit Price Field */}
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Location Field */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Location (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Where is this item stored?" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Last Restock Date Field */}
              <FormField
                control={form.control}
                name="lastRestockDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Last Restock Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes Field */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional notes about this item"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="gap-1"
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="gap-1">
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {itemToEdit?.id ? "Update Item" : "Create Item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}