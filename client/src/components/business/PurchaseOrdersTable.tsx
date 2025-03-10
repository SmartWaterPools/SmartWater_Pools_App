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
import { Edit, MoreHorizontal, Trash2, FileDown, Eye, Check, X, FileText } from "lucide-react";
import { formatDate } from "@/lib/types";

// Define the purchase order interface
interface PurchaseOrder {
  id: number;
  orderNumber: string;
  vendorId: number;
  vendorName: string;
  orderDate: string;
  expectedDeliveryDate: string | null;
  receivedDate: string | null;
  status: 'draft' | 'pending' | 'approved' | 'shipped' | 'received' | 'cancelled';
  totalAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  notes: string | null;
}

interface PurchaseOrdersTableProps {
  data: PurchaseOrder[];
  isLoading: boolean;
  onEdit?: (order: PurchaseOrder) => void;
  onDelete?: (id: number) => void;
  onView?: (id: number) => void;
  onMarkReceived?: (id: number) => void;
  onCancel?: (id: number) => void;
}

export default function PurchaseOrdersTable({
  data,
  isLoading,
  onEdit,
  onDelete,
  onView,
  onMarkReceived,
  onCancel
}: PurchaseOrdersTableProps) {
  // Mock data for initial UI development
  const mockData: PurchaseOrder[] = [
    {
      id: 1,
      orderNumber: "PO-2025-001",
      vendorId: 1,
      vendorName: "Pool Supply Warehouse",
      orderDate: "2025-03-01",
      expectedDeliveryDate: "2025-03-10",
      receivedDate: null,
      status: "approved",
      totalAmount: 125985, // $1,259.85
      paymentStatus: "unpaid",
      notes: "Monthly chlorine and chemical order"
    },
    {
      id: 2,
      orderNumber: "PO-2025-002",
      vendorId: 2,
      vendorName: "Equipment Pros",
      orderDate: "2025-03-03",
      expectedDeliveryDate: "2025-03-15",
      receivedDate: null,
      status: "shipped",
      totalAmount: 374950, // $3,749.50
      paymentStatus: "partial",
      notes: "Replacement pumps and filters"
    },
    {
      id: 3,
      orderNumber: "PO-2025-003",
      vendorId: 3,
      vendorName: "Pool Parts Direct",
      orderDate: "2025-03-05",
      expectedDeliveryDate: "2025-03-12",
      receivedDate: "2025-03-08",
      status: "received",
      totalAmount: 68745, // $687.45
      paymentStatus: "paid",
      notes: "Emergency replacement parts for repairs"
    },
    {
      id: 4,
      orderNumber: "PO-2025-004",
      vendorId: 4,
      vendorName: "Office Supplies Inc",
      orderDate: "2025-03-07",
      expectedDeliveryDate: "2025-03-14",
      receivedDate: null,
      status: "cancelled",
      totalAmount: 24350, // $243.50
      paymentStatus: "unpaid",
      notes: "Office supplies - cancelled due to incorrect items"
    }
  ];

  // Use mock data if no real data is provided
  const orders = data.length > 0 ? data : mockData;

  // Format amount from cents to dollars
  const formatAmount = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  // Get appropriate badge color for order status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "received":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get appropriate badge color for payment status
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "unpaid":
        return "bg-red-100 text-red-800";
      case "partial":
        return "bg-amber-100 text-amber-800";
      case "paid":
        return "bg-green-100 text-green-800";
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
                <TableHead>Order #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.vendorName}</TableCell>
                  <TableCell>
                    <div>
                      {formatDate(new Date(order.orderDate))}
                    </div>
                    {order.expectedDeliveryDate && (
                      <div className="text-xs text-muted-foreground">
                        Expected: {formatDate(new Date(order.expectedDeliveryDate))}
                      </div>
                    )}
                    {order.receivedDate && (
                      <div className="text-xs text-green-600">
                        Received: {formatDate(new Date(order.receivedDate))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusColor(order.status)}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatAmount(order.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getPaymentStatusColor(order.paymentStatus)}
                    >
                      {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView && onView(order.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit && onEdit(order)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {order.status !== 'received' && order.status !== 'cancelled' && (
                          <DropdownMenuItem onClick={() => onMarkReceived && onMarkReceived(order.id)}>
                            <Check className="mr-2 h-4 w-4" />
                            Mark Received
                          </DropdownMenuItem>
                        )}
                        {order.status !== 'received' && order.status !== 'cancelled' && (
                          <DropdownMenuItem onClick={() => onCancel && onCancel(order.id)}>
                            <X className="mr-2 h-4 w-4" />
                            Cancel Order
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onDelete && onDelete(order.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" />
                          Generate Invoice
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileDown className="mr-2 h-4 w-4" />
                          Export PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}