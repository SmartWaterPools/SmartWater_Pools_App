import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { ChemicalPrice } from "@shared/schema";

const CHEMICAL_TYPES = [
  { value: 'liquid_chlorine', label: 'Liquid Chlorine' },
  { value: 'tablets', label: 'Tablets' },
  { value: 'muriatic_acid', label: 'Muriatic Acid' },
  { value: 'soda_ash', label: 'Soda Ash' },
  { value: 'sodium_bicarbonate', label: 'Sodium Bicarbonate' },
  { value: 'calcium_chloride', label: 'Calcium Chloride' },
  { value: 'stabilizer', label: 'Stabilizer/CYA' },
  { value: 'algaecide', label: 'Algaecide' },
  { value: 'salt', label: 'Salt' },
  { value: 'phosphate_remover', label: 'Phosphate Remover' },
  { value: 'other', label: 'Other' },
];

const UNITS = ['gallon', 'oz', 'liter', 'lb', 'kg', 'tablet', 'unit'];

const chemicalPriceFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  chemicalType: z.string().min(1, "Chemical type is required"),
  unit: z.string().min(1, "Unit is required"),
  unitCostDollars: z.coerce.number().min(0, "Cost must be positive"),
  isActive: z.boolean().default(true),
});

type ChemicalPriceFormValues = z.infer<typeof chemicalPriceFormSchema>;

function getChemicalLabel(value: string): string {
  return CHEMICAL_TYPES.find(t => t.value === value)?.label || value;
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default function ChemicalPricing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<ChemicalPrice | null>(null);

  const { data: prices = [], isLoading } = useQuery<ChemicalPrice[]>({
    queryKey: ['/api/chemical-prices'],
  });

  const form = useForm<ChemicalPriceFormValues>({
    resolver: zodResolver(chemicalPriceFormSchema),
    defaultValues: {
      name: "",
      chemicalType: "",
      unit: "",
      unitCostDollars: 0,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ChemicalPriceFormValues) => {
      const { unitCostDollars, ...rest } = values;
      const payload = { ...rest, unitCostCents: Math.round(unitCostDollars * 100) };
      return apiRequest('POST', '/api/chemical-prices', payload);
    },
    onSuccess: () => {
      toast({ title: "Chemical price created" });
      queryClient.invalidateQueries({ queryKey: ['/api/chemical-prices'] });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: ChemicalPriceFormValues }) => {
      const { unitCostDollars, ...rest } = values;
      const payload = { ...rest, unitCostCents: Math.round(unitCostDollars * 100) };
      return apiRequest('PATCH', `/api/chemical-prices/${id}`, payload);
    },
    onSuccess: () => {
      toast({ title: "Chemical price updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/chemical-prices'] });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/chemical-prices/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Chemical price deleted" });
      queryClient.invalidateQueries({ queryKey: ['/api/chemical-prices'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingPrice(null);
    form.reset({ name: "", chemicalType: "", unit: "", unitCostDollars: 0, isActive: true });
  }

  function openEditDialog(price: ChemicalPrice) {
    setEditingPrice(price);
    form.reset({
      name: price.name,
      chemicalType: price.chemicalType,
      unit: price.unit,
      unitCostDollars: price.unitCostCents / 100,
      isActive: price.isActive,
    });
    setDialogOpen(true);
  }

  function onSubmit(values: ChemicalPriceFormValues) {
    if (editingPrice) {
      updateMutation.mutate({ id: editingPrice.id, values });
    } else {
      createMutation.mutate(values);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Chemical Pricing</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingPrice(null); form.reset({ name: "", chemicalType: "", unit: "", unitCostDollars: 0, isActive: true }); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Chemical Price
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPrice ? "Edit Chemical Price" : "Add Chemical Price"}</DialogTitle>
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
                        <Input placeholder="e.g., Liquid Chlorine - 1 Gallon" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="chemicalType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chemical Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CHEMICAL_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitCostDollars"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost per Unit ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel className="text-sm font-medium">Active</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving..." : editingPrice ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : prices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No chemical prices configured</p>
          <p className="text-sm">Add your first chemical price to get started.</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Cost per Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((price) => (
                <TableRow key={price.id}>
                  <TableCell className="font-medium">{price.name}</TableCell>
                  <TableCell>{getChemicalLabel(price.chemicalType)}</TableCell>
                  <TableCell>{price.unit}</TableCell>
                  <TableCell>${centsToDollars(price.unitCostCents)}</TableCell>
                  <TableCell>
                    <Badge variant={price.isActive ? "default" : "secondary"}>
                      {price.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(price)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(price.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}