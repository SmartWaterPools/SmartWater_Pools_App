import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Define validation schema for technician form
const technicianFormSchema = z.object({
  user: z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
  specialization: z.string().min(2, { message: "Specialization is required" }),
  certifications: z.string().optional(),
  rate: z.string().optional(),
  notes: z.string().optional(),
});

// Base form values from the schema
type TechnicianFormValues = z.infer<typeof technicianFormSchema>;

// Extended type for the API request with proper null handling
interface TechnicianApiRequest {
  user: {
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
  };
  specialization: string;
  certifications: string | null;
  rate: string | null;
  notes: string | null;
}

interface TechnicianFormProps {
  onSuccess?: () => void;
}

export function TechnicianForm({ onSuccess }: TechnicianFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values
  const form = useForm<TechnicianFormValues>({
    resolver: zodResolver(technicianFormSchema),
    defaultValues: {
      user: {
        name: "",
        email: "",
        phone: "",
        address: "",
      },
      specialization: "",
      certifications: "",
      rate: "",
      notes: "",
    },
  });

  // Define mutation for creating technician
  const createTechnicianMutation = useMutation({
    mutationFn: async (data: TechnicianApiRequest) => {
      try {
        // Use apiRequest to communicate with our backend
        const response = await fetch("/api/technicians/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create technician");
        }
        
        return await response.json();
      } catch (error: any) {
        console.error("API Request Error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/technicians-with-users"] });
      toast({
        title: "Technician created",
        description: "The technician has been successfully added",
      });
      
      // Reset form
      form.reset();
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      console.error("Error creating technician:", error);
      
      // Handle different types of errors
      if (error.status === 401 || error.message?.includes("Unauthorized")) {
        toast({
          title: "Authentication Required",
          description: "You need to be logged in to create a technician. Please log in and try again.",
          variant: "destructive",
        });
      } else if (error.message?.includes("Missing required user data")) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields including name and email.",
          variant: "destructive",
        });
      } else if (error.message?.includes("exists")) {
        toast({
          title: "Email Already in Use",
          description: "A user with this email already exists. Please use a different email address.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create technician. Please try again.",
          variant: "destructive",
        });
      }
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Form submission handler
  const onSubmit = async (values: TechnicianFormValues) => {
    try {
      // First check if user is logged in by making a quick session check
      const sessionResponse = await fetch('/api/auth/session');
      const sessionData = await sessionResponse.json();
      
      if (!sessionData.isAuthenticated) {
        setIsSubmitting(false);
        toast({
          title: "Authentication Required",
          description: "You need to be logged in to create a technician. Please log in first.",
          variant: "destructive",
        });
        return;
      }
      
      // Make sure the user and required fields are properly structured
      const formattedValues: TechnicianApiRequest = {
        user: {
          name: values.user.name.trim(),
          email: values.user.email.trim(),
          phone: values.user.phone ? values.user.phone.trim() : null,
          address: values.user.address ? values.user.address.trim() : null
        },
        specialization: values.specialization.trim(),
        certifications: values.certifications ? values.certifications.trim() : null,
        rate: values.rate ? values.rate.trim() : null,
        notes: values.notes ? values.notes.trim() : null
      };
      
      // If authenticated, proceed with the mutation
      setIsSubmitting(true);
      createTechnicianMutation.mutate(formattedValues);
    } catch (error) {
      console.error("Error checking authentication:", error);
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: "Failed to verify authentication status. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">User Information</h3>
          
          <FormField
            control={form.control}
            name="user.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="user.email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="john.doe@example.com" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="user.phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="(555) 555-5555" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="user.address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="123 Main St, City, State 12345" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Professional Information</h3>
          
          <FormField
            control={form.control}
            name="specialization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specialization *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Pool Maintenance, Repairs, Installation, etc." 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="certifications"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Certifications</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Certified Pool Operator, NSPF Certified, etc." 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-gray-500">
                  Separate multiple certifications with commas
                </p>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hourly Rate</FormLabel>
                <FormControl>
                  <Input placeholder="$50.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Additional information about the technician" 
                    {...field} 
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Adding Technician..." : "Add Technician"}
        </Button>
      </form>
    </Form>
  );
}