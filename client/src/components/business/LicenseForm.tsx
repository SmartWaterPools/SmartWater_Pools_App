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
import { Checkbox } from '@/components/ui/checkbox';
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

// Form schema for license
const licenseFormSchema = z.object({
  name: z.string().min(2, { message: 'License name must be at least 2 characters.' }),
  licenseNumber: z.string().min(1, { message: 'License number is required.' }),
  issuingAuthority: z.string().min(1, { message: 'Issuing authority is required.' }),
  issueDate: z.date({ required_error: 'Issue date is required.' }),
  expiryDate: z.date({ required_error: 'Expiry date is required.' }),
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

type LicenseFormValues = z.infer<typeof licenseFormSchema>;

type LicenseFormProps = {
  onClose: () => void;
  initialData?: Partial<LicenseFormValues>;
  isEditing?: boolean;
};

export function LicenseForm({ onClose, initialData, isEditing = false }: LicenseFormProps) {
  const queryClient = useQueryClient();

  // Default values for the form
  const defaultValues: Partial<LicenseFormValues> = {
    name: '',
    licenseNumber: '',
    issuingAuthority: '',
    issueDate: new Date(),
    expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
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
  const form = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseFormSchema),
    defaultValues,
  });

  // Create or update mutation
  const mutation = useMutation({
    mutationFn: async (values: LicenseFormValues) => {
      if (isEditing && initialData?.id) {
        // Update existing license
        return apiRequest(`/api/business/licenses/${initialData.id}`, {
          method: 'PATCH',
          body: JSON.stringify(values),
        });
      } else {
        // Create new license
        return apiRequest('/api/business/licenses', {
          method: 'POST',
          body: JSON.stringify(values),
        });
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? 'License updated' : 'License created',
        description: isEditing 
          ? 'The license has been successfully updated.' 
          : 'The license has been successfully created.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/business/licenses'] });
      onClose();
    },
    onError: (error) => {
      console.error('Error saving license:', error);
      toast({
        title: 'Error',
        description: 'There was an error saving the license. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  function onSubmit(data: LicenseFormValues) {
    mutation.mutate(data);
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{isEditing ? 'Edit License' : 'Add New License'}</CardTitle>
          <CardDescription>
            {isEditing
              ? 'Update the license information below.'
              : 'Fill in the details to add a new license.'}
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
                    <FormLabel>License Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Contractor's License" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Number</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC-12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="issuingAuthority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issuing Authority</FormLabel>
                  <FormControl>
                    <Input placeholder="State Contractor's Board" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Issue Date</FormLabel>
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
                            date > new Date()
                          }
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
                name="expiryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expiry Date</FormLabel>
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
                            date < new Date()
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
              name="documentUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/document.pdf" {...field} />
                  </FormControl>
                  <FormDescription>
                    Link to the license document (optional)
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
                    When to be reminded about this license (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isSubcontractor"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Is Subcontractor License
                    </FormLabel>
                    <FormDescription>
                      Check if this license belongs to a subcontractor
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("isSubcontractor") && (
              <div className="space-y-4 border rounded-md p-4">
                <h3 className="text-lg font-medium">Subcontractor Information</h3>
                
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
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Contractors" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subcontractorContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Title/Position</FormLabel>
                        <FormControl>
                          <Input placeholder="Project Manager" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="verificationStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="verified">Verified</SelectItem>
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
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this license"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEditing ? 'Update License' : 'Save License'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}