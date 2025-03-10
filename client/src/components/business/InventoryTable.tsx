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
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, MoreHorizontal, Trash2, ShoppingCart, Plus, Minus, History } from "lucide-react";
import { formatDate } from "@/lib/types";

// Define the inventory item interface
interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  location: string | null;
  lastRestockDate: string | null;
  notes: string | null;
}

interface InventoryTableProps {
  data: InventoryItem[];
  isLoading: boolean;
  onEdit?: (item: InventoryItem) => void;
  onDelete?: (id: number) => void;
  onAddStock?: (id: number) => void;
  onRemoveStock?: (id: number) => void;
  onCreateOrder?: (id: number) => void;
}

export default function InventoryTable({
  data,
  isLoading,
  onEdit,
  onDelete,
  onAddStock,
  onRemoveStock,
  onCreateOrder
}: InventoryTableProps) {
  // Mock data for initial UI development
  const mockData: InventoryItem[] = [
    {
      id: 1,
      name: "Liquid Chlorine (10% solution)",
      sku: "CHEM-LC10-1",
      category: "chemicals",
      quantity: 45,
      minQuantity: 20,
      unitPrice: 599, // $5.99
      location: "Warehouse A3",
      lastRestockDate: "2025-03-01",
      notes: "1 gallon containers"
    },
    {
      id: 2,
      name: "3\" Chlorine Tablets",
      sku: "CHEM-CT3-1",
      category: "chemicals",
      quantity: 12,
      minQuantity: 15,
      unitPrice: 8999, // $89.99
      location: "Warehouse A2",
      lastRestockDate: "2025-02-15",
      notes: "50 lb buckets"
    },
    {
      id: 3,
      name: "Pool Pump 1.5HP",
      sku: "EQUIP-PP15-1",
      category: "equipment",
      quantity: 5,
      minQuantity: 3,
      unitPrice: 29999, // $299.99
      location: "Warehouse B1",
      lastRestockDate: "2025-02-10",
      notes: "Pentair SuperFlo"
    },
    {
      id: 4,
      name: "Filter Cartridge",
      sku: "PART-FC100-1",
      category: "parts",
      quantity: 8,
      minQuantity: 10,
      unitPrice: 4499, // $44.99
      location: "Warehouse B4",
      lastRestockDate: "2025-02-20",
      notes: "Fits most standard pool filters"
    }
  ];

  // Use mock data if no real data is provided
  const inventory = data.length > 0 ? data : mockData;

  // Format price from cents to dollars
  const formatPrice = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  // Get stock status based on quantity vs. minQuantity
  const getStockStatus = (quantity: number, minQuantity: number) => {
    if (quantity <= 0) {
      return { status: "Out of stock", color: "bg-red-100 text-red-800" };
    } else if (quantity < minQuantity) {
      return { status: "Low stock", color: "bg-yellow-100 text-yellow-800" };
    } else {
      return { status: "In stock", color: "bg-green-100 text-green-800" };
    }
  };

  // Get appropriate badge color for category
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "chemicals":
        return "bg-blue-100 text-blue-800";
      case "equipment":
        return "bg-green-100 text-green-800";
      case "parts":
        return "bg-orange-100 text-orange-800";
      case "tools":
        return "bg-purple-100 text-purple-800";
      case "office":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Loading skeletons
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
    <Card>
      <CardContent className="pt-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => {
                const stockStatus = getStockStatus(item.quantity, item.minQuantity);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getCategoryColor(item.category)}
                      >
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        {item.quantity}
                        <div className="text-xs text-muted-foreground">
                          Min: {item.minQuantity}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={stockStatus.color}
                      >
                        {stockStatus.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatPrice(item.unitPrice)}</TableCell>
                    <TableCell>{item.location || "—"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit && onEdit(item)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAddStock && onAddStock(item.id)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRemoveStock && onRemoveStock(item.id)}>
                            <Minus className="mr-2 h-4 w-4" />
                            Remove Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onCreateOrder && onCreateOrder(item.id)}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Create Order
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <History className="mr-2 h-4 w-4" />
                            View History
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete && onDelete(item.id)}>
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
      </CardContent>
    </Card>
  );
}