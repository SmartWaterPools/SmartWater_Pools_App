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
import { Edit, MoreHorizontal, Trash2, FileDown, Eye, BarChart, PlayCircle } from "lucide-react";
import { formatDate } from "@/lib/types";

// Define financial report interface
interface FinancialReport {
  id: number;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  createdBy: number;
  createdByName: string;
  lastRunDate: string | null;
  scheduleFrequency: string | null;
  isPublic: boolean;
}

interface FinancialReportsTableProps {
  data: FinancialReport[];
  isLoading: boolean;
  onEdit?: (report: FinancialReport) => void;
  onDelete?: (id: number) => void;
  onRun?: (id: number) => void;
  onView?: (id: number) => void;
}

export default function FinancialReportsTable({
  data,
  isLoading,
  onEdit,
  onDelete,
  onRun,
  onView
}: FinancialReportsTableProps) {
  // Mock data for initial UI development
  const mockData: FinancialReport[] = [
    {
      id: 1,
      name: "Monthly Profit and Loss",
      type: "profit_loss",
      startDate: "2025-03-01",
      endDate: "2025-03-31",
      createdBy: 1,
      createdByName: "Alex Johnson",
      lastRunDate: "2025-03-09T10:30:00",
      scheduleFrequency: "monthly",
      isPublic: true
    },
    {
      id: 2,
      name: "Quarterly Balance Sheet",
      type: "balance_sheet",
      startDate: "2025-01-01",
      endDate: "2025-03-31",
      createdBy: 1,
      createdByName: "Alex Johnson",
      lastRunDate: "2025-03-05T14:15:00",
      scheduleFrequency: "quarterly",
      isPublic: false
    },
    {
      id: 3,
      name: "Route Profitability Analysis",
      type: "route_profitability",
      startDate: "2025-03-01",
      endDate: "2025-03-31",
      createdBy: 2,
      createdByName: "Sarah Manager",
      lastRunDate: null,
      scheduleFrequency: null,
      isPublic: false
    },
    {
      id: 4,
      name: "Chemical Usage by Client Type",
      type: "chemical_usage",
      startDate: "2025-01-01",
      endDate: "2025-03-31",
      createdBy: 1,
      createdByName: "Alex Johnson",
      lastRunDate: "2025-03-08T09:00:00",
      scheduleFrequency: "weekly",
      isPublic: true
    }
  ];

  // Use mock data if no real data is provided
  const reports = data.length > 0 ? data : mockData;

  // Get report type display name
  const getReportTypeName = (type: string): string => {
    switch (type) {
      case "income_statement":
        return "Income Statement";
      case "balance_sheet":
        return "Balance Sheet";
      case "cash_flow":
        return "Cash Flow";
      case "profit_loss":
        return "Profit & Loss";
      case "expense_summary":
        return "Expense Summary";
      case "revenue_by_service":
        return "Revenue by Service";
      case "technician_productivity":
        return "Technician Productivity";
      case "chemical_usage":
        return "Chemical Usage";
      case "route_profitability":
        return "Route Profitability";
      case "custom":
        return "Custom Report";
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Get appropriate badge color for report type
  const getReportTypeColor = (type: string) => {
    switch (type) {
      case "income_statement":
      case "profit_loss":
        return "bg-green-100 text-green-800";
      case "balance_sheet":
        return "bg-blue-100 text-blue-800";
      case "cash_flow":
        return "bg-indigo-100 text-indigo-800";
      case "expense_summary":
        return "bg-red-100 text-red-800";
      case "revenue_by_service":
        return "bg-purple-100 text-purple-800";
      case "technician_productivity":
        return "bg-amber-100 text-amber-800";
      case "chemical_usage":
        return "bg-cyan-100 text-cyan-800";
      case "route_profitability":
        return "bg-teal-100 text-teal-800";
      case "custom":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format schedule frequency
  const formatSchedule = (frequency: string | null): string => {
    if (!frequency) return "On demand";
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
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
                <TableHead>Report Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    {report.name}
                    {report.isPublic && (
                      <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700">
                        Public
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getReportTypeColor(report.type)}
                    >
                      {getReportTypeName(report.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDate(new Date(report.startDate))} - {formatDate(new Date(report.endDate))}
                  </TableCell>
                  <TableCell>
                    {formatSchedule(report.scheduleFrequency)}
                  </TableCell>
                  <TableCell>
                    {report.lastRunDate 
                      ? formatDate(new Date(report.lastRunDate))
                      : "Never run"
                    }
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
                        <DropdownMenuItem onClick={() => onRun && onRun(report.id)}>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Run Report
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onView && onView(report.id)}>
                          <BarChart className="mr-2 h-4 w-4" />
                          View Results
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit && onEdit(report)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete && onDelete(report.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileDown className="mr-2 h-4 w-4" />
                          Export
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