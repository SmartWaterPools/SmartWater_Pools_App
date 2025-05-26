import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Mail, Building, Save, TestTube } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import OAuthEmailProviderSetup from "./OAuthEmailProviderSetup";

const organizationEmailSchema = z.object({
  emailFromName: z.string().min(1, "Company name is required"),
  emailFromAddress: z.string().email("Please enter a valid email address"),
  emailSignature: z.string().optional()
});

type OrganizationEmailFormData = z.infer<typeof organizationEmailSchema>;

interface OrganizationEmailSettingsProps {
  organizationId: number;
}

export function OrganizationEmailSettings({ organizationId }: OrganizationEmailSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  // Fetch organization data
  const { data: organization, isLoading } = useQuery({
    queryKey: ['/api/organizations', organizationId],
    enabled: !!organizationId
  });

  const form = useForm<OrganizationEmailFormData>({
    resolver: zodResolver(organizationEmailSchema),
    defaultValues: {
      emailFromName: organization?.emailFromName || "",
      emailFromAddress: organization?.emailFromAddress || "",
      emailSignature: organization?.emailSignature || ""
    }
  });

  // Update form when organization data loads
  useState(() => {
    if (organization) {
      form.reset({
        emailFromName: organization.emailFromName || "",
        emailFromAddress: organization.emailFromAddress || "",
        emailSignature: organization.emailSignature || ""
      });
    }
  });

  // Update organization email settings
  const updateEmailSettings = useMutation({
    mutationFn: (data: OrganizationEmailFormData) =>
      apiRequest(`/api/organizations/${organizationId}/email-settings`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({
        title: "Email settings updated",
        description: "Your organization's email configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', organizationId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating email settings",
        description: error.message || "Failed to update email settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Test email configuration
  const testEmailSettings = useMutation({
    mutationFn: (data: OrganizationEmailFormData) =>
      apiRequest(`/api/organizations/${organizationId}/email-settings/test`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({
        title: "Test email sent successfully",
        description: "Check your inbox to verify the email configuration is working.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test email failed",
        description: error.message || "Failed to send test email. Please check your settings.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OrganizationEmailFormData) => {
    updateEmailSettings.mutate(data);
  };

  const handleTestEmail = () => {
    const currentData = form.getValues();
    setIsTestingEmail(true);
    testEmailSettings.mutate(currentData, {
      onSettled: () => setIsTestingEmail(false)
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Company Email Settings
        </CardTitle>
        <CardDescription>
          Configure how your emails appear to customers. All notifications and communications will use these settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="emailFromName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Blue Wave Pool Service" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    This name will appear in the "From" field of all emails sent to customers
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emailFromAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reply-To Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder="e.g. service@yourcompany.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Customers will reply to this email address. Make sure you can receive emails at this address.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emailSignature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Signature (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={`Best regards,
Your Pool Service Team
Phone: (555) 123-4567
Email: service@yourcompany.com`}
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    This signature will be added to the bottom of all emails sent to customers
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4 border-t">
              <Button 
                type="submit" 
                disabled={updateEmailSettings.isPending}
                className="flex-1"
              >
                {updateEmailSettings.isPending && <Save className="mr-2 h-4 w-4 animate-spin" />}
                Save Email Settings
              </Button>
              
              <Button 
                type="button"
                variant="outline"
                onClick={handleTestEmail}
                disabled={isTestingEmail || testEmailSettings.isPending}
              >
                {(isTestingEmail || testEmailSettings.isPending) && <TestTube className="mr-2 h-4 w-4 animate-spin" />}
                Test Configuration
              </Button>
            </div>
          </form>
        </Form>

        {(form.watch('emailFromName') || form.watch('emailFromAddress')) && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm text-gray-900 mb-2">Email Preview:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>From:</strong> {form.watch('emailFromName') || 'Your Company'} &lt;{form.watch('emailFromAddress') || 'your@email.com'}&gt;</div>
              <div><strong>Subject:</strong> Service Appointment Confirmation</div>
              <div className="pt-2 text-xs">
                Your customers will see emails sent from this address and can reply directly to you.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* OAuth Email Provider Setup */}
    <OAuthEmailProviderSetup 
      organizationId={organizationId}
      onProviderAdded={() => {
        toast({
          title: "Provider connected",
          description: "Your email provider has been connected successfully"
        });
        queryClient.invalidateQueries({ queryKey: ['/api/organizations', organizationId] });
      }}
    />
    </div>
  );
}