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

const inventoryItemFormSchema = z.object({
  name: z.string({
    required_error: "Item name is required",
  }).min(2, "Item name must be at least 2 characters"),
  sku: z.string().optional(),
  category: z.string({
    required_error: "Category is required",
  }),
  description: z.string().optional(),
  quantity: z.coerce.number({
    required_error: "Quantity is required",
    invalid_type_error: "Quantity must be a number",
  }).min(0, "Quantity cannot be negative"),
  minimumStock: z.coerce.number({
    invalid_type_error: "Minimum stock must be a number",
  }).min(0, "Minimum stock cannot be negative").default(0),
  reorderPoint: z.coerce.number({
    invalid_type_error: "Reorder point must be a number",
  }).min(0, "Reorder point cannot be negative").default(0),
  unitCost: z.coerce.number({
    invalid_type_error: "Unit cost must be a number",
  }).min(0, "Unit cost cannot be negative").default(0),
  unitPrice: z.coerce.number({
    invalid_type_error: "Unit price must be a number",
  }).min(0, "Unit price cannot be negative").default(0),
  location: z.string().optional(),
  lastRestockDate: z.date().optional(),
  notes: z.string().optional(),
});

type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>;

interface InventoryItemFormProps {
  itemCategories?: string[];
  itemToEdit?: any;
  onClose: () => void;
  apiBasePath?: string;
}

export function InventoryItemForm({ itemCategories, itemToEdit, onClose, apiBasePath = '/api/business/inventory' }: InventoryItemFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);

  const categories = itemCategories || [
    "chemicals",
    "equipment",
    "parts",
    "tools",
    "office",
    "safety",
    "other"
  ];

  const defaultValues: Partial<InventoryItemFormValues> = {
    name: itemToEdit?.name || "",
    sku: itemToEdit?.sku || "",
    category: itemToEdit?.category || "",
    description: itemToEdit?.description || "",
    quantity: itemToEdit ? Number(itemToEdit.quantity || 0) : 0,
    minimumStock: itemToEdit?.minimumStock || 0,
    reorderPoint: itemToEdit?.reorderPoint || 0,
    unitCost: itemToEdit?.unitCost ? itemToEdit.unitCost / 100 : 0,
    unitPrice: itemToEdit?.unitPrice ? itemToEdit.unitPrice / 100 : 0,
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

  const mutation = useMutation({
    mutationFn: async (values: InventoryItemFormValues) => {
      const data = {
        name: values.name,
        sku: values.sku || null,
        category: values.category,
        description: values.description || null,
        quantity: String(values.quantity),
        minimumStock: values.minimumStock,
        reorderPoint: values.reorderPoint,
        unitCost: Math.round(values.unitCost * 100),
        unitPrice: Math.round(values.unitPrice * 100),
        location: values.location || null,
        lastRestockDate: values.lastRestockDate ? format(values.lastRestockDate, "yyyy-MM-dd") : null,
        notes: values.notes || null,
      };

      if (itemToEdit?.id) {
        return apiRequest('PATCH', `${apiBasePath}/${itemToEdit.id}`, data);
      } else {
        return apiRequest('POST', apiBasePath, data);
      }
    },
    onSuccess: () => {
      toast({
        title: itemToEdit?.id ? "Inventory item updated" : "Inventory item created",
        description: itemToEdit?.id
          ? "The inventory item has been updated successfully."
          : "A new inventory item has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [apiBasePath] });
      queryClient.invalidateQueries({ queryKey: ['/api/business/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/business/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/summary'] });
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

  const formatCategory = (category: string): string => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader className="px-2 sm:px-4">
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 px-1 sm:px-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-sm font-medium">Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter item name" {...field} className="text-base" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-sm font-medium">SKU (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter SKU" {...field} value={field.value || ""} className="text-base" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-sm font-medium">Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="text-base">
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
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-sm font-medium">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter item description"
                      {...field}
                      value={field.value || ""}
                      className="text-base resize-none min-h-[60px]"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-sm font-medium">Current Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        {...field}
                        className="text-base"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumStock"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-sm font-medium">Minimum Stock</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        {...field}
                        className="text-base"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Alert when below this level
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="reorderPoint"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-sm font-medium">Reorder Point</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        {...field}
                        className="text-base"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Trigger reorder at this quantity
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-sm font-medium">Unit Cost ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        placeholder="0.00"
                        {...field}
                        className="text-base"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="unitPrice"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-sm font-medium">Unit Price ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      placeholder="0.00"
                      {...field}
                      className="text-base"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Selling price per unit
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-sm font-medium">Storage Location (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Where is this item stored?"
                      {...field}
                      value={field.value || ""}
                      className="text-base"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastRestockDate"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-sm font-medium">Last Restock Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full px-3 h-10 text-left font-normal text-base",
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
                        className="rounded-md border"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-sm font-medium">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional notes about this item"
                      {...field}
                      value={field.value || ""}
                      className="text-base resize-none min-h-[60px]"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2 sm:pt-4 flex flex-col sm:flex-row gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="w-full sm:w-auto gap-1 text-sm"
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full sm:w-auto gap-1 text-sm"
              >
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
