import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2, X, Plus, Trash2 } from "lucide-react";
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
import { GoogleAddressAutocomplete } from "../maps/GoogleAddressAutocomplete";
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
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Define the schema for order items
const orderItemSchema = z.object({
  itemId: z.coerce.number().optional(),
  description: z.string().min(2, "Description is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0.01, "Price must be greater than 0"),
  total: z.coerce.number().optional(),
});

// Define the form schema
const purchaseOrderFormSchema = z.object({
  vendorId: z.coerce.number({
    required_error: "Vendor is required",
  }),
  orderDate: z.date({
    required_error: "Order date is required",
  }),
  expectedDeliveryDate: z.date().optional(),
  status: z.string({
    required_error: "Status is required",
  }).default("draft"),
  paymentStatus: z.string({
    required_error: "Payment status is required",
  }).default("unpaid"),
  shippingAddress: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;

interface PurchaseOrderFormProps {
  orderToEdit?: PurchaseOrderFormValues & { 
    id?: number; 
    orderNumber?: string;
    vendorName?: string; 
  };
  onClose: () => void;
}

export function PurchaseOrderForm({ orderToEdit, onClose }: PurchaseOrderFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);

  // Query for vendor data
  const { data: vendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['/api/business/vendors'],
  });

  // Query for inventory items data
  const { data: inventoryItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/business/inventory'],
  });

  // Calculate total for form display
  const calculateOrderTotal = (items: any[]) => {
    return items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
  };

  // Get default values for form
  const defaultValues: Partial<PurchaseOrderFormValues> = {
    vendorId: orderToEdit?.vendorId,
    orderDate: orderToEdit?.orderDate ? new Date(orderToEdit.orderDate) : new Date(),
    expectedDeliveryDate: orderToEdit?.expectedDeliveryDate 
      ? new Date(orderToEdit.expectedDeliveryDate) 
      : undefined,
    status: orderToEdit?.status || "draft",
    paymentStatus: orderToEdit?.paymentStatus || "unpaid",
    shippingAddress: orderToEdit?.shippingAddress || "",
    notes: orderToEdit?.notes || "",
    items: orderToEdit?.items?.length 
      ? orderToEdit.items.map(item => ({
          itemId: item.itemId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice
        }))
      : [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
  };

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues,
  });

  // Field array for items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Watch all items to calculate totals
  const watchItems = form.watch("items");
  const orderTotal = calculateOrderTotal(watchItems || []);

  // Update item total when quantity or price changes
  const updateItemTotal = (index: number) => {
    const items = form.getValues("items");
    const item = items[index];
    const total = item.quantity * item.unitPrice;
    form.setValue(`items.${index}.total`, total);
  };

  // Mutation for creating/updating purchase order
  const mutation = useMutation({
    mutationFn: async (values: PurchaseOrderFormValues) => {
      // Process the items to ensure totals are calculated
      const processedItems = values.items.map(item => ({
        ...item,
        total: item.quantity * item.unitPrice
      }));

      // Calculate total order amount
      const totalAmount = processedItems.reduce((sum, item) => sum + (item.total || 0), 0);

      const data = {
        ...values,
        items: processedItems,
        totalAmount, // Total in cents
      };

      if (orderToEdit?.id) {
        // Update existing order
        return apiRequest('PATCH', `/api/business/purchase-orders/${orderToEdit.id}`, data);
      } else {
        // Create new order
        return apiRequest('POST', '/api/business/purchase-orders', data);
      }
    },
    onSuccess: () => {
      toast({
        title: orderToEdit?.id ? "Purchase order updated" : "Purchase order created",
        description: orderToEdit?.id
          ? "The purchase order has been updated successfully."
          : "A new purchase order has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/business/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/business/dashboard'] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${orderToEdit?.id ? "update" : "create"} purchase order. ${error.message}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: PurchaseOrderFormValues) {
    mutation.mutate(values);
  }

  function handleClose() {
    setIsOpen(false);
    onClose();
  }

  // Add a new empty item to the form
  const addItem = () => {
    append({ description: "", quantity: 1, unitPrice: 0, total: 0 });
  };

  // Format amount as currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {orderToEdit?.id 
              ? `Edit Purchase Order ${orderToEdit.orderNumber || '#' + orderToEdit.id}` 
              : "Create Purchase Order"}
          </DialogTitle>
          <DialogDescription>
            {orderToEdit?.id
              ? `Update details for this purchase order to ${orderToEdit.vendorName || 'vendor'}.`
              : "Fill out the details to create a new vendor purchase order."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Vendor Field */}
            <FormField
              control={form.control}
              name="vendorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(parseInt(val))}
                    value={field.value?.toString()}
                    disabled={vendorsLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vendor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* This would be populated from real vendor data in a real implementation */}
                      <SelectItem value="1">Pool Supply Warehouse</SelectItem>
                      <SelectItem value="2">Equipment Pros</SelectItem>
                      <SelectItem value="3">Pool Parts Direct</SelectItem>
                      <SelectItem value="4">Office Supplies Inc</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order Date Field */}
              <FormField
                control={form.control}
                name="orderDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Order Date</FormLabel>
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
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Expected Delivery Date Field */}
              <FormField
                control={form.control}
                name="expectedDeliveryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expected Delivery Date (Optional)</FormLabel>
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
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Field */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select order status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Status Field */}
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Shipping Address Field */}
            <FormField
              control={form.control}
              name="shippingAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shipping Address (Optional)</FormLabel>
                  <FormControl>
                    <GoogleAddressAutocomplete value={field.value || ""} onChange={(address) => field.onChange(address)} placeholder="Enter shipping address" />
                  </FormControl>
                  <FormMessage />
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
                      placeholder="Enter any additional notes for this order"
                      {...field}
                      value={field.value || ""}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Order Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel className="text-base">Order Items</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              </div>

              <Card>
                <CardContent className="p-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-center mb-4">
                      {/* Item Selection or Description */}
                      <div className="col-span-5">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="Item description" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Quantity */}
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type="number"
                                  min="1"
                                  placeholder="Qty"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(parseInt(e.target.value));
                                    updateItemTotal(index);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Price"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(parseFloat(e.target.value));
                                    updateItemTotal(index);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Item Total (calculated) */}
                      <div className="col-span-2 text-right font-medium">
                        {formatCurrency((watchItems[index]?.quantity || 0) * (watchItems[index]?.unitPrice || 0))}
                      </div>

                      {/* Remove Item Button */}
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => fields.length > 1 && remove(index)}
                          disabled={fields.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Order Total */}
                  <div className="border-t pt-4 flex justify-end">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Order Total</p>
                      <p className="text-lg font-bold">{formatCurrency(orderTotal)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

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
                {orderToEdit?.id ? "Update Order" : "Create Order"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}