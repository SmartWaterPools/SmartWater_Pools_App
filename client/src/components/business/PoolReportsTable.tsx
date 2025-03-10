import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MoreHorizontal, 
  FileText, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar, 
  RefreshCw,
  Download 
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PoolReportForm } from "./PoolReportForm";

// Types for pool reports
interface PoolReport {
  id: number;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  schedule: string;
  lastRun: string | null;
  isPublic: boolean;
  description?: string;
}

interface PoolReportsTableProps {
  reports: PoolReport[];
  isLoading: boolean;
  onCreateReport: () => void;
}

export default function PoolReportsTable({ reports = [], isLoading, onCreateReport }: PoolReportsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<PoolReport | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Format report types for display
  const formatReportType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Get badge color based on report schedule
  const getScheduleBadge = (schedule: string) => {
    switch(schedule) {
      case 'daily':
        return 'bg-blue-100 text-blue-800';
      case 'weekly':
        return 'bg-green-100 text-green-800';
      case 'biweekly':
        return 'bg-teal-100 text-teal-800';
      case 'monthly':
        return 'bg-purple-100 text-purple-800';
      case 'quarterly':
        return 'bg-amber-100 text-amber-800';
      case 'on_demand':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format report schedule for display
  const formatSchedule = (schedule: string) => {
    return schedule === 'on_demand' ? 'On Demand' : 
           schedule.charAt(0).toUpperCase() + schedule.slice(1);
  };

  // Run report mutation
  const runReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      return await apiRequest(`/api/business/pool-reports/${reportId}/run`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Report Executed",
        description: "Report has been queued for execution.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/business/pool-reports'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to run report. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      return await apiRequest(`/api/business/pool-reports/${reportId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "Report Deleted",
        description: "Report has been deleted successfully.",
      });
      setConfirmDelete(false);
      setSelectedReport(null);
      queryClient.invalidateQueries({ queryKey: ['/api/business/pool-reports'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete report. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate report PDF mutation
  const generatePdfMutation = useMutation({
    mutationFn: async (reportId: number) => {
      return await apiRequest(`/api/business/pool-reports/${reportId}/pdf`, {
        method: "GET"
      });
    },
    onSuccess: () => {
      toast({
        title: "PDF Generated",
        description: "Report PDF has been generated and is ready for download.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle running a report
  const handleRunReport = (reportId: number) => {
    runReportMutation.mutate(reportId);
  };

  // Handle editing a report
  const handleEditReport = (report: PoolReport) => {
    setSelectedReport(report);
    setShowEditForm(true);
  };

  // Handle viewing a report
  const handleViewReport = (reportId: number) => {
    // Redirect to report view page
    window.location.href = `/business/pool-reports/${reportId}`;
  };

  // Handle deleting a report
  const handleDeleteReport = (report: PoolReport) => {
    setSelectedReport(report);
    setConfirmDelete(true);
  };

  // Handle downloading report
  const handleDownloadReport = (reportId: number) => {
    generatePdfMutation.mutate(reportId);
  };

  // Confirm deletion of report
  const confirmDeleteReport = () => {
    if (selectedReport) {
      deleteReportMutation.mutate(selectedReport.id);
    }
  };

  return (
    <>
      <div className="w-full overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : reports && reports.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Report Name</TableHead>
                <TableHead className="whitespace-nowrap hidden sm:table-cell">Type</TableHead>
                <TableHead className="whitespace-nowrap">Schedule</TableHead>
                <TableHead className="whitespace-nowrap hidden md:table-cell">Date Range</TableHead>
                <TableHead className="whitespace-nowrap hidden md:table-cell">Last Run</TableHead>
                <TableHead className="whitespace-nowrap hidden sm:table-cell">Public</TableHead>
                <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">
                    {report.name}
                    <div className="block sm:hidden mt-1">
                      <Badge variant="secondary" className={`text-xs ${getScheduleBadge(report.schedule)}`}>
                        {formatSchedule(report.schedule)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{formatReportType(report.type)}</TableCell>
                  <TableCell className="hidden xs:table-cell">
                    <Badge className={getScheduleBadge(report.schedule)}>
                      {formatSchedule(report.schedule)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs sm:text-sm">
                    {format(new Date(report.startDate), 'MMM d, yyyy')} - {format(new Date(report.endDate), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs sm:text-sm">
                    {report.lastRun ? format(new Date(report.lastRun), 'MMM d, yyyy h:mm a') : 'Never'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {report.isPublic ? 
                      <Badge variant="default">Public</Badge> : 
                      <Badge variant="outline">Private</Badge>
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
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewReport(report.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Report
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRunReport(report.id)}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Run Report
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadReport(report.id)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEditReport(report)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteReport(report)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium mb-1 sm:mb-2">No Pool Reports</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 max-w-xs sm:max-w-md px-4">
              Create pool reports to analyze water chemistry, chemical usage, and maintenance data.
            </p>
            <Button onClick={onCreateReport} className="text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2">
              <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Create Your First Report
            </Button>
          </div>
        )}
      </div>

      {/* Edit Report Form */}
      {selectedReport && (
        <PoolReportForm
          open={showEditForm}
          onOpenChange={setShowEditForm}
          initialData={{
            name: selectedReport.name,
            type: selectedReport.type,
            description: selectedReport.description || "",
            startDate: new Date(selectedReport.startDate),
            endDate: new Date(selectedReport.endDate),
            schedule: selectedReport.schedule,
            isPublic: selectedReport.isPublic,
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-[90%] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Confirm Deletion</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm mt-1.5">
              Are you sure you want to delete the report "{selectedReport?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              className="text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteReport}
              className="text-xs sm:text-sm"
            >
              Delete Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}