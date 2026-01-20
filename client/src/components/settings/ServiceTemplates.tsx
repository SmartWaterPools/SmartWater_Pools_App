import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash, Edit, Plus, Clock, DollarSign, Calendar, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ServiceTemplate } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const TEMPLATE_CATEGORIES = [
  { value: "weekly_maintenance", label: "Weekly Maintenance" },
  { value: "biweekly_maintenance", label: "Bi-Weekly Maintenance" },
  { value: "filter_clean", label: "Filter Clean" },
  { value: "leak_detection", label: "Leak Detection" },
  { value: "equipment_repair", label: "Equipment Repair" },
  { value: "pool_construction", label: "Pool Construction" },
  { value: "tile_deck", label: "Tile & Deck" },
  { value: "automation", label: "Automation" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

const RECURRENCE_OPTIONS = [
  { value: "one_time", label: "One Time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "as_needed", label: "As Needed" },
] as const;

const SERVICE_TYPES = [
  { value: "maintenance", label: "Maintenance" },
  { value: "repair", label: "Repair" },
  { value: "construction", label: "Construction" },
  { value: "cleaning", label: "Cleaning" },
] as const;

// Define template item schema
const templateItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Checklist item cannot be empty"),
  required: z.boolean().default(true),
});

type TemplateItem = z.infer<typeof templateItemSchema>;

// Define template form schema
const serviceTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  type: z.string().min(1, "Template type is required"),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  checklistItems: z.array(templateItemSchema).min(1, "At least one checklist item is required"),
  estimatedDuration: z.number().min(0).optional().nullable(),
  defaultPriority: z.string().optional().nullable(),
  defaultLaborRate: z.number().min(0).optional().nullable(),
  recurrence: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
});

type ServiceTemplateFormValues = z.infer<typeof serviceTemplateSchema>;

const formatDuration = (minutes: number | null | undefined): string => {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
};

const formatCurrency = (cents: number | null | undefined): string => {
  if (!cents) return "";
  return `$${(cents / 100).toFixed(2)}`;
};

const getCategoryLabel = (category: string | null | undefined): string => {
  if (!category) return "";
  const found = TEMPLATE_CATEGORIES.find(c => c.value === category);
  return found ? found.label : category.replace(/_/g, " ");
};

const getPriorityBadgeVariant = (priority: string | null | undefined) => {
  switch (priority) {
    case "urgent": return "destructive";
    case "high": return "destructive";
    case "low": return "secondary";
    default: return "default";
  }
};

