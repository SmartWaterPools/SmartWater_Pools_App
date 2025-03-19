import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Save, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { flushSync } from 'react-dom';
import { apiRequest } from '@/lib/queryClient';
import { FleetmaticsConfig } from '../types/fleetmatics';

const fleetmaticsFormSchema = z.object({
  apiKey: z.string().min(1, { message: 'API key is required' }),
  apiSecret: z.string().min(1, { message: 'API secret is required' }),
  baseUrl: z.string().url({ message: 'Please enter a valid URL' }).default('https://fim.us.fleetmatics.com/api'),
  accountId: z.string().optional().nullable(),
  syncFrequencyMinutes: z.coerce.number().int().min(5).max(1440).default(15),
  isActive: z.boolean().default(true),
});

type FleetmaticsFormValues = z.infer<typeof fleetmaticsFormSchema>;

export default function FleetmaticsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Query to load existing configuration
  const {
    data: configData,
    isLoading: isLoadingConfig,
    error: configError
  } = useQuery<FleetmaticsConfig>({
    queryKey: ['/api/fleetmatics/config'],
  });
  
  // Mutation to save configuration
  const {
    mutate: saveConfig,
    isPending: isSaving,
  } = useMutation({
    mutationFn: async (values: FleetmaticsFormValues) => {
      if (configData && 'id' in configData) {
        // Update existing config
        return apiRequest(`/api/fleetmatics/config/${configData.id}`, 'PATCH', values);
      } else {
        // Create new config
        return apiRequest('/api/fleetmatics/config', 'POST', {
          ...values,
          organizationId: 1, // Default to first organization
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Configuration saved",
        description: "Fleetmatics integration settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/fleetmatics/config'] });
    },
    onError: (error) => {
      toast({
        title: "Error saving configuration",
        description: error.message || "An error occurred while saving the configuration.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to test connection
  const {
    mutate: testConnection,
    isPending: isTesting,
  } = useMutation({
    mutationFn: async () => {
      setIsTestingConnection(true);
      try {
        return await apiRequest('/api/fleetmatics/test-connection', 'GET');
      } finally {
        setTimeout(() => {
          setIsTestingConnection(false);
        }, 500);
      }
    },
    onSuccess: (data) => {
      setTestResult({
        success: true,
        message: "Successfully connected to Fleetmatics API!"
      });
      toast({
        title: "Connection successful",
        description: "Successfully connected to Fleetmatics API.",
      });
    },
    onError: (error) => {
      setTestResult({
        success: false,
        message: error.message || "Failed to connect to Fleetmatics API."
      });
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to Fleetmatics API.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to trigger manual sync
  const {
    mutate: syncFleetmatics,
    isPending: isSyncing,
  } = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/fleetmatics/sync', 'POST');
    },
    onSuccess: (data) => {
      toast({
        title: "Synchronization complete",
        description: `Synced ${data.syncedVehicles} vehicles and ${data.syncedLocations} location records.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Synchronization failed",
        description: error.message || "An error occurred during synchronization.",
        variant: "destructive",
      });
    },
  });
  
  // Set up form with existing data or defaults
  const form = useForm<FleetmaticsFormValues>({
    resolver: zodResolver(fleetmaticsFormSchema),
    defaultValues: {
      apiKey: '',
      apiSecret: '',
      baseUrl: 'https://fim.us.fleetmatics.com/api',
      accountId: null,
      syncFrequencyMinutes: 15,
      isActive: true,
    },
  });
  
  // Update form when config data is loaded - wrapped in useEffect to prevent infinite rerenders
  useEffect(() => {
    if (configData && !form.formState.isDirty) {
      const config = configData as FleetmaticsConfig;
      form.reset({
        apiKey: config.apiKey,
        apiSecret: config.apiSecret || '',
        baseUrl: config.baseUrl,
        accountId: config.accountId,
        syncFrequencyMinutes: config.syncFrequencyMinutes,
        isActive: config.isActive,
      });
    }
  }, [configData, form]);
  
  const onSubmit = (values: FleetmaticsFormValues) => {
    saveConfig(values);
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Fleetmatics Integration Settings</h1>
      
      {isLoadingConfig ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : configError ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">Error loading configuration. Please try again.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure your Fleetmatics API credentials to enable integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your Fleetmatics API key" {...field} />
                        </FormControl>
                        <FormDescription>
                          The API key for authentication with Fleetmatics
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="apiSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Secret</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter your Fleetmatics API secret" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          The secret key required for API authentication
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="baseUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://fim.us.fleetmatics.com/api" {...field} />
                        </FormControl>
                        <FormDescription>
                          The base URL for the Fleetmatics API
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="accountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account ID (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your Fleetmatics account ID if needed" 
                            {...field} 
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormDescription>
                          Only required for specific account configurations
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator className="my-4" />
                  
                  <FormField
                    control={form.control}
                    name="syncFrequencyMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sync Frequency (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={5} 
                            max={1440} 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          How often to sync vehicle locations (minimum 5 minutes)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Status</FormLabel>
                          <FormDescription>
                            Enable or disable the Fleetmatics integration
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
                  
                  <div className="flex flex-col sm:flex-row gap-2 pt-4">
                    <Button 
                      type="submit" 
                      disabled={isSaving || !form.formState.isDirty} 
                      className="flex items-center"
                    >
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Configuration
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => testConnection()}
                      disabled={isTesting || isTestingConnection}
                      className="flex items-center"
                    >
                      {(isTesting || isTestingConnection) ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : testResult?.success ? (
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      ) : testResult?.success === false ? (
                        <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                      ) : null}
                      Test Connection
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => syncFleetmatics()}
                      disabled={isSyncing || !(configData && configData.isActive)}
                      className="flex items-center"
                    >
                      {isSyncing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Sync Now
                    </Button>
                  </div>
                  
                  {testResult && (
                    <div className={`mt-4 p-4 rounded-md ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      <p className="flex items-center">
                        {testResult.success ? (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        ) : (
                          <AlertCircle className="mr-2 h-4 w-4" />
                        )}
                        {testResult.message}
                      </p>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {configData && (
            <Card>
              <CardHeader>
                <CardTitle>Integration Status</CardTitle>
                <CardDescription>
                  Current status of your Fleetmatics integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <p className="mt-1">
                      {configData.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          Inactive
                        </span>
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Last Sync</h3>
                    <p className="mt-1">
                      {configData.lastSyncTime ? (
                        new Date(configData.lastSyncTime as string).toLocaleString()
                      ) : (
                        'Never'
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Sync Frequency</h3>
                    <p className="mt-1">
                      {configData.syncFrequencyMinutes} minutes
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Created</h3>
                    <p className="mt-1">
                      {new Date(configData.createdAt as string).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="text-sm text-gray-500">
                Last updated: {new Date(configData.updatedAt as string).toLocaleString()}
              </CardFooter>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Mapping</CardTitle>
              <CardDescription>
                Map your technician vehicles to Fleetmatics vehicles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                This functionality allows you to map each of your technician vehicles to the corresponding
                vehicle in your Fleetmatics account. This mapping enables accurate tracking and history recording.
              </p>
              
              <Button 
                onClick={() => setLocation('/fleetmatics/vehicle-mapping')}
                className="flex items-center"
              >
                Manage Vehicle Mapping
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}