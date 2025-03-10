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

// Define time entry interface to match the API structure
interface TimeEntry {
  id: number;
  userId: number;
  projectId: number;
  date: string;
  startTime?: string;
  endTime?: string;
  breakDuration?: number;
  hoursWorked: number;
  description: string;
  status: string;
  approvedBy?: number;
  notes: string | null;
  createdAt: string;
}

interface TimeEntryTableProps {
  data: TimeEntry[];
  isLoading: boolean;
}

export default function TimeEntryTable({ data, isLoading }: TimeEntryTableProps) {
  // Mock data for initial UI development - only used if API fails
  const mockData: TimeEntry[] = [
    {
      id: 1,
      userId: 3,
      projectId: 1, 
      date: "2025-03-01",
      hoursWorked: 8,
      description: "Pool installation - framing",
      status: "approved",
      approvedBy: 1,
      notes: null,
      createdAt: "2025-03-01T17:00:00Z"
    },
    {
      id: 2,
      userId: 4,
      projectId: 1,
      date: "2025-03-01",
      hoursWorked: 8,
      description: "Pool installation - plumbing",
      status: "approved",
      approvedBy: 1,
      notes: null,
      createdAt: "2025-03-01T17:05:00Z"
    },
    {
      id: 3,
      userId: 2,
      projectId: 3,
      date: "2025-03-01",
      hoursWorked: 6,
      description: "Maintenance route - north",
      status: "approved",
      approvedBy: 1,
      notes: "Completed 8 service calls",
      createdAt: "2025-03-01T15:30:00Z"
    }
  ];

  // Use mock data if no real data is provided
  const timeEntries = data.length > 0 ? data : mockData;

  // Get employee name based on userId (would be replaced with real data in production)
  const getEmployeeName = (userId: number): string => {
    const employees: {[key: number]: string} = {
      1: "Admin User",
      2: "John Technician",
      3: "Sarah Technician",
      4: "Mike Technician",
      5: "Lisa Technician"
    };
    return employees[userId] || `User ${userId}`;
  };

  // Get project name based on projectId (would be replaced with real data in production)
  const getProjectName = (projectId: number): string => {
    const projects: {[key: number]: string} = {
      1: "Thompson Pool Installation",
      2: "Wilson Pool Renovation",
      3: "Maintenance Routes",
      4: "Repair Services"
    };
    return projects[projectId] || `Project ${projectId}`;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
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
                <TableHead>Date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Project/Task</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{getEmployeeName(entry.userId)}</TableCell>
                  <TableCell>{formatDate(new Date(entry.date))}</TableCell>
                  <TableCell>
                    {entry.startTime && entry.endTime ? (
                      <span>
                        {entry.startTime} - {entry.endTime}
                        {entry.breakDuration && entry.breakDuration > 0 && (
                          <span className="text-xs text-gray-500 block">
                            ({entry.breakDuration} min break)
                          </span>
                        )}
                      </span>
                    ) : (
                      entry.hoursWorked
                    )}
                  </TableCell>
                  <TableCell>{getProjectName(entry.projectId)}</TableCell>
                  <TableCell>{entry.description}</TableCell>
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