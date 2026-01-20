import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Package, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WorkOrderItem, InventoryItem } from "@shared/schema";

interface WorkOrderItemsSectionProps {
  workOrderId: number;
  defaultLaborRate?: number;
}

interface PartFormData {
  inventoryItemId: number | null;
  name: string;
  description: string;
  quantity: string;
  unitCost: string;
  unitPrice: string;
}

interface LaborFormData {
  name: string;
  description: string;
  hours: string;
  rate: string;
}

const formatCurrency = (cents: number | null | undefined): string => {
  if (cents === null || cents === undefined) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
};

const parseCurrency = (value: string): number => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
};

export function WorkOrderItemsSection({ workOrderId, defaultLaborRate = 7500 }: WorkOrderItemsSectionProps) {
  const { toast } = useToast();
  const [partDialogOpen, setPartDialogOpen] = useState(false);
  const [laborDialogOpen, setLaborDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkOrderItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  
  const [partForm, setPartForm] = useState<PartFormData>({
    inventoryItemId: null,
    name: "",
    description: "",
    quantity: "1",
    unitCost: "",
    unitPrice: "",
  });
  
  const [laborForm, setLaborForm] = useState<LaborFormData>({
    name: "",
    description: "",
    hours: "1",
    rate: (defaultLaborRate / 100).toString(),
  });

  const { data: items, isLoading } = useQuery<WorkOrderItem[]>({
    queryKey: ["/api/work-orders", workOrderId, "items"],
  });

  const { data: inventoryItems } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const parts = items?.filter(item => item.itemType === "part") || [];
  const labor = items?.filter(item => item.itemType === "labor") || [];

  const createMutation = useMutation({
    mutationFn: async (data: Partial<WorkOrderItem>) => {
      const response = await apiRequest("POST", `/api/work-orders/${workOrderId}/items`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Item Added", description: "The item has been added successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "items"] });
      closeDialogs();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<WorkOrderItem> }) => {
      const response = await apiRequest("PATCH", `/api/work-orders/${workOrderId}/items/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Item Updated", description: "The item has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "items"] });
      closeDialogs();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await apiRequest("DELETE", `/api/work-orders/${workOrderId}/items/${itemId}`);
    },
    onSuccess: () => {
      toast({ title: "Item Deleted", description: "The item has been deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "items"] });
      setDeleteItemId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const closeDialogs = () => {
    setPartDialogOpen(false);
    setLaborDialogOpen(false);
    setEditingItem(null);
    resetPartForm();
    resetLaborForm();
  };

  const resetPartForm = () => {
    setPartForm({
      inventoryItemId: null,
      name: "",
      description: "",
      quantity: "1",
      unitCost: "",
      unitPrice: "",
    });
  };

  const resetLaborForm = () => {
    setLaborForm({
      name: "",
      description: "",
      hours: "1",
      rate: (defaultLaborRate / 100).toString(),
    });
  };

  const handleInventorySelect = (value: string) => {
    if (value === "custom") {
      setPartForm(prev => ({ ...prev, inventoryItemId: null, name: "", unitCost: "", unitPrice: "" }));
      return;
    }
    
    const item = inventoryItems?.find(i => i.id === parseInt(value));
    if (item) {
      setPartForm(prev => ({
        ...prev,
        inventoryItemId: item.id,
        name: item.name,
        description: item.description || "",
        unitCost: item.unitCost ? (item.unitCost / 100).toString() : "",
        unitPrice: item.unitPrice ? (item.unitPrice / 100).toString() : "",
      }));
    }
  };

  const handleAddPart = () => {
    resetPartForm();
    setEditingItem(null);
    setPartDialogOpen(true);
  };

  const handleEditPart = (item: WorkOrderItem) => {
    setEditingItem(item);
    setPartForm({
      inventoryItemId: item.inventoryItemId || null,
      name: item.name,
      description: item.description || "",
      quantity: item.quantity?.toString() || "1",
      unitCost: item.unitCost ? (item.unitCost / 100).toString() : "",
      unitPrice: item.unitPrice ? (item.unitPrice / 100).toString() : "",
    });
    setPartDialogOpen(true);
  };

  const handleAddLabor = () => {
    resetLaborForm();
    setEditingItem(null);
    setLaborDialogOpen(true);
  };

  const handleEditLabor = (item: WorkOrderItem) => {
    setEditingItem(item);
    const hours = item.quantity ? parseFloat(item.quantity.toString()) : 1;
    setLaborForm({
      name: item.name,
      description: item.description || "",
      hours: hours.toString(),
      rate: item.unitPrice ? (item.unitPrice / 100).toString() : (defaultLaborRate / 100).toString(),
    });
    setLaborDialogOpen(true);
  };

  const handleSavePart = () => {
    const quantity = parseFloat(partForm.quantity) || 1;
    const unitCost = parseCurrency(partForm.unitCost);
    const unitPrice = parseCurrency(partForm.unitPrice);
    
    const data = {
      itemType: "part" as const,
      inventoryItemId: partForm.inventoryItemId,
      name: partForm.name,
      description: partForm.description || null,
      quantity: quantity.toString(),
      unitCost,
      unitPrice,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleSaveLabor = () => {
    const hours = parseFloat(laborForm.hours) || 1;
    const rate = parseCurrency(laborForm.rate);
    
    const data = {
      itemType: "labor" as const,
      name: laborForm.name || "Labor",
      description: laborForm.description || null,
      quantity: hours.toString(),
      unitCost: rate,
      unitPrice: rate,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const calculateItemTotal = (item: WorkOrderItem): number => {
    const quantity = parseFloat(item.quantity?.toString() || "0");
    const price = item.unitPrice || 0;
    return quantity * price;
  };

  const totalPartsCost = parts.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const totalLaborCost = labor.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const grandTotal = totalPartsCost + totalLaborCost;

  const partTotal = (() => {
    const qty = parseFloat(partForm.quantity) || 0;
    const price = parseCurrency(partForm.unitPrice);
    return qty * price;
  })();

  const laborTotal = (() => {
    const hours = parseFloat(laborForm.hours) || 0;
    const rate = parseCurrency(laborForm.rate);
    return hours * rate;
  })();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Parts
          </CardTitle>
          <Button size="sm" onClick={handleAddPart}>
            <Plus className="h-4 w-4 mr-1" />
            Add Part
          </Button>
        </CardHeader>
        <CardContent>
          {parts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No parts added yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{item.name}</span>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(calculateItemTotal(item))}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditPart(item)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteItemId(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Labor
          </CardTitle>
          <Button size="sm" onClick={handleAddLabor}>
            <Plus className="h-4 w-4 mr-1" />
            Add Labor
          </Button>
        </CardHeader>
        <CardContent>
          {labor.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No labor entries added yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labor.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{item.name}</span>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}/hr</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(calculateItemTotal(item))}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditLabor(item)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteItemId(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Parts</span>
              <span>{formatCurrency(totalPartsCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Labor</span>
              <span>{formatCurrency(totalLaborCost)}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Grand Total</span>
              <span className="text-lg">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={partDialogOpen} onOpenChange={setPartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Part" : "Add Part"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the part details below." : "Add a part from inventory or enter custom details."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editingItem && (
              <div>
                <Label>Select from Inventory</Label>
                <Select
                  value={partForm.inventoryItemId?.toString() || "custom"}
                  onValueChange={handleInventorySelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select inventory item or custom..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Part</SelectItem>
                    {inventoryItems?.filter(i => i.isActive !== false).map((item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.name} {item.sku ? `(${item.sku})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Part Name</Label>
              <Input
                value={partForm.name}
                onChange={(e) => setPartForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Part name"
              />
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                value={partForm.description}
                onChange={(e) => setPartForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={partForm.quantity}
                  onChange={(e) => setPartForm(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
              <div>
                <Label>Unit Cost ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={partForm.unitCost}
                  onChange={(e) => setPartForm(prev => ({ ...prev, unitCost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Unit Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={partForm.unitPrice}
                  onChange={(e) => setPartForm(prev => ({ ...prev, unitPrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-muted-foreground">Line Total:</span>
              <span className="font-medium">{formatCurrency(partTotal)}</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDialogs}>Cancel</Button>
              <Button 
                onClick={handleSavePart} 
                disabled={!partForm.name || createMutation.isPending || updateMutation.isPending}
              >
                {editingItem ? "Update" : "Add"} Part
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={laborDialogOpen} onOpenChange={setLaborDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Labor Entry" : "Add Labor Entry"}</DialogTitle>
            <DialogDescription>
              Enter labor details for this work order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Description</Label>
              <Input
                value={laborForm.name}
                onChange={(e) => setLaborForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Installation labor, Repair work"
              />
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={laborForm.description}
                onChange={(e) => setLaborForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hours Worked</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.25"
                  value={laborForm.hours}
                  onChange={(e) => setLaborForm(prev => ({ ...prev, hours: e.target.value }))}
                />
              </div>
              <div>
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={laborForm.rate}
                  onChange={(e) => setLaborForm(prev => ({ ...prev, rate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-muted-foreground">Line Total:</span>
              <span className="font-medium">{formatCurrency(laborTotal)}</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeDialogs}>Cancel</Button>
              <Button 
                onClick={handleSaveLabor}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingItem ? "Update" : "Add"} Labor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteItemId !== null} onOpenChange={(open) => !open && setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteItemId && deleteMutation.mutate(deleteItemId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
