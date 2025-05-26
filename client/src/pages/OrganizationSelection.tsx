import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';

// Schema for creating a new organization
const createOrgSchema = z.object({
  organizationName: z.string().min(3, "Organization name must be at least 3 characters long"),
  organizationType: z.enum(["company", "individual"]),
});

// Schema for joining an existing organization
const joinOrgSchema = z.object({
  invitationCode: z.string().min(6, "Invitation code must be at least 6 characters long"),
});

export default function OrganizationSelection() {
  const { googleId } = useParams();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("create");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [verifiedOrg, setVerifiedOrg] = useState<{ id: number, name: string } | null>(null);
  const { toast } = useToast();

  // Create organization form
  const createOrgForm = useForm<z.infer<typeof createOrgSchema>>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: {
      organizationName: "",
      organizationType: "company",
    },
  });

  // Join organization form
  const joinOrgForm = useForm<z.infer<typeof joinOrgSchema>>({
    resolver: zodResolver(joinOrgSchema),
    defaultValues: {
      invitationCode: "",
    },
  });

  // Fetch pending OAuth user data
  const { data: pendingUserData, isLoading: isLoadingUser, isError: isErrorUser } = useQuery({
    queryKey: ['/api/oauth/pending', googleId],
    queryFn: async () => {
      return await apiRequest(`/api/oauth/pending/${googleId}`, 'GET');
    },
    retry: false,
  });

  // Handle verification of invitation code
  const handleVerifyInvitation = async (code: string) => {
    try {
      setIsLoading(true);
      const data = await apiRequest(`/api/oauth/verify-invitation/${code}`, 'GET');
      
      if (data.success) {
        setVerifiedOrg({
          id: data.organizationId,
          name: data.organizationName
        });
        toast({
          title: "Invitation verified",
          description: `You can join ${data.organizationName}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Invalid invitation",
          description: data.message || "The invitation code is invalid or expired",
          variant: "destructive",
        });
        setVerifiedOrg(null);
      }
    } catch (error: any) {
      // Error handling
      
      let errorMessage = "Could not verify the invitation code";
      
      // Try to extract a more specific error message
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Verification failed",
        description: errorMessage,
        variant: "destructive",
      });
      setVerifiedOrg(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle create organization form submission
  const onCreateOrgSubmit = async (values: z.infer<typeof createOrgSchema>) => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest(
        '/api/oauth/complete-registration', 
        'POST', 
        {
          googleId,
          action: 'create',
          organizationName: values.organizationName,
          organizationType: values.organizationType,
        }
      );

      if (response.success) {
        toast({
          title: "Organization created",
          description: "Your organization has been created successfully",
          variant: "default",
        });
        
        // Redirect to the specified page (usually pricing page for new orgs)
        if (response.redirectTo) {
          setLocation(response.redirectTo);
        } else {
          setLocation('/dashboard');
        }
      } else {
        toast({
          title: "Creation failed",
          description: response.message || "Failed to create organization",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      // Handle error gracefully without logging
      let errorMessage = "An unexpected error occurred";
      
      // Try to extract a more specific error message
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle join organization form submission
  const onJoinOrgSubmit = async (values: z.infer<typeof joinOrgSchema>) => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest(
        '/api/oauth/complete-registration', 
        'POST', 
        {
          googleId,
          action: 'join',
          invitationCode: values.invitationCode,
        }
      );

      if (response.success) {
        toast({
          title: "Organization joined",
          description: "You have successfully joined the organization",
          variant: "default",
        });
        
        // Redirect to the specified page (usually dashboard for joining existing orgs)
        if (response.redirectTo) {
          setLocation(response.redirectTo);
        } else {
          setLocation('/dashboard');
        }
      } else {
        toast({
          title: "Failed to join",
          description: response.message || "Could not join the organization",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      // Handle error gracefully without logging
      let errorMessage = "An unexpected error occurred";
      
      // Try to extract a more specific error message
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Production code - Debug function removed

  // Verify invitation code when it changes
  useEffect(() => {
    const invitationCode = joinOrgForm.watch("invitationCode");
    if (invitationCode && invitationCode.length >= 6) {
      const timer = setTimeout(() => {
        handleVerifyInvitation(invitationCode);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setVerifiedOrg(null);
    }
  }, [joinOrgForm.watch("invitationCode")]);

  // If loading or error, show appropriate UI
  if (isLoadingUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading user data...</p>
      </div>
    );
  }

  if (isErrorUser || !pendingUserData?.success) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p>Could not find your account information. This could be due to:</p>
            <ul className="mt-2 list-disc pl-6 text-left">
              <li>Your session has expired</li>
              <li>You have already completed the registration</li>
              <li>An error occurred in the authentication process</li>
            </ul>
            
            <div className="mt-4 rounded-md bg-amber-50 p-3 text-left text-sm text-amber-800">
              <p className="font-medium">Debug information:</p>
              <p>Google ID: {googleId || 'Not provided'}</p>
              {pendingUserData && (
                <p>Error message: {pendingUserData.message || 'No specific error message'}</p>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => window.location.href = '/auth/login'}
              >
                Return to Login
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => window.location.href = '/auth/login'}>
              Return to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Main component UI
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Welcome to SmartWater Pools</CardTitle>
          <CardDescription className="text-center">
            Complete your account setup by creating or joining an organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-primary shadow-md">
                <img 
                  src={pendingUserData.user.photoUrl || '/placeholder-user.png'} 
                  alt="User" 
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-2 font-medium">{pendingUserData.user.displayName}</p>
              <p className="text-sm text-muted-foreground">{pendingUserData.user.email}</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Organization</TabsTrigger>
              <TabsTrigger value="join">Join Organization</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="mt-4">
              <Form {...createOrgForm}>
                <form onSubmit={createOrgForm.handleSubmit(onCreateOrgSubmit)} className="space-y-6">
                  <FormField
                    control={createOrgForm.control}
                    name="organizationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your organization name" 
                            {...field} 
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createOrgForm.control}
                    name="organizationType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Organization Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                            disabled={isLoading}
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="company" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Company
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="individual" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Individual
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Organization
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="join" className="mt-4">
              <Form {...joinOrgForm}>
                <form onSubmit={joinOrgForm.handleSubmit(onJoinOrgSubmit)} className="space-y-6">
                  <FormField
                    control={joinOrgForm.control}
                    name="invitationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invitation Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your invitation code" 
                            {...field} 
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {verifiedOrg && (
                    <div className="rounded-md bg-primary/10 p-3">
                      <p className="text-sm font-medium">
                        You will join:
                      </p>
                      <p className="mt-1 font-medium">{verifiedOrg.name}</p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || !verifiedOrg}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Join Organization
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex flex-col items-center justify-center gap-2">
          <p className="text-sm text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
          <div className="flex gap-2">
            <Button variant="link" onClick={() => window.location.href = '/auth/login'}>
              Back to Login
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}