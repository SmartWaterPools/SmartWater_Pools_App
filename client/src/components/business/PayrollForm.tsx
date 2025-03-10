import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";

// Define the form schema
const payrollFormSchema = z.object({
  userId: z.coerce.number({
    required_error: "Employee is required",
  }),
  payPeriodStart: z.date({
    required_error: "Start date is required",
  }),
  payPeriodEnd: z.date({
    required_error: "End date is required",
  }).refine(date => date > new Date(), {
    message: "End date must be after start date",
    path: ["payPeriodEnd"]
  }),
  regularHours: z.coerce
    .number({
      required_error: "Regular hours are required",
      invalid_type_error: "Regular hours must be a number",
    })
    .min(0, "Hours cannot be negative"),
  overtimeHours: z.coerce
    .number({
      required_error: "Overtime hours are required",
      invalid_type_error: "Overtime hours must be a number",
    })
    .min(0, "Hours cannot be negative")
    .default(0),
  holidayHours: z.coerce
    .number()
    .min(0, "Hours cannot be negative")
    .default(0),
  sickHours: z.coerce
    .number()
    .min(0, "Hours cannot be negative")
    .default(0),
  vacationHours: z.coerce
    .number()
    .min(0, "Hours cannot be negative")
    .default(0),
  hourlyRate: z.coerce
    .number({
      required_error: "Hourly rate is required",
      invalid_type_error: "Hourly rate must be a number",
    })
    .min(0.01, "Hourly rate must be greater than $0"),
  overtimeRate: z.coerce
    .number({
      required_error: "Overtime rate is required",
      invalid_type_error: "Overtime rate must be a number",
    })
    .min(0.01, "Overtime rate must be greater than $0"),
  status: z.enum(["pending", "approved", "paid"], {
    required_error: "Status is required",
  }).default("pending"),
});

type PayrollFormValues = z.infer<typeof payrollFormSchema>;

interface PayrollFormProps {
  payrollToEdit?: PayrollFormValues & { id?: number };
  onClose: () => void;
}

export function PayrollForm({ payrollToEdit, onClose }: PayrollFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);

  // Query to get all technicians
  const { data: technicians, isLoading: technicianLoading } = useQuery({
    queryKey: ['/api/technicians'],
  });

  // Get default values for form
  const defaultValues: Partial<PayrollFormValues> = {
    userId: payrollToEdit?.userId || undefined,
    payPeriodStart: payrollToEdit?.payPeriodStart 
      ? new Date(payrollToEdit.payPeriodStart) 
      : new Date(),
    payPeriodEnd: payrollToEdit?.payPeriodEnd 
      ? new Date(payrollToEdit.payPeriodEnd) 
      : new Date(new Date().setDate(new Date().getDate() + 14)),
    regularHours: payrollToEdit?.regularHours || 0,
    overtimeHours: payrollToEdit?.overtimeHours || 0,
    holidayHours: payrollToEdit?.holidayHours || 0,
    sickHours: payrollToEdit?.sickHours || 0,
    vacationHours: payrollToEdit?.vacationHours || 0,
    hourlyRate: payrollToEdit?.hourlyRate ? payrollToEdit.hourlyRate / 100 : undefined,
    overtimeRate: payrollToEdit?.overtimeRate ? payrollToEdit.overtimeRate / 100 : undefined,
    status: payrollToEdit?.status || "pending",
  };

  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollFormSchema),
    defaultValues,
  });

  // Mutation for creating/updating payroll entry
  const mutation = useMutation({
    mutationFn: async (values: PayrollFormValues) => {
      // Calculate gross pay, taxes, and net pay
      // This would normally be done on the server
      const regularPay = values.regularHours * values.hourlyRate;
      const overtimePay = values.overtimeHours * values.overtimeRate;
      const grossPay = regularPay + overtimePay;

      // Convert dollar amounts to cents for storage
      const data = {
        ...values,
        hourlyRate: Math.round(values.hourlyRate * 100), // Convert to cents
        overtimeRate: Math.round(values.overtimeRate * 100), // Convert to cents
        grossPay: Math.round(grossPay * 100), // This would be calculated server-side
        federalTax: Math.round(grossPay * 0.15 * 100), // Placeholder tax calculation
        stateTax: Math.round(grossPay * 0.05 * 100), // Placeholder tax calculation
        socialSecurity: Math.round(grossPay * 0.062 * 100), // Placeholder tax calculation
        medicare: Math.round(grossPay * 0.0145 * 100), // Placeholder tax calculation
        netPay: Math.round(grossPay * 0.75 * 100), // Placeholder net pay calculation
      };

      if (payrollToEdit?.id) {
        // Update existing payroll entry
        return apiRequest(`/api/business/payroll/${payrollToEdit.id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      } else {
        // Create new payroll entry
        return apiRequest("/api/business/payroll", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      toast({
        title: payrollToEdit?.id ? "Payroll entry updated" : "Payroll entry created",
        description: payrollToEdit?.id
          ? "The payroll entry has been updated successfully."
          : "A new payroll entry has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/business/payroll'] });
      queryClient.invalidateQueries({ queryKey: ['/api/business/dashboard'] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${payrollToEdit?.id ? "update" : "create"} payroll entry. ${error.message}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: PayrollFormValues) {
    mutation.mutate(values);
  }

  function handleClose() {
    setIsOpen(false);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {payrollToEdit?.id ? "Edit Payroll Entry" : "Add New Payroll Entry"}
          </DialogTitle>
          <DialogDescription>
            {payrollToEdit?.id
              ? "Update the details of this payroll entry."
              : "Enter the details of the new payroll entry."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Employee Field */}
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(parseInt(val))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* This would be populated from the API in a real implementation */}
                      <SelectItem value="4">Jane Technician</SelectItem>
                      <SelectItem value="5">Bob Technician</SelectItem>
                      <SelectItem value="6">Alex Technician</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pay Period Start Field */}
              <FormField
                control={form.control}
                name="payPeriodStart"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Pay Period Start</FormLabel>
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

              {/* Pay Period End Field */}
              <FormField
                control={form.control}
                name="payPeriodEnd"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Pay Period End</FormLabel>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Regular Hours Field */}
              <FormField
                control={form.control}
                name="regularHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regular Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Overtime Hours Field */}
              <FormField
                control={form.control}
                name="overtimeHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overtime Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status Field */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hourly Rate Field */}
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly Rate ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Overtime Rate Field */}
              <FormField
                control={form.control}
                name="overtimeRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overtime Rate ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Holiday Hours Field */}
              <FormField
                control={form.control}
                name="holidayHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holiday Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sick Hours Field */}
              <FormField
                control={form.control}
                name="sickHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sick Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Vacation Hours Field */}
              <FormField
                control={form.control}
                name="vacationHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vacation Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {payrollToEdit?.id ? "Update Entry" : "Create Entry"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}