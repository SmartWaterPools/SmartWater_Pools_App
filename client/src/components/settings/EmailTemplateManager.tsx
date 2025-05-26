import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Mail, Save, Eye, RotateCcw, Palette } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

const emailTemplateSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  htmlTemplate: z.string().min(1, "HTML template is required"),
  textTemplate: z.string().min(1, "Text template is required")
});

type EmailTemplateFormData = z.infer<typeof emailTemplateSchema>;

interface EmailTemplateManagerProps {
  organizationId: number;
}

const DEFAULT_TEMPLATES = {
  serviceCompletion: {
    name: "Service Completion",
    description: "Sent to customers when pool service is completed",
    subject: "Your Pool Service is Complete - {{customerName}}",
    htmlTemplate: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #0284c7;">Service Complete!</h2>
  
  <p>Hi {{customerName}},</p>
  
  <p>We've just completed your pool service at {{serviceAddress}}. Here's what we did:</p>
  
  <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h3>Service Details:</h3>
    <ul>
      <li><strong>Service Date:</strong> {{serviceDate}}</li>
      <li><strong>Technician:</strong> {{technicianName}}</li>
      <li><strong>Service Type:</strong> {{serviceType}}</li>
    </ul>
  </div>
  
  <p>{{serviceNotes}}</p>
  
  <p>If you have any questions about today's service, please don't hesitate to reach out to us.</p>
  
  <p>Thank you for choosing us for your pool care needs!</p>
  
  {{emailSignature}}
</div>`,
    textTemplate: `Hi {{customerName}},

We've just completed your pool service at {{serviceAddress}}. Here's what we did:

Service Details:
- Service Date: {{serviceDate}}
- Technician: {{technicianName}}
- Service Type: {{serviceType}}

{{serviceNotes}}

If you have any questions about today's service, please don't hesitate to reach out to us.

Thank you for choosing us for your pool care needs!

{{emailSignature}}`
  },
  appointmentReminder: {
    name: "Appointment Reminder",
    description: "Sent to customers before scheduled appointments",
    subject: "Pool Service Reminder - {{appointmentDate}}",
    htmlTemplate: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #0284c7;">Service Reminder</h2>
  
  <p>Hi {{customerName}},</p>
  
  <p>This is a friendly reminder that we have your pool service scheduled for:</p>
  
  <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h3>Appointment Details:</h3>
    <ul>
      <li><strong>Date:</strong> {{appointmentDate}}</li>
      <li><strong>Time:</strong> {{appointmentTime}}</li>
      <li><strong>Service Address:</strong> {{serviceAddress}}</li>
      <li><strong>Technician:</strong> {{technicianName}}</li>
    </ul>
  </div>
  
  <p>Please ensure the pool area is accessible and any pets are secured.</p>
  
  <p>If you need to reschedule or have any special requests, please contact us as soon as possible.</p>
  
  {{emailSignature}}
</div>`,
    textTemplate: `Hi {{customerName}},

This is a friendly reminder that we have your pool service scheduled for:

Appointment Details:
- Date: {{appointmentDate}}
- Time: {{appointmentTime}}
- Service Address: {{serviceAddress}}
- Technician: {{technicianName}}

Please ensure the pool area is accessible and any pets are secured.

If you need to reschedule or have any special requests, please contact us as soon as possible.

{{emailSignature}}`
  },
  maintenanceAlert: {
    name: "Maintenance Alert",
    description: "Sent when urgent maintenance issues are detected",
    subject: "Urgent: Pool Maintenance Required - {{customerName}}",
    htmlTemplate: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc2626;">Urgent Maintenance Required</h2>
  
  <p>Hi {{customerName}},</p>
  
  <p>During our recent service visit, we identified an issue that requires immediate attention:</p>
  
  <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
    <h3 style="color: #dc2626; margin-top: 0;">Issue Detected:</h3>
    <p><strong>{{issueTitle}}</strong></p>
    <p>{{issueDescription}}</p>
    <p><strong>Priority:</strong> {{priorityLevel}}</p>
  </div>
  
  <p>We recommend addressing this issue as soon as possible to prevent further complications and ensure your pool remains safe and functional.</p>
  
  <p>We'll contact you shortly to schedule the necessary repairs. If you have any immediate concerns, please don't hesitate to call us.</p>
  
  {{emailSignature}}
</div>`,
    textTemplate: `Hi {{customerName}},

During our recent service visit, we identified an issue that requires immediate attention:

ISSUE DETECTED:
{{issueTitle}}
{{issueDescription}}
Priority: {{priorityLevel}}

We recommend addressing this issue as soon as possible to prevent further complications and ensure your pool remains safe and functional.

We'll contact you shortly to schedule the necessary repairs. If you have any immediate concerns, please don't hesitate to call us.

{{emailSignature}}`
  }
};

export function EmailTemplateManager({ organizationId }: EmailTemplateManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTemplate, setActiveTemplate] = useState<string>("serviceCompletion");
  const [previewMode, setPreviewMode] = useState<"html" | "text">("html");

  // Fetch organization data including custom templates
  const { data: organization, isLoading } = useQuery({
    queryKey: ['/api/organizations', organizationId],
    enabled: !!organizationId
  });

  const customTemplates = organization?.customEmailTemplates || {};

  const form = useForm<EmailTemplateFormData>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      subject: "",
      htmlTemplate: "",
      textTemplate: ""
    }
  });

  // Update form when template changes
  useState(() => {
    const template = customTemplates[activeTemplate] || DEFAULT_TEMPLATES[activeTemplate as keyof typeof DEFAULT_TEMPLATES];
    if (template) {
      form.reset({
        subject: template.subject,
        htmlTemplate: template.htmlTemplate,
        textTemplate: template.textTemplate
      });
    }
  });

  // Save template mutation
  const saveTemplate = useMutation({
    mutationFn: (data: EmailTemplateFormData) =>
      apiRequest(`/api/organizations/${organizationId}/email-templates/${activeTemplate}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({
        title: "Template saved",
        description: "Your email template has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations', organizationId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving template",
        description: error.message || "Failed to save template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reset to default template
  const resetToDefault = () => {
    const defaultTemplate = DEFAULT_TEMPLATES[activeTemplate as keyof typeof DEFAULT_TEMPLATES];
    if (defaultTemplate) {
      form.reset({
        subject: defaultTemplate.subject,
        htmlTemplate: defaultTemplate.htmlTemplate,
        textTemplate: defaultTemplate.textTemplate
      });
    }
  };

  const onSubmit = (data: EmailTemplateFormData) => {
    saveTemplate.mutate(data);
  };

  const getPreviewContent = () => {
    const values = form.getValues();
    
    // Sample data for preview
    const sampleData = {
      customerName: "John Smith",
      serviceAddress: "123 Pool Lane, Swim City",
      serviceDate: new Date().toLocaleDateString(),
      technicianName: "Mike Johnson",
      serviceType: "Weekly Maintenance",
      serviceNotes: "Pool chemicals balanced, skimmer cleaned, and filter backwashed.",
      appointmentDate: "Tomorrow",
      appointmentTime: "10:00 AM",
      issueTitle: "pH Level Too High",
      issueDescription: "The pool's pH level is currently at 8.2, which is above the recommended range.",
      priorityLevel: "Medium",
      emailSignature: organization?.emailSignature || "Best regards,\nYour Pool Service Team"
    };

    let content = previewMode === "html" ? values.htmlTemplate : values.textTemplate;
    
    // Replace template variables with sample data
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    });

    return content;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Email Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Custom Email Templates
        </CardTitle>
        <CardDescription>
          Create personalized email templates for your customer communications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTemplate} onValueChange={setActiveTemplate} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="serviceCompletion">Service Complete</TabsTrigger>
            <TabsTrigger value="appointmentReminder">Reminders</TabsTrigger>
            <TabsTrigger value="maintenanceAlert">Alerts</TabsTrigger>
          </TabsList>

          {Object.entries(DEFAULT_TEMPLATES).map(([key, template]) => (
            <TabsContent key={key} value={key} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </div>
                <div className="flex gap-2">
                  {customTemplates[key] && (
                    <Badge variant="secondary">Customized</Badge>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetToDefault}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Default
                  </Button>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Subject</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter email subject line..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Use variables like customerName, serviceDate, etc. in double curly braces
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="htmlTemplate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>HTML Template</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter HTML email template..." 
                                rows={15}
                                className="font-mono text-sm"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Rich HTML version of your email
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="textTemplate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Text Template</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter plain text email template..." 
                                rows={10}
                                className="font-mono text-sm"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Plain text fallback version
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Preview</h4>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={previewMode === "html" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPreviewMode("html")}
                          >
                            HTML
                          </Button>
                          <Button
                            type="button"
                            variant={previewMode === "text" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPreviewMode("text")}
                          >
                            Text
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 bg-gray-50 min-h-[400px]">
                        {previewMode === "html" ? (
                          <div 
                            dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                            className="prose prose-sm max-w-none"
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap text-sm font-mono">
                            {getPreviewContent()}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      type="submit" 
                      disabled={saveTemplate.isPending}
                      className="flex-1"
                    >
                      {saveTemplate.isPending && <Save className="mr-2 h-4 w-4 animate-spin" />}
                      Save Template
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Available Template Variables:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-700">
            <span>{"{{customerName}}"}</span>
            <span>{"{{serviceAddress}}"}</span>
            <span>{"{{serviceDate}}"}</span>
            <span>{"{{technicianName}}"}</span>
            <span>{"{{serviceType}}"}</span>
            <span>{"{{appointmentDate}}"}</span>
            <span>{"{{appointmentTime}}"}</span>
            <span>{"{{emailSignature}}"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}