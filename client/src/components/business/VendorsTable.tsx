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
import { Edit, MoreHorizontal, Trash2, ShoppingCart, Phone, Mail, ExternalLink } from "lucide-react";

// Define the vendor interface
interface Vendor {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  category: string;
  isActive: boolean;
}

interface VendorsTableProps {
  data: Vendor[];
  isLoading: boolean;
  onEdit?: (vendor: Vendor) => void;
  onDelete?: (id: number) => void;
  onCreateOrder?: (vendorId: number) => void;
}

export default function VendorsTable({
  data,
  isLoading,
  onEdit,
  onDelete,
  onCreateOrder
}: VendorsTableProps) {
  // Mock data for initial UI development
  const mockData: Vendor[] = [
    {
      id: 1,
      name: "Pool Supply Warehouse",
      contactName: "John Smith",
      email: "john@poolsupply.example.com",
      phone: "555-123-4567",
      category: "chemical supplier",
      isActive: true
    },
    {
      id: 2,
      name: "Equipment Pros",
      contactName: "Sarah Johnson",
      email: "sarah@equipmentpros.example.com",
      phone: "555-987-6543",
      category: "equipment",
      isActive: true
    },
    {
      id: 3,
      name: "Pool Parts Direct",
      contactName: "Mike Wilson",
      email: "mike@poolparts.example.com",
      phone: "555-456-7890",
      category: "parts",
      isActive: true
    },
    {
      id: 4,
      name: "Office Supplies Inc",
      contactName: "Jessica Brown",
      email: "jessica@officesupplies.example.com",
      phone: "555-222-3333",
      category: "office",
      isActive: false
    }
  ];

  // Use mock data if no real data is provided
  const vendors = data.length > 0 ? data : mockData;

  // Get appropriate badge color for vendor category
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "chemical supplier":
        return "bg-blue-100 text-blue-800";
      case "equipment":
        return "bg-green-100 text-green-800";
      case "parts":
        return "bg-orange-100 text-orange-800";
      case "service":
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
                <TableHead>Vendor Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email/Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getCategoryColor(vendor.category)}
                    >
                      {vendor.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{vendor.contactName || "—"}</TableCell>
                  <TableCell className="space-y-1">
                    {vendor.email && (
                      <div className="flex items-center text-sm">
                        <Mail className="mr-1 h-3 w-3" />
                        {vendor.email}
                      </div>
                    )}
                    {vendor.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="mr-1 h-3 w-3" />
                        {vendor.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {vendor.isActive ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-800">
                        Inactive
                      </Badge>
                    )}
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
                        <DropdownMenuItem onClick={() => onEdit && onEdit(vendor)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete && onDelete(vendor.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCreateOrder && onCreateOrder(vendor.id)}>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Create Order
                        </DropdownMenuItem>
                        {vendor.email && (
                          <DropdownMenuItem onClick={() => window.location.href = `mailto:${vendor.email}`}>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
                          </DropdownMenuItem>
                        )}
                        {vendor.phone && (
                          <DropdownMenuItem onClick={() => window.location.href = `tel:${vendor.phone}`}>
                            <Phone className="mr-2 h-4 w-4" />
                            Call
                          </DropdownMenuItem>
                        )}
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