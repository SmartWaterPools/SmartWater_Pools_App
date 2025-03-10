import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/types";

// Define the payroll entry interface
interface PayrollEntry {
  id: number;
  userId: number;
  userName: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  regularHours: number;
  overtimeHours: number;
  grossPay: number;
  netPay: number;
  status: 'pending' | 'approved' | 'paid';
}

interface PayrollTableProps {
  data: PayrollEntry[];
  isLoading: boolean;
}

export default function PayrollTable({ data, isLoading }: PayrollTableProps) {
  // Mock data for initial UI development
  const mockData: PayrollEntry[] = [
    {
      id: 1,
      userId: 4,
      userName: "Jane Technician",
      payPeriodStart: "2025-03-01",
      payPeriodEnd: "2025-03-15",
      regularHours: 80,
      overtimeHours: 5,
      grossPay: 233500, // $2,335.00
      netPay: 187455, // $1,874.55
      status: "paid"
    },
    {
      id: 2,
      userId: 5,
      userName: "Bob Technician",
      payPeriodStart: "2025-03-01",
      payPeriodEnd: "2025-03-15",
      regularHours: 80,
      overtimeHours: 0,
      grossPay: 200000, // $2,000.00
      netPay: 162750, // $1,627.50
      status: "approved"
    },
    {
      id: 3,
      userId: 4,
      userName: "Jane Technician",
      payPeriodStart: "2025-03-16",
      payPeriodEnd: "2025-03-31",
      regularHours: 80,
      overtimeHours: 2,
      grossPay: 215000, // $2,150.00
      netPay: 174325, // $1,743.25
      status: "pending"
    }
  ];

  // Use mock data if no real data is provided
  const payroll = data.length > 0 ? data : mockData;

  // Format currency from cents to dollars
  const formatCurrency = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
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
                <TableHead>Employee</TableHead>
                <TableHead>Pay Period</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payroll.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.userName}</TableCell>
                  <TableCell>
                    {formatDate(new Date(entry.payPeriodStart))} - {formatDate(new Date(entry.payPeriodEnd))}
                  </TableCell>
                  <TableCell>
                    {entry.regularHours} regular
                    {entry.overtimeHours > 0 && (
                      <span className="text-amber-600 ml-1">+ {entry.overtimeHours} OT</span>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(entry.grossPay)}</TableCell>
                  <TableCell>{formatCurrency(entry.netPay)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusColor(entry.status)}
                    >
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </Badge>
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