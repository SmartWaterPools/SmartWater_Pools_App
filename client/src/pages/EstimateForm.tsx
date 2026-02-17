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
  inventoryItemId: z.coerce.number().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0").default(1),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or greater").default(0),
  itemType: z.string().optional(),
});

const estimateFormSchema = z.object({
  clientId: z.coerce.number({
    required_error: "Client is required",
  }).min(1, "Please select a client"),
  estimateNumber: z.string().min(1, "Estimate number is required"),
  issueDate: z.date({
    required_error: "Issue date is required",
  }),
  expiryDate: z.date({
    required_error: "Expiry date is required",
  }),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  depositType: z.string().default("none"),
  depositPercent: z.coerce.number().min(0).max(100).optional(),
  depositAmount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

type EstimateFormValues = z.infer<typeof estimateFormSchema>;

type Client = {
  id: number;
  userId: number;
  billingState?: string | null;
  user?: { name: string; email: string };
};

type EstimateWithItems = {
  id: number;
  clientId: number;
  estimateNumber: string;
  status: string;
  issueDate: string;
  expiryDate: string | null;
  taxRate: string | null;
  discountPercent: string | null;
  discountAmount: number | null;
  subtotal: number;
  taxAmount: number | null;
  total: number;
  depositType: string | null;
  depositPercent: string | null;
  depositAmount: number | null;
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

type TaxTemplate = {
  id: number;
  name: string;
  state: string;
  rate: string;
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
  converted: "bg-indigo-100 text-indigo-700",
};

export default function EstimateForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const [isEditMode] = useRoute("/estimates/:id/edit");

  const estimateId = params.id ? parseInt(params.id) : undefined;
  const isEditing = isEditMode && estimateId;

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const { data: nextNumber } = useQuery<{ estimateNumber: string }>({
    queryKey: ['/api/estimates/next-number'],
    enabled: !isEditing,
  });

  const { data: existingEstimate, isLoading: estimateLoading } = useQuery<EstimateWithItems>({
    queryKey: ['/api/estimates', estimateId],
    enabled: !!isEditing,
  });

  const { data: inventoryItems } = useQuery<any[]>({
    queryKey: ['/api/inventory/items'],
  });

  const { data: allTaxTemplates } = useQuery<TaxTemplate[]>({
    queryKey: ['/api/tax-templates'],
  });

  const today = new Date();
  const defaultExpiryDate = addDays(today, 30);

  const form = useForm<EstimateFormValues>({
    resolver: zodResolver(estimateFormSchema),
    defaultValues: {
      clientId: 0,
      estimateNumber: "",
      issueDate: today,
      expiryDate: defaultExpiryDate,
      taxRate: 0,
      discountPercent: undefined,
      discountAmount: undefined,
      depositType: "none",
      depositPercent: undefined,
      depositAmount: undefined,
      notes: "",
      terms: "",
      items: [{ inventoryItemId: undefined, description: "", quantity: 1, unitPrice: 0, itemType: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedClientId = form.watch("clientId");
  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === watchedClientId);
  }, [clients, watchedClientId]);

  const { data: taxTemplates } = useQuery<TaxTemplate[]>({
    queryKey: ['/api/tax-templates/by-state', selectedClient?.billingState],
    enabled: !!selectedClient?.billingState,
  });

  useEffect(() => {
    if (taxTemplates && taxTemplates.length > 0 && !isEditing) {
      const rate = parseFloat(taxTemplates[0].rate || "0");
      if (rate > 0) {
        form.setValue("taxRate", rate);
      }
    }
  }, [taxTemplates, isEditing, form]);

  useEffect(() => {
    if (nextNumber && !isEditing) {
      form.setValue("estimateNumber", nextNumber.estimateNumber);
    }
  }, [nextNumber, isEditing, form]);

  useEffect(() => {
    if (existingEstimate && isEditing) {
      form.reset({
        clientId: existingEstimate.clientId,
        estimateNumber: existingEstimate.estimateNumber,
        issueDate: new Date(existingEstimate.issueDate),
        expiryDate: existingEstimate.expiryDate ? new Date(existingEstimate.expiryDate) : defaultExpiryDate,
        taxRate: parseFloat(existingEstimate.taxRate || "0"),
        discountPercent: existingEstimate.discountPercent ? parseFloat(existingEstimate.discountPercent) : undefined,
        discountAmount: existingEstimate.discountAmount ? existingEstimate.discountAmount / 100 : undefined,
        depositType: existingEstimate.depositType || "none",
        depositPercent: existingEstimate.depositPercent ? parseFloat(existingEstimate.depositPercent) : undefined,
        depositAmount: existingEstimate.depositAmount ? existingEstimate.depositAmount / 100 : undefined,
        notes: existingEstimate.notes || "",
        terms: existingEstimate.terms || "",
        items: existingEstimate.items.map(item => ({
          inventoryItemId: item.inventoryItemId || undefined,
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: item.unitPrice / 100,
          itemType: item.itemType || "",
        })),
      });
    }
  }, [existingEstimate, isEditing, form]);

  const watchedItems = form.watch("items");
  const watchedTaxRate = form.watch("taxRate");
  const watchedDiscountPercent = form.watch("discountPercent");
  const watchedDiscountAmount = form.watch("discountAmount");
  const watchedDepositType = form.watch("depositType");
  const watchedDepositPercent = form.watch("depositPercent");
  const watchedDepositAmount = form.watch("depositAmount");

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

    let depositCalc = 0;
    if (watchedDepositType === "percentage" && watchedDepositPercent) {
      depositCalc = total * (watchedDepositPercent / 100);
    } else if (watchedDepositType === "fixed" && watchedDepositAmount) {
      depositCalc = watchedDepositAmount;
    }

    return {
      subtotal,
      discount,
      taxAmount,
      total,
      depositCalc,
    };
  }, [watchedItems, watchedTaxRate, watchedDiscountPercent, watchedDiscountAmount, watchedDepositType, watchedDepositPercent, watchedDepositAmount]);

  const createMutation = useMutation({
    mutationFn: async (data: { estimate: any; sendAfterSave: boolean }) => {
      const response = await apiRequest("POST", "/api/estimates", data.estimate);
      const createdEstimate = await response.json();

      let sendResult = null;
      if (data.sendAfterSave) {
        try {
          const sendResponse = await apiRequest("POST", `/api/estimates/${createdEstimate.id}/send`);
          sendResult = await sendResponse.json();
        } catch (sendError) {
          sendResult = { emailSent: false, emailWarning: "Failed to send email. The estimate was saved but could not be sent." };
        }
      }

      return { ...createdEstimate, sendResult, wasSendRequested: data.sendAfterSave };
    },
    onSuccess: (result) => {
      const { sendResult, wasSendRequested, ...estimate } = result;
      if (wasSendRequested && sendResult) {
        if (sendResult.emailSent) {
          toast({
            title: "Estimate sent",
            description: `Estimate ${estimate.estimateNumber} has been created and emailed to the client.`,
          });
        } else {
          toast({
            title: "Estimate created",
            description: sendResult.emailWarning || "Estimate was saved but the email could not be sent. Please check your Gmail connection in Settings.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Estimate created",
          description: `Estimate ${estimate.estimateNumber} has been saved as a draft.`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/estimates'] });
      setLocation(`/estimates`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create estimate: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { estimate: any; sendAfterSave: boolean }) => {
      const response = await apiRequest("PATCH", `/api/estimates/${estimateId}`, data.estimate);
      const updatedEstimate = await response.json();

      let sendResult = null;
      if (data.sendAfterSave && existingEstimate?.status === 'draft') {
        try {
          const sendResponse = await apiRequest("POST", `/api/estimates/${estimateId}/send`);
          sendResult = await sendResponse.json();
        } catch (sendError) {
          sendResult = { emailSent: false, emailWarning: "Failed to send email. The estimate was saved but could not be sent." };
        }
      }

      return { ...updatedEstimate, sendResult, wasSendRequested: data.sendAfterSave };
    },
    onSuccess: (result) => {
      const { sendResult, wasSendRequested, ...estimate } = result;
      if (wasSendRequested && sendResult) {
        if (sendResult.emailSent) {
          toast({
            title: "Estimate sent",
            description: `Estimate ${estimate.estimateNumber} has been updated and emailed to the client.`,
          });
        } else {
          toast({
            title: "Estimate updated",
            description: sendResult.emailWarning || "Estimate was saved but the email could not be sent. Please check your Gmail connection in Settings.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Estimate updated",
          description: `Estimate ${estimate.estimateNumber} has been updated successfully.`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/estimates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/estimates', estimateId] });
      setLocation(`/estimates`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update estimate: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: EstimateFormValues, sendAfterSave: boolean = false) => {
    let depositAmountCents = 0;
    if (values.depositType === "percentage" && values.depositPercent) {
      depositAmountCents = Math.round(calculatedTotals.total * (values.depositPercent / 100) * 100);
    } else if (values.depositType === "fixed" && values.depositAmount) {
      depositAmountCents = Math.round(values.depositAmount * 100);
    }

    const estimateData = {
      clientId: values.clientId,
      estimateNumber: values.estimateNumber,
      issueDate: format(values.issueDate, "yyyy-MM-dd"),
      expiryDate: format(values.expiryDate, "yyyy-MM-dd"),
      taxRate: values.taxRate?.toString() || "0",
      discountPercent: values.discountPercent?.toString() || null,
      discountAmount: values.discountAmount ? Math.round(values.discountAmount * 100) : 0,
      depositType: values.depositType || "none",
      depositPercent: values.depositPercent?.toString() || null,
      depositAmount: depositAmountCents,
      notes: values.notes || null,
      terms: values.terms || null,
      items: values.items.map(item => ({
        inventoryItemId: item.inventoryItemId || null,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: Math.round(item.unitPrice * 100),
        itemType: item.itemType || null,
      })),
    };

    if (isEditing) {
      updateMutation.mutate({ estimate: estimateData, sendAfterSave });
    } else {
      createMutation.mutate({ estimate: estimateData, sendAfterSave });
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

  if (isEditing && estimateLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/estimates')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Edit Estimate" : "New Estimate"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? `Editing estimate ${existingEstimate?.estimateNumber}`
              : "Create a new estimate for your client"
            }
          </p>
        </div>
        {isEditing && existingEstimate && (
          <Badge className={statusColors[existingEstimate.status || 'draft']}>
            {existingEstimate.status?.charAt(0).toUpperCase() + existingEstimate.status?.slice(1)}
          </Badge>
        )}
      </div>

      <Form {...form}>
        <form className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estimate Details</CardTitle>
              <CardDescription>Basic estimate information</CardDescription>
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
                  name="estimateNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimate Number *</FormLabel>
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
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expiry Date *</FormLabel>
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
              <CardDescription>Add products or services to this estimate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="hidden md:grid md:grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-2">
                <div className="col-span-3">Item</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Unit Price ($)</div>
                <div className="col-span-1 text-right">Amount</div>
                <div className="col-span-1"></div>
              </div>

              {fields.map((field, index) => {
                const qty = form.watch(`items.${index}.quantity`) || 0;
                const price = form.watch(`items.${index}.unitPrice`) || 0;
                const lineAmount = qty * price;

                return (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start p-2 border rounded-md">
                    <div className="col-span-1 md:col-span-3">
                      <FormLabel className="md:hidden">Item</FormLabel>
                      <Select
                        value={form.watch(`items.${index}.inventoryItemId`)?.toString() || ""}
                        onValueChange={(value) => {
                          if (value === "custom") {
                            form.setValue(`items.${index}.inventoryItemId`, undefined);
                            return;
                          }
                          const itemId = parseInt(value);
                          form.setValue(`items.${index}.inventoryItemId`, itemId);
                          const selectedItem = inventoryItems?.find((item: any) => item.id === itemId);
                          if (selectedItem) {
                            form.setValue(`items.${index}.description`, selectedItem.name + (selectedItem.description ? ` - ${selectedItem.description}` : ''));
                            form.setValue(`items.${index}.unitPrice`, selectedItem.unitPrice ? selectedItem.unitPrice / 100 : 0);
                            form.setValue(`items.${index}.itemType`, selectedItem.category || 'product');
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom Item</SelectItem>
                          {inventoryItems?.filter((item: any) => item.isActive !== false).map((item: any) => (
                            <SelectItem key={item.id} value={item.id.toString()}>
                              {item.name} {item.sku ? `(${item.sku})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-3">
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

                    <div className="col-span-1 md:col-span-1 flex items-center justify-end md:h-10">
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
                onClick={() => append({ inventoryItemId: undefined, description: "", quantity: 1, unitPrice: 0, itemType: "" })}
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
                <div>
                  <FormLabel className="text-sm font-medium">Tax Template</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      const template = allTaxTemplates?.find((t: any) => t.id.toString() === value);
                      if (template) {
                        form.setValue("taxRate", parseFloat(template.rate));
                      }
                    }}
                  >
                    <SelectTrigger className="mb-2">
                      <SelectValue placeholder="Select tax template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allTaxTemplates?.filter((t: any) => t.isActive !== false).map((t: any) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.name} ({t.rate}%) {t.state ? `- ${t.state}` : ''}
                        </SelectItem>
                      ))}
                      {(!allTaxTemplates || allTaxTemplates.length === 0) && (
                        <SelectItem value="none" disabled>No tax templates available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
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
                </div>

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
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deposit</CardTitle>
              <CardDescription>Configure deposit requirements for this estimate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="depositType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deposit Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select deposit type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Deposit</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedDepositType === "percentage" && (
                  <FormField
                    control={form.control}
                    name="depositPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit Percentage (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {watchedDepositType === "fixed" && (
                  <FormField
                    control={form.control}
                    name="depositAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit Amount ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {watchedDepositType !== "none" && calculatedTotals.depositCalc > 0 && (
                <div className="flex justify-end">
                  <div className="w-full md:w-80 p-3 bg-muted rounded-md">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Calculated Deposit</span>
                      <span>{formatCurrency(calculatedTotals.depositCalc)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes & Terms</CardTitle>
              <CardDescription>Additional information for this estimate</CardDescription>
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
              onClick={() => setLocation('/estimates')}
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
              {isEditing && existingEstimate?.status !== 'draft' ? 'Save' : 'Save & Send'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
