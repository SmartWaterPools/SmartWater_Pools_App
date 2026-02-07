import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Edit,
  MoreHorizontal,
  Trash2,
  Plus,
  Minus,
  Search,
  Package,
  SlidersHorizontal,
} from "lucide-react";

interface InventoryItem {
  id: number;
  organizationId: number;
  sku: string | null;
  name: string;
  description: string | null;
  category: string | null;
  quantity: string | null;
  unitCost: number | null;
  unitPrice: number | null;
  minimumStock: number | null;
  reorderPoint: number | null;
  location: string | null;
  isActive: boolean;
  vendorId: number | null;
  lastRestockDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface ItemsTabProps {
  onAddItem?: () => void;
  onEditItem?: (item: any) => void;
}

const CATEGORIES = ["All", "Chemicals", "Equipment", "Parts", "Tools", "Safety", "Other"];
const STOCK_STATUSES = ["All", "In Stock", "Low Stock", "Out of Stock"];

function getStockStatus(item: InventoryItem) {
  const qty = Number(item.quantity || 0);
  const minStock = item.minimumStock || 0;
  const reorder = item.reorderPoint || 0;
  const threshold = Math.max(minStock, reorder);

  if (qty <= 0) return { label: "Out of Stock", variant: "destructive" as const };
  if (threshold > 0 && qty <= threshold) return { label: "Low Stock", variant: "secondary" as const };
  return { label: "In Stock", variant: "default" as const };
}

function getCategoryVariant(category: string | null) {
  switch (category?.toLowerCase()) {
    case "chemicals": return "default";
    case "equipment": return "secondary";
    case "parts": return "outline";
    case "tools": return "secondary";
    case "safety": return "destructive";
    default: return "outline";
  }
}

function formatPrice(cents: number | null) {
  if (cents == null) return "-";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ItemsTab({ onAddItem, onEditItem }: ItemsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");

  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/items"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/inventory/items/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Item deleted", description: "Inventory item has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/summary"] });
      setDeleteId(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to delete item. ${error.message}`, variant: "destructive" });
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: string }) => {
      return apiRequest("PATCH", `/api/inventory/items/${id}`, { quantity });
    },
    onSuccess: () => {
      toast({ title: "Stock updated", description: "Inventory quantity has been adjusted." });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/summary"] });
      setAdjustItem(null);
      setAdjustAmount("");
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to adjust stock. ${error.message}`, variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(searchLower) ||
        (item.sku && item.sku.toLowerCase().includes(searchLower)) ||
        (item.description && item.description.toLowerCase().includes(searchLower));

      const matchesCategory =
        categoryFilter === "All" ||
        (item.category && item.category.toLowerCase() === categoryFilter.toLowerCase());

      const status = getStockStatus(item);
      const matchesStatus = statusFilter === "All" || status.label === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  function handleAdjust(delta: number) {
    if (!adjustItem) return;
    const currentQty = Number(adjustItem.quantity || 0);
    const newQty = Math.max(0, currentQty + delta);
    adjustMutation.mutate({ id: adjustItem.id, quantity: String(newQty) });
  }

  function handleAdjustCustom() {
    if (!adjustItem || !adjustAmount) return;
    const amt = parseInt(adjustAmount, 10);
    if (isNaN(amt)) return;
    const currentQty = Number(adjustItem.quantity || 0);
    const newQty = Math.max(0, currentQty + amt);
    adjustMutation.mutate({ id: adjustItem.id, quantity: String(newQty) });
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">No inventory items found</p>
              <p className="text-sm">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cost / Price</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => {
                      const status = getStockStatus(item);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {item.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{item.sku || "-"}</TableCell>
                          <TableCell>
                            {item.category ? (
                              <Badge variant={getCategoryVariant(item.category) as any}>
                                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <div>{Number(item.quantity || 0)}</div>
                            {(item.minimumStock || 0) > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Min: {item.minimumStock}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={status.variant}
                              className={
                                status.label === "Low Stock"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                  : status.label === "Out of Stock"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              }
                            >
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatPrice(item.unitCost)}
                              {item.unitPrice != null && (
                                <span className="text-muted-foreground"> / {formatPrice(item.unitPrice)}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{item.location || "-"}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEditItem?.(item)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setAdjustItem(item)}>
                                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                                  Adjust Stock
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteId(item.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3">
                {filtered.map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{item.name}</h4>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEditItem?.(item)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setAdjustItem(item)}>
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                Adjust Stock
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteId(item.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">SKU:</span> {item.sku || "-"}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Qty:</span> {Number(item.quantity || 0)}
                            {(item.minimumStock || 0) > 0 && (
                              <span className="text-muted-foreground text-xs"> (min: {item.minimumStock})</span>
                            )}
                          </div>
                          <div>
                            {item.category && (
                              <Badge variant={getCategoryVariant(item.category) as any} className="text-xs">
                                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                              </Badge>
                            )}
                          </div>
                          <div>
                            <Badge
                              variant={status.variant}
                              className={
                                status.label === "Low Stock"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs"
                                  : status.label === "Out of Stock"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs"
                                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs"
                              }
                            >
                              {status.label}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cost:</span> {formatPrice(item.unitCost)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Price:</span> {formatPrice(item.unitPrice)}
                          </div>
                          {item.location && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Location:</span> {item.location}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inventory item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={adjustItem !== null} onOpenChange={(open) => { if (!open) { setAdjustItem(null); setAdjustAmount(""); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {adjustItem && (
                <>Current quantity for <strong>{adjustItem.name}</strong>: {Number(adjustItem.quantity || 0)}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-3 py-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleAdjust(-1)}
              disabled={adjustMutation.isPending}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="text-3xl font-bold tabular-nums min-w-[60px] text-center">
              {adjustItem ? Number(adjustItem.quantity || 0) : 0}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleAdjust(1)}
              disabled={adjustMutation.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter +/- amount"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
            />
            <Button onClick={handleAdjustCustom} disabled={!adjustAmount || adjustMutation.isPending}>
              Apply
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAdjustItem(null); setAdjustAmount(""); }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
