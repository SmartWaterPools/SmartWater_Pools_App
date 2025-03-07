import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, MessageSquare, Video } from "lucide-react";

// Define notification settings schema
const notificationSchema = z.object({
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  appNotifications: z.boolean().default(true),
  clientReminders: z.object({
    enabled: z.boolean().default(true),
    daysInAdvance: z.coerce.number().min(1).max(14).default(3),
    method: z.enum(["email", "sms", "both"]).default("email"),
  }),
  maintenanceAlerts: z.object({
    enabled: z.boolean().default(true),
    frequency: z.enum(["daily", "real-time"]).default("real-time"),
  }),
  serviceReports: z.object({
    sendToClient: z.boolean().default(true),
    ccOwner: z.boolean().default(true),
  }),
  teamUpdates: z.boolean().default(true),
  systemAlerts: z.boolean().default(true),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

export function NotificationSettings() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Form setup
  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      smsNotifications: false,
      appNotifications: true,
      clientReminders: {
        enabled: true,
        daysInAdvance: 3,
        method: "email",
      },
      maintenanceAlerts: {
        enabled: true,
        frequency: "real-time",
      },
      serviceReports: {
        sendToClient: true,
        ccOwner: true,
      },
      teamUpdates: true,
      systemAlerts: true,
    },
  });

  // Mock notification settings save
  const mutation = useMutation({
    mutationFn: async (values: NotificationFormValues) => {
      setIsUpdating(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return values;
    },
    onSuccess: () => {
      setIsUpdating(false);
      toast({
        title: "Settings updated",
        description: "Your notification settings have been saved",
      });
    },
    onError: () => {
      setIsUpdating(false);
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive",
      });
    }
  });

  // Form submission handler
  function onSubmit(data: NotificationFormValues) {
    mutation.mutate(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>
          Configure how and when you receive notifications from the system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notification Channels</h3>
              <div className="grid gap-6 sm:grid-cols-3">
                <Card className="p-4 border border-muted">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>

                <Card className="p-4 border border-muted">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">SMS</p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via text message
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="smsNotifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>

                <Card className="p-4 border border-muted">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">In-App</p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications in the application
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="appNotifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Client Reminders</h3>
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="clientReminders.enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Appointment Reminders</FormLabel>
                        <FormDescription>
                          Send reminders to clients about upcoming appointments
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("clientReminders.enabled") && (
                  <>
                    <FormField
                      control={form.control}
                      name="clientReminders.daysInAdvance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Days in Advance</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={14}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            How many days before the appointment to send the reminder
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="clientReminders.method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notification Method</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="email">Email Only</SelectItem>
                              <SelectItem value="sms">SMS Only</SelectItem>
                              <SelectItem value="both">Both Email & SMS</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            How to send appointment reminders
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Maintenance Alerts</h3>
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="maintenanceAlerts.enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Maintenance Updates</FormLabel>
                        <FormDescription>
                          Receive alerts about maintenance schedule and status changes
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("maintenanceAlerts.enabled") && (
                  <FormField
                    control={form.control}
                    name="maintenanceAlerts.frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alert Frequency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="real-time">Real-time</SelectItem>
                            <SelectItem value="daily">Daily Digest</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How often you want to receive maintenance alerts
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Service Reports</h3>
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="serviceReports.sendToClient"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Send to Client</FormLabel>
                        <FormDescription>
                          Automatically send service reports to clients
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serviceReports.ccOwner"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">CC Business Owner</FormLabel>
                        <FormDescription>
                          Include business owner in service report emails
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Other Notifications</h3>
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="teamUpdates"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Team Updates</FormLabel>
                        <FormDescription>
                          Receive notifications about team activities and updates
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="systemAlerts"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">System Alerts</FormLabel>
                        <FormDescription>
                          Receive important system alerts and notifications
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}