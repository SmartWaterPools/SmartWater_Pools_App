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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash, Edit, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const taxTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  rate: z.number().min(0, "Rate must be 0 or greater").max(100, "Rate cannot exceed 100"),
  state: z.string().optional().default(""),
  region: z.string().optional().default(""),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type TaxTemplateFormValues = z.infer<typeof taxTemplateSchema>;

interface TaxTemplate {
  id: number;
  name: string;
  rate: number;
  state: string | null;
  region: string | null;
  isDefault: boolean | null;
  isActive: boolean | null;
  organizationId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export function TaxTemplates() {
  const [open, setOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaxTemplate | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: templates = [],
    isLoading,
  } = useQuery<TaxTemplate[]>({
    queryKey: ["/api/tax-templates"],
  });

  const form = useForm<TaxTemplateFormValues>({
    resolver: zodResolver(taxTemplateSchema),
    defaultValues: {
      name: "",
      rate: 0,
      state: "",
      region: "",
      isDefault: false,
      isActive: true,
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset({
        name: "",
        rate: 0,
        state: "",
        region: "",
        isDefault: false,
        isActive: true,
      });
      setEditingTemplate(null);
    }
    setOpen(isOpen);
  };

  const mutation = useMutation({
    mutationFn: async (values: TaxTemplateFormValues) => {
      if (editingTemplate) {
        return await apiRequest("PATCH", `/api/tax-templates/${editingTemplate.id}`, values);
      } else {
        return await apiRequest("POST", "/api/tax-templates", values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-templates"] });
      setOpen(false);
      toast({
        title: editingTemplate ? "Template updated" : "Template created",
        description: editingTemplate
          ? "Tax template has been updated successfully"
          : "New tax template has been created",
      });
      setEditingTemplate(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save tax template",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/tax-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-templates"] });
      toast({
        title: "Template deleted",
        description: "Tax template has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tax template",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (template: TaxTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      rate: template.rate,
      state: template.state || "",
      region: template.region || "",
      isDefault: template.isDefault ?? false,
      isActive: template.isActive ?? true,
    });
    setOpen(true);
  };

  const onSubmit = (data: TaxTemplateFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle>Tax Templates</CardTitle>
            <CardDescription className="mt-1">
              Manage tax rates for invoices and estimates. Configure default rates by state and region.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="default" className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Tax Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Edit Tax Template" : "Create Tax Template"}</DialogTitle>
                <DialogDescription>
                  {editingTemplate
                    ? "Update an existing tax template"
                    : "Create a new tax template for invoices and estimates"}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Sales Tax" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="8.25"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                          />
                        </FormControl>
                        <FormDescription>Tax rate as a percentage</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="TX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Region</FormLabel>
                          <FormControl>
                            <Input placeholder="Dallas County" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Default</FormLabel>
                          <FormDescription>
                            Use this as the default tax rate
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>
                            Enable or disable this tax template
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingTemplate ? "Update" : "Create"}
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
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No tax templates yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rate (%)</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{template.rate}%</TableCell>
                    <TableCell>{template.state || "—"}</TableCell>
                    <TableCell>{template.region || "—"}</TableCell>
                    <TableCell>
                      {template.isDefault ? (
                        <Badge variant="default">Default</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {template.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(template.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}