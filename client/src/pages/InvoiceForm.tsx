import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation, useRoute } from "wouter";
import { format, addDays } from "date-fns";
import { CalendarIcon, Loader2, Plus, Trash2, ArrowLeft, Send, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0").default(1),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or greater").default(0),
  itemType: z.string().optional(),
});

const invoiceFormSchema = z.object({
  clientId: z.coerce.number({
    required_error: "Client is required",
  }).min(1, "Please select a client"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  issueDate: z.date({
    required_error: "Issue date is required",
  }),
  dueDate: z.date({
    required_error: "Due date is required",
  }),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

type Client = {
  id: number;
  userId: number;
  user?: { name: string; email: string };
};

type InvoiceWithItems = {
  id: number;
  clientId: number;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  taxRate: string | null;
  discountPercent: string | null;
  discountAmount: number | null;
  subtotal: number;
  taxAmount: number | null;
  total: number;
  amountPaid: number | null;
  amountDue: number;
  notes: string | null;
  terms: string | null;
  items: {
    id: number;
    description: string;
    quantity: string;
    unitPrice: number;
    amount: number;
    itemType: string | null;
  }[];
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  partial: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500 line-through",
};

export default function InvoiceForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const [isEditMode] = useRoute("/invoices/:id/edit");
  
  const invoiceId = params.id ? parseInt(params.id) : undefined;
  const isEditing = isEditMode && invoiceId;

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const { data: nextNumber } = useQuery<{ invoiceNumber: string }>({
    queryKey: ['/api/invoices/next-number'],
    enabled: !isEditing,
  });

  const { data: existingInvoice, isLoading: invoiceLoading } = useQuery<InvoiceWithItems>({
    queryKey: ['/api/invoices', invoiceId],
    enabled: !!isEditing,
  });

  const today = new Date();
  const defaultDueDate = addDays(today, 30);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientId: 0,
      invoiceNumber: "",
      issueDate: today,
      dueDate: defaultDueDate,
      taxRate: 0,
      discountPercent: undefined,
      discountAmount: undefined,
      notes: "",
      terms: "",
      items: [{ description: "", quantity: 1, unitPrice: 0, itemType: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (nextNumber && !isEditing) {
      form.setValue("invoiceNumber", nextNumber.invoiceNumber);
    }
  }, [nextNumber, isEditing, form]);

  useEffect(() => {
    if (existingInvoice && isEditing) {
      form.reset({
        clientId: existingInvoice.clientId,
        invoiceNumber: existingInvoice.invoiceNumber,
        issueDate: new Date(existingInvoice.issueDate),
        dueDate: new Date(existingInvoice.dueDate),
        taxRate: parseFloat(existingInvoice.taxRate || "0"),
        discountPercent: existingInvoice.discountPercent ? parseFloat(existingInvoice.discountPercent) : undefined,
        discountAmount: existingInvoice.discountAmount ? existingInvoice.discountAmount / 100 : undefined,
        notes: existingInvoice.notes || "",
        terms: existingInvoice.terms || "",
        items: existingInvoice.items.map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: item.unitPrice / 100,
          itemType: item.itemType || "",
        })),
      });
    }
  }, [existingInvoice, isEditing, form]);

  const watchedItems = form.watch("items");
  const watchedTaxRate = form.watch("taxRate");
  const watchedDiscountPercent = form.watch("discountPercent");
  const watchedDiscountAmount = form.watch("discountAmount");

  const calculatedTotals = useMemo(() => {
    const subtotal = watchedItems.reduce((sum, item) => {
      const qty = item.quantity || 0;
      const price = item.unitPrice || 0;
      return sum + (qty * price);
    }, 0);

    let discount = 0;
    if (watchedDiscountPercent) {
      discount = subtotal * (watchedDiscountPercent / 100);
    } else if (watchedDiscountAmount) {
      discount = watchedDiscountAmount;
    }

    const afterDiscount = subtotal - discount;
    const taxAmount = afterDiscount * ((watchedTaxRate || 0) / 100);
    const total = afterDiscount + taxAmount;

    return {
      subtotal,
      discount,
      taxAmount,
      total,
    };
  }, [watchedItems, watchedTaxRate, watchedDiscountPercent, watchedDiscountAmount]);

  const createMutation = useMutation({
    mutationFn: async (data: { invoice: any; sendAfterSave: boolean }) => {
      const response = await apiRequest("POST", "/api/invoices", data.invoice);
      const createdInvoice = await response.json();
      
      if (data.sendAfterSave) {
        await apiRequest("POST", `/api/invoices/${createdInvoice.id}/send`);
      }
      
      return createdInvoice;
    },
    onSuccess: (invoice) => {
      toast({
        title: "Invoice created",
        description: `Invoice ${invoice.invoiceNumber} has been created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setLocation(`/invoices`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create invoice: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { invoice: any; sendAfterSave: boolean }) => {
      const response = await apiRequest("PATCH", `/api/invoices/${invoiceId}`, data.invoice);
      const updatedInvoice = await response.json();
      
      if (data.sendAfterSave && existingInvoice?.status === 'draft') {
        await apiRequest("POST", `/api/invoices/${invoiceId}/send`);
      }
      
      return updatedInvoice;
    },
    onSuccess: (invoice) => {
      toast({
        title: "Invoice updated",
        description: `Invoice ${invoice.invoiceNumber} has been updated successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId] });
      setLocation(`/invoices`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update invoice: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: InvoiceFormValues, sendAfterSave: boolean = false) => {
    const invoiceData = {
      clientId: values.clientId,
      invoiceNumber: values.invoiceNumber,
      issueDate: format(values.issueDate, "yyyy-MM-dd"),
      dueDate: format(values.dueDate, "yyyy-MM-dd"),
      taxRate: values.taxRate?.toString() || "0",
      discountPercent: values.discountPercent?.toString() || null,
      discountAmount: values.discountAmount ? Math.round(values.discountAmount * 100) : 0,
      notes: values.notes || null,
      terms: values.terms || null,
      items: values.items.map(item => ({
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: Math.round(item.unitPrice * 100),
        itemType: item.itemType || null,
      })),
    };

    if (isEditing) {
      updateMutation.mutate({ invoice: invoiceData, sendAfterSave });
    } else {
      createMutation.mutate({ invoice: invoiceData, sendAfterSave });
    }
  };

  const handleSaveDraft = () => {
    form.handleSubmit((values) => onSubmit(values, false))();
  };

  const handleSaveAndSend = () => {
    form.handleSubmit((values) => onSubmit(values, true))();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditing && invoiceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/invoices')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Edit Invoice" : "New Invoice"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing 
              ? `Editing invoice ${existingInvoice?.invoiceNumber}`
              : "Create a new invoice for your client"
            }
          </p>
        </div>
        {isEditing && existingInvoice && (
          <Badge className={statusColors[existingInvoice.status || 'draft']}>
            {existingInvoice.status?.charAt(0).toUpperCase() + existingInvoice.status?.slice(1)}
          </Badge>
        )}
      </div>

      <Form {...form}>
        <form className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>Basic invoice information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value?.toString() || ""}
                        disabled={clientsLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.user?.name || `Client #${client.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          readOnly={isEditing}
                          className={isEditing ? "bg-muted" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Issue Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>Add products or services to this invoice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="hidden md:grid md:grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-2">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Unit Price ($)</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1"></div>
              </div>

              {fields.map((field, index) => {
                const qty = form.watch(`items.${index}.quantity`) || 0;
                const price = form.watch(`items.${index}.unitPrice`) || 0;
                const lineAmount = qty * price;

                return (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start p-2 border rounded-md">
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-5">
                          <FormLabel className="md:hidden">Description *</FormLabel>
                          <FormControl>
                            <Input placeholder="Item description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel className="md:hidden">Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              min="0.01" 
                              placeholder="1"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel className="md:hidden">Unit Price ($)</FormLabel>
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

                    <div className="col-span-1 md:col-span-2 flex items-center justify-end md:h-10">
                      <span className="text-sm font-medium">{formatCurrency(lineAmount)}</span>
                    </div>

                    <div className="col-span-1 md:col-span-1 flex items-center justify-end md:h-10">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={() => append({ description: "", quantity: 1, unitPrice: 0, itemType: "" })}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Line Item
              </Button>

              <Separator className="my-4" />

              <div className="flex justify-end">
                <div className="w-full md:w-80 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(calculatedTotals.subtotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totals & Discounts</CardTitle>
              <CardDescription>Configure tax and discount settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <FormField
                  control={form.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          max="100"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discountPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          max="100"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          disabled={!!form.watch("discountAmount")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discountAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Amount ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ""}
                          disabled={!!form.watch("discountPercent")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end">
                <div className="w-full md:w-80 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(calculatedTotals.subtotal)}</span>
                  </div>
                  {calculatedTotals.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(calculatedTotals.discount)}</span>
                    </div>
                  )}
                  {calculatedTotals.taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({watchedTaxRate}%)</span>
                      <span>{formatCurrency(calculatedTotals.taxAmount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(calculatedTotals.total)}</span>
                  </div>
                  {isEditing && existingInvoice && (existingInvoice.amountPaid || 0) > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Amount Paid</span>
                        <span>-{formatCurrency((existingInvoice.amountPaid || 0) / 100)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-primary">
                        <span>Amount Due</span>
                        <span>{formatCurrency(existingInvoice.amountDue / 100)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes & Terms</CardTitle>
              <CardDescription>Additional information for this invoice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Notes visible to the client..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terms & Conditions</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Payment terms, policies, etc..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation('/invoices')}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={handleSaveAndSend}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isEditing && existingInvoice?.status !== 'draft' ? 'Save' : 'Save & Send'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
