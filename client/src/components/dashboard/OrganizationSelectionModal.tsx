import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface OrganizationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleId: string;
  suggestedOrganizationId?: string;
  onSuccess: () => void;
}

export default function OrganizationSelectionModal({ 
  isOpen, 
  onClose, 
  googleId, 
  suggestedOrganizationId,
  onSuccess 
}: OrganizationSelectionModalProps) {
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
  const { data: pendingUserData, isLoading: isLoadingUser } = useQuery({
    queryKey: ['/api/oauth/pending', googleId],
    enabled: !!googleId && isOpen,
  });

  // Handle joining suggested organization
  const handleJoinSuggestedOrg = async () => {
    if (!suggestedOrganizationId || !pendingUserData?.user) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest('/api/oauth/complete-registration', 'POST', {
        googleId: googleId,
        organizationId: parseInt(suggestedOrganizationId),
        role: 'client'
      });

      if (response.success) {
        toast({
          title: "Successfully joined organization!",
          description: "Welcome! Redirecting to dashboard...",
        });
        
        onSuccess();
        onClose();
        
        // Refresh the page to load the authenticated state
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Error joining suggested organization:', error);
      toast({
        title: "Error joining organization",
        description: "There was a problem joining the organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle verification of invitation code
  const handleVerifyInvitation = async (code: string) => {
    try {
      const response = await apiRequest('/api/verify-invitation', 'POST', { code });
      if (response.success && response.organization) {
        setVerifiedOrg(response.organization);
      } else {
        setVerifiedOrg(null);
        toast({
          title: "Invalid invitation code",
          description: "Please check the code and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setVerifiedOrg(null);
      toast({
        title: "Error verifying invitation",
        description: "Could not verify the invitation code.",
        variant: "destructive",
      });
    }
  };

  // Watch for changes in invitation code
  useEffect(() => {
    const subscription = joinOrgForm.watch((value, { name }) => {
      if (name === "invitationCode" && value.invitationCode && value.invitationCode.length >= 6) {
        handleVerifyInvitation(value.invitationCode);
      } else if (name === "invitationCode") {
        setVerifiedOrg(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [joinOrgForm.watch]);

  // Handle create organization form submission
  const onCreateOrgSubmit = async (values: z.infer<typeof createOrgSchema>) => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest('/api/oauth/complete-registration', 'POST', {
        googleId,
        action: 'create',
        organizationName: values.organizationName,
        organizationType: values.organizationType,
      });

      if (response.success) {
        toast({
          title: "Organization created",
          description: "Your organization has been created successfully",
        });
        
        onSuccess();
        onClose();
        
        // Refresh the page to load the authenticated state
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast({
          title: "Failed to create organization",
          description: response.message || "Could not create the organization",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
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
      
      const response = await apiRequest('/api/oauth/complete-registration', 'POST', {
        googleId,
        action: 'join',
        invitationCode: values.invitationCode,
      });

      if (response.success) {
        toast({
          title: "Organization joined",
          description: "You have successfully joined the organization",
        });
        
        onSuccess();
        onClose();
        
        // Refresh the page to load the authenticated state
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast({
          title: "Failed to join",
          description: response.message || "Could not join the organization",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingUser) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading user data...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!pendingUserData?.success) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              Could not find your account information. Please try signing in again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Welcome to SmartWater Pools</DialogTitle>
          <DialogDescription>
            Complete your account setup by creating or joining an organization
          </DialogDescription>
        </DialogHeader>

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

        {/* Show suggested organization option for same domain users */}
        {suggestedOrganizationId && pendingUserData?.user?.suggestedOrganizationName && (
          <div className="mb-6 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-primary mb-2">Join Your Organization</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We found that your email domain matches {pendingUserData.user.suggestedOrganizationName}. You can join this organization directly.
              </p>
              <Button 
                onClick={handleJoinSuggestedOrg}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  `Join ${pendingUserData.user.suggestedOrganizationName}`
                )}
              </Button>
            </div>
            
            <div className="mt-4 flex items-center">
              <div className="flex-1 border-t border-muted-foreground/20"></div>
              <span className="px-3 text-xs text-muted-foreground">OR</span>
              <div className="flex-1 border-t border-muted-foreground/20"></div>
            </div>
          </div>
        )}

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
                    <FormItem>
                      <FormLabel>Organization Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                          disabled={isLoading}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="company" id="company" />
                            <Label htmlFor="company">Company</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="individual" id="individual" />
                            <Label htmlFor="individual">Individual</Label>
                          </div>
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

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}