import React, { useState } from "react";
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
import { Trash, Edit, Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ServiceTemplate } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

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
});

type ServiceTemplateFormValues = z.infer<typeof serviceTemplateSchema>;

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
      type: "pool_service",
      description: "",
      isDefault: false,
      checklistItems: [
        { id: crypto.randomUUID(), text: "Check water chemistry", required: true },
        { id: crypto.randomUUID(), text: "Clean skimmer basket", required: true },
        { id: crypto.randomUUID(), text: "Clean pump basket", required: true },
      ],
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

  // Edit template
  const handleEdit = (template: ServiceTemplate) => {
    // Parse the checklist items from string array to our expected format
    const checklistItems = template.checklistItems || [];
    const formattedItems = checklistItems.map((item, index) => ({
      id: `item-${index}`,
      text: item,
      required: true,
    }));

    setEditingTemplate(template);
    form.reset({
      name: template.name,
      type: template.type,
      description: template.description || "",
      isDefault: template.isDefault === null ? false : template.isDefault,
      checklistItems: formattedItems,
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
    // Convert the checklist items to the format expected by the backend
    const formattedData = {
      ...data,
      checklistItems: data.checklistItems.map(item => item.text),
    };
    mutation.mutate(formattedData as any);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Service Templates</h2>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>
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

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pool_service">Pool Service</SelectItem>
                          <SelectItem value="hot_tub_service">Hot Tub Service</SelectItem>
                          <SelectItem value="combined_service">Combined Service</SelectItem>
                          <SelectItem value="startup_service">Startup Service</SelectItem>
                          <SelectItem value="closing_service">Closing Service</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The type of service this template is for
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                      <FormDescription>
                        A detailed description of what this service template is used for
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-pulse">Loading templates...</div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-800 p-4 rounded-md">
          Error loading templates. Please try again.
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <div className="text-gray-500 mb-4">No service templates created yet</div>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {template.type.replace("_", " ")}
                    </CardDescription>
                  </div>
                  {template.isDefault && (
                    <Badge variant="default" className="ml-2">
                      Default
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="text-gray-500 mb-4">{template.description || "No description"}</p>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Checklist Items:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {(template.checklistItems || []).slice(0, 3).map((item, i) => (
                      <li key={i} className="text-sm text-gray-700">{item}</li>
                    ))}
                    {(template.checklistItems || []).length > 3 && (
                      <li className="text-sm text-gray-500 italic">
                        +{(template.checklistItems || []).length - 3} more items
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-2">
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
    </div>
  );
}