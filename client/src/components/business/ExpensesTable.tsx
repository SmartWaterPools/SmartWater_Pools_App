import { useState } from "react";
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
import { Edit, MoreHorizontal, Trash2, FileDown, Eye } from "lucide-react";
import { formatDate } from "@/lib/types";

// Define the expense interface
interface Expense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number; // In cents
  vendor: string | null;
  approved: boolean;
  reimbursable: boolean;
  reimbursed: boolean;
}

interface ExpensesTableProps {
  data: Expense[];
  isLoading: boolean;
  onEdit?: (expense: Expense) => void;
  onDelete?: (id: number) => void;
  onView?: (expense: Expense) => void;
}

export default function ExpensesTable({
  data,
  isLoading,
  onEdit,
  onDelete,
  onView
}: ExpensesTableProps) {
  // Placeholder data for initial UI development
  const mockData: Expense[] = [
    {
      id: 1,
      date: "2025-03-01",
      category: "chemicals",
      description: "Chlorine purchase for route supplies",
      amount: 12999, // $129.99
      vendor: "Pool Supply Warehouse",
      approved: true,
      reimbursable: false,
      reimbursed: false
    },
    {
      id: 2,
      date: "2025-03-05",
      category: "vehicle",
      description: "Fuel for service vehicles",
      amount: 8750, // $87.50
      vendor: "Shell Gas Station",
      approved: true,
      reimbursable: false,
      reimbursed: false
    },
    {
      id: 3,
      date: "2025-03-08",
      category: "equipment",
      description: "Replacement pump parts",
      amount: 34599, // $345.99
      vendor: "Pool Equipment Supply Co",
      approved: false,
      reimbursable: false,
      reimbursed: false
    },
    {
      id: 4,
      date: "2025-03-09",
      category: "office",
      description: "Office supplies",
      amount: 6225, // $62.25
      vendor: "Office Depot",
      approved: true,
      reimbursable: true,
      reimbursed: false
    }
  ];

  // Use mock data if no real data is provided
  const expenses = data.length > 0 ? data : mockData;

  // Format amount from cents to dollars
  const formatAmount = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  // Get the appropriate color for category badges
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "chemicals":
        return "bg-blue-100 text-blue-800";
      case "equipment":
        return "bg-green-100 text-green-800";
      case "vehicle":
        return "bg-orange-100 text-orange-800";
      case "office":
        return "bg-purple-100 text-purple-800";
      case "marketing":
        return "bg-pink-100 text-pink-800";
      case "insurance":
        return "bg-yellow-100 text-yellow-800";
      case "utilities":
        return "bg-red-100 text-red-800";
      // payroll category removed
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
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(new Date(expense.date))}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getCategoryColor(expense.category)}
                    >
                      {expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{expense.vendor || "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAmount(expense.amount)}
                  </TableCell>
                  <TableCell>
                    {expense.approved ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                        Pending
                      </Badge>
                    )}
                    {expense.reimbursable && (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 ml-1">
                        {expense.reimbursed ? "Reimbursed" : "Reimbursable"}
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
                        <DropdownMenuItem onClick={() => onView && onView(expense)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit && onEdit(expense)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete && onDelete(expense.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileDown className="mr-2 h-4 w-4" />
                          Export Receipt
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