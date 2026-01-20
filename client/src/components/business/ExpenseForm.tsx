import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2, X } from "lucide-react";
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
const expenseFormSchema = z.object({
  date: z.date({
    required_error: "Expense date is required",
  }),
  category: z.string({
    required_error: "Category is required",
  }),
  amount: z.coerce
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number",
    })
    .min(0.01, "Amount must be greater than $0"),
  description: z.string({
    required_error: "Description is required",
  }).min(3, "Description must be at least 3 characters"),
  vendor: z.string().optional(),
  reimbursable: z.boolean().default(false),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  categories: string[];
  expenseToEdit?: ExpenseFormValues & { id?: number };
  onClose: () => void;
}

export function ExpenseForm({ categories, expenseToEdit, onClose }: ExpenseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);

  // Get default values for form
  const defaultValues: Partial<ExpenseFormValues> = {
    date: expenseToEdit?.date ? new Date(expenseToEdit.date) : new Date(),
    category: expenseToEdit?.category || "",
    description: expenseToEdit?.description || "",
    amount: expenseToEdit?.amount ? expenseToEdit.amount / 100 : undefined,
    vendor: expenseToEdit?.vendor || "",
    reimbursable: expenseToEdit?.reimbursable || false,
    notes: expenseToEdit?.notes || "",
  };

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues,
  });

  // Mutation for creating/updating an expense
  const mutation = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      // Convert amount to cents for storage
      const data = {
        ...values,
        amount: Math.round(values.amount * 100), // Convert to cents
        createdBy: 1, // This would be the current user ID in a real app
      };

      if (expenseToEdit?.id) {
        // Update existing expense
        return apiRequest("PATCH", `/api/business/expenses/${expenseToEdit.id}`, data);
      } else {
        // Create new expense
        return apiRequest("POST", "/api/business/expenses", data);
      }
    },
    onSuccess: () => {
      toast({
        title: expenseToEdit?.id ? "Expense updated" : "Expense created",
        description: expenseToEdit?.id
          ? "The expense has been updated successfully."
          : "A new expense has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/business/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/business/dashboard'] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${expenseToEdit?.id ? "update" : "create"} expense. ${error.message}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: ExpenseFormValues) {
    mutation.mutate(values);
  }

  function handleClose() {
    setIsOpen(false);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{expenseToEdit?.id ? "Edit Expense" : "Add New Expense"}</DialogTitle>
          <DialogDescription>
            {expenseToEdit?.id
              ? "Update the details of this expense."
              : "Enter the details of the new expense."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Field */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
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
                          disabled={(date) =>
                            date > new Date() || date < new Date("2000-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Field */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount Field */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Vendor Field */}
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter vendor name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Reimbursable Field */}
            <FormField
              control={form.control}
              name="reimbursable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Reimbursable expense</FormLabel>
                    <FormDescription>
                      Check this if the expense should be reimbursed.
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
                      placeholder="Enter any additional notes"
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {expenseToEdit?.id ? "Update Expense" : "Create Expense"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}