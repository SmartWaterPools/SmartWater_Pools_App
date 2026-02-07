import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Package,
  AlertTriangle,
  TrendingDown,
  BarChart,
} from "lucide-react";

interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  quantity: string | null;
  unitCost: number | null;
  unitPrice: number | null;
  minimumStock: number | null;
  reorderPoint: number | null;
  location: string | null;
  isActive: boolean;
  vendorId: number | null;
  createdAt: string;
  updatedAt: string | null;
}

interface Adjustment {
  id: number;
  adjustmentDate: string;
  locationType: string | null;
  locationId: number | null;
  inventoryItemId: number | null;
  previousQuantity: number | null;
  newQuantity: number | null;
  reason: string | null;
  performedByUserId: number | null;
  notes: string | null;
}

interface CategoryStats {
  category: string;
  itemCount: number;
  totalQuantity: number;
  totalValue: number;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-6 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ReportsTab() {
  const { data: items = [], isLoading: itemsLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/items"],
  });

  const { data: adjustments = [], isLoading: adjustmentsLoading } = useQuery<Adjustment[]>({
    queryKey: ["/api/inventory/adjustments"],
  });

  const stats = useMemo(() => {
    let totalValue = 0;
    let totalItems = items.length;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockItems: InventoryItem[] = [];

    for (const item of items) {
      const qty = Number(item.quantity ?? 0);
      const cost = item.unitCost ?? 0;
      totalValue += qty * cost;

      if (qty <= 0) {
        outOfStockCount++;
        lowStockItems.push(item);
      } else {
        const minStock = item.minimumStock ?? 0;
        const reorder = item.reorderPoint ?? 0;
        const threshold = Math.max(minStock, reorder);
        if (threshold > 0 && qty <= threshold) {
          lowStockCount++;
          lowStockItems.push(item);
        }
      }
    }

    return { totalValue, totalItems, lowStockCount, outOfStockCount, lowStockItems };
  }, [items]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, CategoryStats>();

    for (const item of items) {
      const cat = item.category || "Uncategorized";
      const existing = map.get(cat) || {
        category: cat,
        itemCount: 0,
        totalQuantity: 0,
        totalValue: 0,
      };
      existing.itemCount++;
      existing.totalQuantity += Number(item.quantity ?? 0);
      existing.totalValue += Number(item.quantity ?? 0) * (item.unitCost ?? 0);
      map.set(cat, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [items]);

  const recentAdjustments = useMemo(() => {
    return [...adjustments]
      .sort((a, b) => new Date(b.adjustmentDate).getTime() - new Date(a.adjustmentDate).getTime())
      .slice(0, 10);
  }, [adjustments]);

  const itemsMap = useMemo(() => {
    const map = new Map<number, InventoryItem>();
    for (const item of items) {
      map.set(item.id, item);
    }
    return map;
  }, [items]);

  const isLoading = itemsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <OverviewSkeleton />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={4} cols={4} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={5} cols={6} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">Based on unit cost × quantity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">Unique inventory items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Below reorder point</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">Zero quantity items</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryBreakdown.length === 0 ? (
            <p className="text-muted-foreground text-sm">No inventory items found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total Quantity</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryBreakdown.map((cat) => (
                  <TableRow key={cat.category}>
                    <TableCell className="font-medium">{cat.category}</TableCell>
                    <TableCell className="text-right">{cat.itemCount}</TableCell>
                    <TableCell className="text-right">{cat.totalQuantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cat.totalValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.lowStockItems.length === 0 ? (
            <p className="text-muted-foreground text-sm">All items are sufficiently stocked.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Current Qty</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.lowStockItems.map((item) => {
                  const qty = Number(item.quantity ?? 0);
                  const isOutOfStock = qty <= 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.sku || "—"}</TableCell>
                      <TableCell className="text-right">{qty}</TableCell>
                      <TableCell className="text-right">{item.minimumStock ?? "—"}</TableCell>
                      <TableCell className="text-right">{item.reorderPoint ?? "—"}</TableCell>
                      <TableCell>
                        {isOutOfStock ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            Low Stock
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Recent Adjustments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {adjustmentsLoading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : recentAdjustments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No adjustments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Previous Qty</TableHead>
                  <TableHead className="text-right">New Qty</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAdjustments.map((adj) => {
                  const item = adj.inventoryItemId ? itemsMap.get(adj.inventoryItemId) : null;
                  return (
                    <TableRow key={adj.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(adj.adjustmentDate)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item ? item.name : adj.inventoryItemId ? `Item #${adj.inventoryItemId}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">{adj.previousQuantity ?? "—"}</TableCell>
                      <TableCell className="text-right">{adj.newQuantity ?? "—"}</TableCell>
                      <TableCell>{adj.reason || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{adj.notes || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
