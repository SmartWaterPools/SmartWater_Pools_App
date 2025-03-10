import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { X } from 'lucide-react';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

// Form schema for insurance policy
const insuranceFormSchema = z.object({
  name: z.string().min(2, { message: 'Policy name must be at least 2 characters.' }),
  policyNumber: z.string().min(1, { message: 'Policy number is required.' }),
  provider: z.string().min(1, { message: 'Insurance provider is required.' }),
  startDate: z.date({ required_error: 'Start date is required.' }),
  endDate: z.date({ required_error: 'End date is required.' }),
  coverageAmount: z.coerce.number().min(1, { message: 'Coverage amount is required.' }),
  premium: z.coerce.number().min(0, { message: 'Premium amount is required.' }),
  paymentFrequency: z.string().default('monthly'),
  status: z.string().default('active'),
  documentUrl: z.string().optional(),
  notes: z.string().optional(),
  reminderDate: z.date().optional(),
  isSubcontractor: z.boolean().default(false),
  subcontractorName: z.string().optional(),
  subcontractorContact: z.string().optional(),
  subcontractorCompany: z.string().optional(),
  subcontractorEmail: z.string().email({ message: 'Invalid email format' }).optional(),
  subcontractorPhone: z.string().optional(),
  verificationStatus: z.enum(['verified', 'pending', 'rejected', 'expired']).default('pending').optional(),
  verificationDate: z.date().optional(),
});

type InsuranceFormValues = z.infer<typeof insuranceFormSchema>;

type InsuranceFormProps = {
  onClose: () => void;
  initialData?: Partial<InsuranceFormValues>;
  isEditing?: boolean;
};

export function InsuranceForm({ onClose, initialData, isEditing = false }: InsuranceFormProps) {
  const queryClient = useQueryClient();

  // Default values for the form
  const defaultValues: Partial<InsuranceFormValues> = {
    name: '',
    policyNumber: '',
    provider: '',
    startDate: new Date(),
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    coverageAmount: 1000000,
    premium: 0,
    paymentFrequency: 'monthly',
    status: 'active',
    documentUrl: '',
    notes: '',
    reminderDate: new Date(new Date().setMonth(new Date().getMonth() + 11)),
    isSubcontractor: false,
    subcontractorName: '',
    subcontractorContact: '',
    subcontractorCompany: '',
    subcontractorEmail: '',
    subcontractorPhone: '',
    verificationStatus: 'pending',
    ...initialData,
  };

  // Form definition
  const form = useForm<InsuranceFormValues>({
    resolver: zodResolver(insuranceFormSchema),
    defaultValues,
  });

  // Create or update mutation
  const mutation = useMutation({
    mutationFn: async (values: InsuranceFormValues) => {
      if (isEditing && initialData?.id) {
        // Update existing insurance policy
        return apiRequest(`/api/business/insurance/${initialData.id}`, {
          method: 'PATCH',
          body: JSON.stringify(values),
        });
      } else {
        // Create new insurance policy
        return apiRequest('/api/business/insurance', {
          method: 'POST',
          body: JSON.stringify(values),
        });
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? 'Insurance policy updated' : 'Insurance policy created',
        description: isEditing 
          ? 'The insurance policy has been successfully updated.' 
          : 'The insurance policy has been successfully created.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/business/insurance'] });
      onClose();
    },
    onError: (error) => {
      console.error('Error saving insurance policy:', error);
      toast({
        title: 'Error',
        description: 'There was an error saving the insurance policy. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  function onSubmit(data: InsuranceFormValues) {
    mutation.mutate(data);
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{isEditing ? 'Edit Insurance Policy' : 'Add New Insurance Policy'}</CardTitle>
          <CardDescription>
            {isEditing
              ? 'Update the insurance policy information below.'
              : 'Fill in the details to add a new insurance policy.'}
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Name</FormLabel>
                    <FormControl>
                      <Input placeholder="General Liability Insurance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="policyNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Number</FormLabel>
                    <FormControl>
                      <Input placeholder="POL-12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance Provider</FormLabel>
                  <FormControl>
                    <Input placeholder="Nationwide Insurance" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="coverageAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coverage Amount ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1000000" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="premium"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Premium Amount ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="2500" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              "pl-3 text-left font-normal",
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
                              "pl-3 text-left font-normal",
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
                            date < form.getValues('startDate')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="renewal">Pending Renewal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="paymentFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="biannual">Bi-Annual</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="documentUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/policy.pdf" {...field} />
                  </FormControl>
                  <FormDescription>
                    Link to the insurance policy document (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reminderDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Reminder Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a reminder date</span>
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
                  <FormDescription>
                    When to be reminded about this policy renewal (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this insurance policy"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subcontractor Information Section */}
            <div className="border-t pt-4 mt-6">
              <h3 className="text-lg font-medium mb-4">Subcontractor Information</h3>
              
              <FormField
                control={form.control}
                name="isSubcontractor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>This insurance policy belongs to a subcontractor</FormLabel>
                      <FormDescription>
                        Enable this option if this policy is for a subcontractor who works with your company
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch('isSubcontractor') && (
                <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subcontractorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcontractor Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subcontractorCompany"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Smith Pools LLC" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subcontractorPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subcontractorEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="john@smithpools.com" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="subcontractorContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input placeholder="Office Manager Name" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>
                          Alternative contact person if different from the primary subcontractor
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="verificationStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || 'pending'}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="verified">Verified</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="verificationDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Verification Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Select date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            When was this policy verified?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEditing ? 'Update Policy' : 'Save Policy'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}