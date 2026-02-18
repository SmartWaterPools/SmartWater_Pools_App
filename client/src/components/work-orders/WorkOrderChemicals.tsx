import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FlaskConical, Plus, Trash2, Loader2 } from "lucide-react";
import type { ChemicalPrice } from "@shared/schema";

interface WorkOrderChemicalsProps {
  workOrderId: number;
  workOrder: any;
  compact?: boolean;
}

interface ChemicalEntry {
  id: string;
  chemicalPriceId: number;
  name: string;
  chemicalType: string;
  quantity: number;
  unit: string;
  unitCostCents: number;
  totalCostCents: number;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function WorkOrderChemicals({ workOrderId, workOrder, compact = false }: WorkOrderChemicalsProps) {
  const { toast } = useToast();
  const storageKey = `wo-chemicals-${workOrderId}`;

  const [chemicals, setChemicals] = useState<ChemicalEntry[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPriceId, setSelectedPriceId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");

  const { data: chemicalPrices, isLoading: pricesLoading } = useQuery<ChemicalPrice[]>({
    queryKey: ["/api/chemical-prices"],
  });

  const activePrices = chemicalPrices?.filter((p) => p.isActive) || [];

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(chemicals));
  }, [chemicals, storageKey]);

  const saveMaterialsCost = useMutation({
    mutationFn: async (totalCents: number) => {
      return apiRequest("PATCH", `/api/work-orders/${workOrderId}`, { materialsCost: totalCents });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId] });
      queryClient.invalidateQueries({ queryKey: [`/api/work-orders/${workOrderId}`] });
    },
  });

  const syncMaterialsCost = useCallback(
    (updatedChemicals: ChemicalEntry[]) => {
      const total = updatedChemicals.reduce((sum, c) => sum + c.totalCostCents, 0);
      saveMaterialsCost.mutate(total);
    },
    [workOrderId],
  );

  const handleAddChemical = () => {
    if (!selectedPriceId || !quantity) return;
    const price = activePrices.find((p) => p.id.toString() === selectedPriceId);
    if (!price) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Invalid quantity", description: "Please enter a valid quantity.", variant: "destructive" });
      return;
    }

    const entry: ChemicalEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      chemicalPriceId: price.id,
      name: price.name,
      chemicalType: price.chemicalType,
      quantity: qty,
      unit: price.unit,
      unitCostCents: price.unitCostCents,
      totalCostCents: Math.round(price.unitCostCents * qty),
    };

    const updated = [...chemicals, entry];
    setChemicals(updated);
    syncMaterialsCost(updated);
    setSelectedPriceId("");
    setQuantity("1");
    setShowAddForm(false);
    toast({ title: "Chemical added", description: `${price.name} × ${qty} ${price.unit}` });
  };

  const handleRemoveChemical = (id: string) => {
    const updated = chemicals.filter((c) => c.id !== id);
    setChemicals(updated);
    syncMaterialsCost(updated);
  };

  const totalCostCents = chemicals.reduce((sum, c) => sum + c.totalCostCents, 0);

  const selectedPrice = activePrices.find((p) => p.id.toString() === selectedPriceId);
  const previewCost = selectedPrice && quantity ? Math.round(selectedPrice.unitCostCents * (parseFloat(quantity) || 0)) : 0;

  const content = (
    <>
      {chemicals.length > 0 && (
        <div className="space-y-2 mb-3">
          {chemicals.map((chem) => (
            <div
              key={chem.id}
              className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border dark:border-gray-700 bg-muted/30"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{chem.name}</p>
                <p className="text-xs text-muted-foreground">
                  {chem.quantity} {chem.unit} × {formatCents(chem.unitCostCents)} = {formatCents(chem.totalCostCents)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveChemical(chem.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {showAddForm ? (
        <div className="space-y-3 p-3 rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
          {pricesLoading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading chemicals...
            </div>
          ) : activePrices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No chemical prices configured. Add prices in Settings.
            </p>
          ) : (
            <>
              <Select value={selectedPriceId} onValueChange={setSelectedPriceId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select chemical..." />
                </SelectTrigger>
                <SelectContent>
                  {activePrices.map((price) => (
                    <SelectItem key={price.id} value={price.id.toString()}>
                      {price.name} ({formatCents(price.unitCostCents)}/{price.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Quantity</label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-9"
                  />
                </div>
                {selectedPrice && (
                  <div className="text-sm font-medium text-green-700 dark:text-green-400 whitespace-nowrap pb-2">
                    {formatCents(previewCost)}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  onClick={handleAddChemical}
                  disabled={!selectedPriceId || !quantity || saveMaterialsCost.isPending}
                >
                  {saveMaterialsCost.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 mr-1" />
                  )}
                  Add
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
          className="w-full"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Chemical
        </Button>
      )}

      {chemicals.length > 0 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border dark:border-gray-700">
          <span className="text-sm font-medium text-muted-foreground">Total Materials Cost</span>
          <span className="text-base font-bold text-green-700 dark:text-green-400">
            {formatCents(totalCostCents)}
          </span>
        </div>
      )}
    </>
  );

  if (compact) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-semibold">Chemicals Used</span>
          </div>
          {chemicals.length > 0 && (
            <span className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
              {formatCents(totalCostCents)}
            </span>
          )}
        </div>
        {content}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-500" />
            Chemicals Used
          </CardTitle>
          {chemicals.length > 0 && (
            <span className="text-sm font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-full">
              {formatCents(totalCostCents)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