export function ServiceTemplates() {
  const [open, setOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ServiceTemplate | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch service templates
  const {
    data: templates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/service-templates"],
    select: (data: ServiceTemplate[]) => data,
  });

  // Mutation for creating/updating service template
  const mutation = useMutation({
    mutationFn: async (values: ServiceTemplateFormValues) => {
      if (editingTemplate) {
        // Update existing template
        return await apiRequest(
          `/api/service-templates/${editingTemplate.id}`, 
          "PATCH", 
          values
        );
      } else {
        // Create new template
        return await apiRequest(
          "/api/service-templates", 
          "POST", 
          values
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-templates"] });
      setOpen(false);
      toast({
        title: editingTemplate ? "Template updated" : "Template created",
        description: editingTemplate
          ? "Service template has been updated successfully"
          : "New service template has been created",
      });
      setEditingTemplate(null);
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/service-templates/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-templates"] });
      toast({
        title: "Template deleted",
        description: "Service template has been deleted successfully",
      });
    },
  });

  // Form setup
  const form = useForm<ServiceTemplateFormValues>({
    resolver: zodResolver(serviceTemplateSchema),
    defaultValues: {
      name: "",
      type: "maintenance",
      description: "",
      isDefault: false,
      checklistItems: [
        { id: crypto.randomUUID(), text: "Check water chemistry", required: true },
        { id: crypto.randomUUID(), text: "Clean skimmer basket", required: true },
        { id: crypto.randomUUID(), text: "Clean pump basket", required: true },
      ],
      estimatedDuration: null,
      defaultPriority: "medium",
      defaultLaborRate: null,
      recurrence: null,
      category: null,
    },
  });

  // Reset form when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setEditingTemplate(null);
    }
    setOpen(open);
  };

  // Helper to parse checklist items from JSON string
  // Handles both legacy string arrays and new object arrays
  const parseChecklistItems = (items: string | null | undefined): Array<{id: string; text: string; required?: boolean}> => {
    if (!items) return [];
    try {
      const parsed = typeof items === 'string' ? JSON.parse(items) : items;
      if (!Array.isArray(parsed)) return [];
      
      // Normalize items to always be objects with id, text, required
      return parsed.map((item: unknown, index: number) => {
        if (typeof item === 'string') {
          // Legacy format: plain strings
          return { id: `item-${index}`, text: item, required: true };
        }
        if (typeof item === 'object' && item !== null) {
          // New format: objects with id, text, required
          const obj = item as Record<string, unknown>;
          return {
            id: typeof obj.id === 'string' ? obj.id : `item-${index}`,
            text: typeof obj.text === 'string' ? obj.text : '',
            required: typeof obj.required === 'boolean' ? obj.required : true
          };
        }
        return { id: `item-${index}`, text: '', required: true };
      });
    } catch {
      return [];
    }
  };

  // Edit template
  const handleEdit = (template: ServiceTemplate) => {
    // Parse the checklist items - parseChecklistItems already normalizes the format
    const parsedItems = parseChecklistItems(template.checklistItems);

    setEditingTemplate(template);
    form.reset({
      name: template.name,
      type: template.type,
      description: template.description || "",
      isDefault: template.isDefault === null ? false : template.isDefault,
      checklistItems: parsedItems.length > 0 ? parsedItems : [
        { id: crypto.randomUUID(), text: "", required: true }
      ],
      estimatedDuration: template.estimatedDuration ?? null,
      defaultPriority: template.defaultPriority ?? "medium",
      defaultLaborRate: template.defaultLaborRate ?? null,
      recurrence: template.recurrence ?? null,
      category: template.category ?? null,
    });
    setOpen(true);
  };

  // Add a new checklist item
  const addChecklistItem = () => {
    const currentItems = form.getValues("checklistItems") || [];
    form.setValue("checklistItems", [
      ...currentItems,
      { id: crypto.randomUUID(), text: "", required: true },
    ]);
  };

  // Remove a checklist item
  const removeChecklistItem = (index: number) => {
    const currentItems = form.getValues("checklistItems");
    if (currentItems.length <= 1) {
      toast({
        title: "Cannot remove item",
        description: "You must have at least one checklist item",
        variant: "destructive",
      });
      return;
    }
    form.setValue(
      "checklistItems",
      currentItems.filter((_, i) => i !== index)
    );
  };

  // Form submission handler
  const onSubmit = (data: ServiceTemplateFormValues) => {
    // Send the full checklist items array - backend will handle JSON serialization
    mutation.mutate(data);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle>Work Order Templates</CardTitle>
            <CardDescription className="mt-1">
              Create job presets with default durations, labor rates, and checklists. 
              Use these templates to quickly create consistent work orders for common pool service tasks.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="default" className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
                <DialogDescription>
                  {editingTemplate
                    ? "Update an existing service template"
                    : "Create a new service template for technicians to use during maintenance visits"}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Weekly Pool Service" {...field} />
                        </FormControl>
                        <FormDescription>
                          A descriptive name for this service template
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SERVICE_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
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
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TEMPLATE_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Standard weekly pool maintenance service including chemistry checks and cleaning"
                            className="min-h-20"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="estimatedDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Duration (minutes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="60"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormDescription>Default time for this work order</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="defaultLaborRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Labor Rate ($/hr)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="75.00"
                              value={field.value ? (field.value / 100).toFixed(2) : ""}
                              onChange={(e) => field.onChange(e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null)}
                            />
                          </FormControl>
                          <FormDescription>Hourly rate in dollars</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="defaultPriority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Priority</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || "medium"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PRIORITY_OPTIONS.map((priority) => (
                                <SelectItem key={priority.value} value={priority.value}>
                                  {priority.label}
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
                      name="recurrence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recurrence</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select recurrence" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {RECURRENCE_OPTIONS.map((rec) => (
                                <SelectItem key={rec.value} value={rec.value}>
                                  {rec.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="h-4 w-4 mt-1"
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Default Template</FormLabel>
                          <FormDescription>
                            Make this the default template for this service type
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <FormLabel>Checklist Items</FormLabel>
                      <Button type="button" variant="outline" size="sm" onClick={addChecklistItem}>
                        <Plus className="h-4 w-4 mr-1" /> Add Item
                      </Button>
                    </div>

                    {form.watch("checklistItems")?.map((item, index) => (
                      <div key={item.id} className="flex items-start gap-2">
                        <FormField
                          control={form.control}
                          name={`checklistItems.${index}.text`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input placeholder="Checklist item" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`checklistItems.${index}.required`}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-1 mt-2">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-xs font-normal">Required</FormLabel>
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeChecklistItem(index)}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? "Saving..." : "Save Template"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-pulse">Loading templates...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-800 p-4 rounded-md">
            Error loading templates. Please try again.
          </div>
        ) : templates.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="text-gray-500 mb-4">No service templates created yet</div>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Template
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="capitalize">
                          {template.type?.replace(/_/g, " ") || "Service"}
                        </Badge>
                        {template.category && (
                          <Badge variant="secondary">
                            <Tag className="h-3 w-3 mr-1" />
                            {getCategoryLabel(template.category)}
                          </Badge>
                        )}
                        {template.defaultPriority && template.defaultPriority !== "medium" && (
                          <Badge variant={getPriorityBadgeVariant(template.defaultPriority) as "default" | "destructive" | "secondary"}>
                            {template.defaultPriority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {template.isDefault && (
                      <Badge variant="default" className="ml-2 shrink-0">
                        Default
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  {template.description && (
                    <p className="text-gray-500">{template.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {template.estimatedDuration && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDuration(template.estimatedDuration)}</span>
                      </div>
                    )}
                    {template.defaultLaborRate && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>{formatCurrency(template.defaultLaborRate)}/hr</span>
                      </div>
                    )}
                    {template.recurrence && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="capitalize">{template.recurrence.replace(/_/g, " ")}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <h4 className="font-medium text-xs text-muted-foreground">Checklist Items:</h4>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {parseChecklistItems(template.checklistItems).slice(0, 3).map((item, i) => (
                        <li key={i} className="text-sm text-gray-700">
                          {item.text}
                        </li>
                      ))}
                      {parseChecklistItems(template.checklistItems).length > 3 && (
                        <li className="text-sm text-gray-500 italic">
                          +{parseChecklistItems(template.checklistItems).length - 3} more items
                        </li>
                      )}
                    </ul>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 pt-2 border-t bg-muted/30">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this template?")) {
                        deleteMutation.mutate(template.id);
                      }
                    }}
                  >
                    <Trash className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}