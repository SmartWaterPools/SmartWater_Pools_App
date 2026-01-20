import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2, X, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { REPORT_TYPES } from "@shared/schema";

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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

// Define the form schema
const reportFormSchema = z.object({
  name: z.string().min(3, {
    message: "Name must be at least 3 characters.",
  }),
  type: z.string({
    required_error: "Please select a report type.",
  }),
  startDate: z.date({
    required_error: "Start date is required.",
  }),
  endDate: z.date({
    required_error: "End date is required.",
  }).refine(
    (endDate, ctx) => {
      const { startDate } = ctx.parent;
      if (!startDate) return true; // Skip validation if start date is not provided
      return endDate > startDate;
    },
    {
      message: "End date must be after start date.",
    }
  ),
  scheduleFrequency: z.string().default("on-demand"),
  isPublic: z.boolean().default(false),
  notes: z.string().optional(),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

interface FinancialReportFormProps {
  reportToEdit?: ReportFormValues & { id?: number };
  onClose: () => void;
}

export function FinancialReportForm({ reportToEdit, onClose }: FinancialReportFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(!!reportToEdit?.scheduleFrequency || reportToEdit?.isPublic);

  // Mock report types if not available from schema
  const reportTypes = REPORT_TYPES || [
    'income_statement', 
    'balance_sheet', 
    'cash_flow',
    'profit_loss',
    'expense_summary',
    'revenue_by_service',
    'technician_productivity',
    'chemical_usage',
    'route_profitability',
    'custom'
  ];

  // Get default values for form
  const defaultValues: Partial<ReportFormValues> = {
    name: reportToEdit?.name || "",
    type: reportToEdit?.type || "",
    startDate: reportToEdit?.startDate 
      ? new Date(reportToEdit.startDate) 
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    endDate: reportToEdit?.endDate 
      ? new Date(reportToEdit.endDate) 
      : new Date(), // Today
    scheduleFrequency: reportToEdit?.scheduleFrequency || "on-demand",
    isPublic: reportToEdit?.isPublic || false,
    notes: reportToEdit?.notes || "",
  };

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues,
  });

  // Mutation for creating/updating report
  const mutation = useMutation({
    mutationFn: async (values: ReportFormValues) => {
      // Add createdBy field (would be from current user in real app)
      const data = {
        ...values,
        createdBy: 1, // This would be the current user ID in a real app
      };

      if (reportToEdit?.id) {
        // Update existing report
        return apiRequest('PATCH', `/api/business/reports/${reportToEdit.id}`, data);
      } else {
        // Create new report
        return apiRequest('POST', '/api/business/reports', data);
      }
    },
    onSuccess: () => {
      toast({
        title: reportToEdit?.id ? "Report updated" : "Report created",
        description: reportToEdit?.id
          ? "The financial report has been updated successfully."
          : "A new financial report has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/business/reports'] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${reportToEdit?.id ? "update" : "create"} report. ${error.message}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: ReportFormValues) {
    mutation.mutate(values);
  }

  function handleClose() {
    setIsOpen(false);
    onClose();
  }

  // Function to format report type display name
  const formatReportType = (type: string): string => {
    return type.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {reportToEdit?.id ? "Edit Financial Report" : "Create Financial Report"}
          </DialogTitle>
          <DialogDescription>
            {reportToEdit?.id
              ? "Update the details of this financial report."
              : "Define a new financial report to analyze your business data."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Report Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter report name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Report Type Field */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {formatReportType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the type of financial report you want to generate.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Range Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date Field */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date Field */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Advanced Settings Toggle */}
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="gap-1"
              >
                <Settings className="h-4 w-4" />
                {showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings"}
              </Button>
            </div>

            {/* Advanced Settings */}
            {showAdvanced && (
              <>
                {/* Schedule Frequency Field */}
                <FormField
                  control={form.control}
                  name="scheduleFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule Frequency (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "on-demand"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Run on-demand only" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="on-demand">On-demand only</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How often should this report be automatically generated?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Is Public Field */}
                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Make report public</FormLabel>
                        <FormDescription>
                          Public reports are accessible to all team members. Private reports are only visible to you and administrators.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Notes Field */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional details about this report"
                          {...field}
                          value={field.value || ""}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="gap-1"
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="gap-1">
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {reportToEdit?.id ? "Update Report" : "Create Report"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}