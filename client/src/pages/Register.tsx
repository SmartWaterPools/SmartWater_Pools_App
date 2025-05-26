import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Define registration form schema - make it dynamic based on OAuth status
const createRegisterFormSchema = (isOAuth: boolean) => {
  const baseSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    name: z.string().min(1, "Full name is required"),
    organizationName: z.string().min(2, "Organization name is required"),
    role: z.enum(["client", "technician", "manager", "admin"]),
    phone: z.string().optional(),
    address: z.string().optional(),
  });

  if (isOAuth) {
    // For OAuth users, passwords are not required
    return baseSchema.extend({
      password: z.string().optional(),
      confirmPassword: z.string().optional(),
    });
  } else {
    // For regular users, passwords are required
    return baseSchema.extend({
      password: z.string().min(6, "Password must be at least 6 characters"),
      confirmPassword: z.string(),
    }).refine(data => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });
  }
};

export default function Register() {
  const { toast } = useToast();
  const { register, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  
  // Check if this is an OAuth user
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const isOAuth = searchParams.get('oauth') === 'true';
  const isNewUser = searchParams.get('new') === 'true';
  
  // Set OAuth user state immediately
  useEffect(() => {
    if (isOAuth) {
      setIsOAuthUser(true);
    }
  }, [isOAuth]);
  
  // Create the schema based on OAuth status
  const registerFormSchema = createRegisterFormSchema(isOAuth);
  type RegisterFormValues = z.infer<typeof registerFormSchema>;
  
  // Define form
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      organizationName: "",
      role: "client",
      phone: "",
      address: "",
    },
  });
  
  // Pre-fill form for OAuth users
  useEffect(() => {
    if (isOAuth && isNewUser) {
      setIsOAuthUser(true);
      
      // If we have user data from OAuth, pre-fill it
      if (user) {
        form.setValue('email', user.email || '');
        form.setValue('name', user.name || '');
        
        // If user has suggested organization, pre-fill it
        if ((user as any).suggestedOrganizationName) {
          form.setValue('organizationName', (user as any).suggestedOrganizationName);
        }
      }
    } else if (isOAuth) {
      // Even if we don't have user data yet, mark as OAuth user
      setIsOAuthUser(true);
    }
  }, [isOAuth, isNewUser, user, form]);
  
  async function onSubmit(data: RegisterFormValues) {
    // For OAuth users, we don't need passwords and email is the username
    const { confirmPassword, organizationName, ...userFields } = data;
    
    // Prepare data for registration
    const registrationData = {
      email: userFields.email,
      name: userFields.name,
      role: userFields.role,
      phone: userFields.phone,
      address: userFields.address,
      organizationName,
      // For OAuth users, password is not needed
      ...(isOAuthUser ? {} : { 
        username: userFields.email,
        password: userFields.password 
      })
    };
    
    try {
      const success = await register(registrationData);
      
      if (success) {
        // Redirect to pricing page after successful registration
        const organizationParam = organizationName.replace(/\s+/g, '-').toLowerCase();
        const slugParam = organizationParam.replace(/[^a-z0-9-]/g, '');
        setLocation(`/pricing?name=${encodeURIComponent(organizationName)}&slug=${slugParam}`);
      }
    } catch (error) {
      console.error("Registration submission error:", error);
      toast({
        title: "Registration error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  }
  
  return (
    <div className="container flex items-center justify-center min-h-screen py-8 overflow-auto">
      <Card className="w-full max-w-lg my-8">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {isOAuthUser ? "Complete Your Registration" : "Create Account"}
          </CardTitle>
          <CardDescription className="text-center">
            {isOAuthUser 
              ? "Please provide your organization details to complete your account setup"
              : "Enter your information to register a new account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your organization name"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your full name"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="Enter your email"
                        disabled={isLoading || isOAuthUser}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {!isOAuthUser && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Create a password"
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Confirm your password"
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        disabled={isLoading}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="technician">Technician</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your phone number"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your address"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            variant="link" 
            className="px-0" 
            onClick={() => setLocation("/login")} 
            disabled={isLoading}
          >
            Already have an account? Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}