import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Mail, MessageSquare, Phone, Plus, Trash, RotateCcw, Check, ExternalLink, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define provider types matching the server
const PROVIDER_TYPES = ["gmail", "outlook", "ringcentral", "twilio"] as const;
type ProviderType = (typeof PROVIDER_TYPES)[number];

// Schema for provider data
const providerSchema = z.object({
  type: z.enum(PROVIDER_TYPES),
  name: z.string().min(1, "Name is required"),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  clientId: z.string().nullable().optional(),
  clientSecret: z.string().nullable().optional(),
  apiKey: z.string().nullable().optional(),
  accountSid: z.string().nullable().optional(),
  authToken: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  settings: z.string().nullable().optional(),
});

// Define the type for our form values
type ProviderFormValues = z.infer<typeof providerSchema>;

// Define interface for our provider from the API
interface CommunicationProvider extends ProviderFormValues {
  id: number;
  createdAt: string;
  updatedAt: string;
  lastUsed: string | null;
  refreshToken: string | null;
  accessToken: string | null;
  tokenExpiresAt: string | null;
}

// Gmail connector status type
interface GmailStatus {
  connected: boolean;
  email?: string;
  messagesTotal?: number;
  error?: string;
  source?: 'google_oauth' | 'replit_connector';
  hasRefreshToken?: boolean;
  tokenExpiresAt?: string;
}

// Outlook connection status type
interface OutlookStatus {
  connected: boolean;
  email?: string;
  error?: string;
  source?: 'microsoft_oauth';
  hasRefreshToken?: boolean;
  tokenExpiresAt?: string;
}

// RingCentral connection status type
interface RingCentralStatus {
  connected: boolean;
  phoneNumber?: string;
  error?: string;
  hasRefreshToken?: boolean;
  tokenExpiresAt?: string;
}

export function CommunicationProviders() {
  const [activeTab, setActiveTab] = useState<ProviderType>("gmail");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CommunicationProvider | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Gmail connection status (OAuth-based)
  const { data: gmailStatus, isLoading: isGmailLoading, refetch: refetchGmailStatus } = useQuery<GmailStatus>({
    queryKey: ['/api/emails/connection-status/gmail'],
  });

  // Fetch Outlook connection status (OAuth-based)
  const { data: outlookStatus, isLoading: isOutlookLoading, refetch: refetchOutlookStatus } = useQuery<OutlookStatus>({
    queryKey: ['/api/emails/connection-status/outlook'],
  });

  // Fetch RingCentral connection status (OAuth-based)
  const { data: ringCentralStatus, isLoading: isRingCentralLoading, refetch: refetchRingCentralStatus } = useQuery<RingCentralStatus>({
    queryKey: ['/api/sms/connection-status'],
  });

  // Mutation to disconnect Gmail
  const disconnectGmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/disconnect-gmail');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails/connection-status/gmail'] });
      toast({
        title: "Gmail Disconnected",
        description: "Your Gmail account has been disconnected.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to disconnect Gmail. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation to disconnect Outlook
  const disconnectOutlookMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/disconnect-outlook');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails/connection-status/outlook'] });
      toast({
        title: "Outlook Disconnected",
        description: "Your Outlook account has been disconnected.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to disconnect Outlook. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle connect Gmail button click
  const handleConnectGmail = () => {
    // Redirect to the Gmail OAuth connection route
    window.location.href = '/api/auth/connect-gmail';
  };

  // Handle connect Outlook button click
  const handleConnectOutlook = () => {
    // Show info that Outlook is not yet configured
    toast({
      title: "Outlook Not Available",
      description: "Outlook integration requires Microsoft OAuth configuration. Please contact your administrator.",
      variant: "destructive",
    });
  };

  // Mutation to disconnect RingCentral
  const disconnectRingCentralMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/disconnect-ringcentral');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sms/connection-status'] });
      toast({
        title: "RingCentral Disconnected",
        description: "Your RingCentral account has been disconnected.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to disconnect RingCentral. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle connect RingCentral button click
  const handleConnectRingCentral = () => {
    // Redirect to the RingCentral OAuth connection route
    window.location.href = '/api/auth/connect-ringcentral';
  };

  // Fetch providers
  const { data: providers = [], isLoading } = useQuery<CommunicationProvider[]>({
    queryKey: ['/api/communication-providers'],
    meta: {
      errors: {
        401: "You must be logged in to view communication providers",
        403: "You don't have permission to view communication providers",
      },
    },
  });

  // Create a new provider
  const createProviderMutation = useMutation({
    mutationFn: async (values: ProviderFormValues) => {
      const response = await apiRequest('POST', '/api/communication-providers', values);
      return response.json() as Promise<CommunicationProvider>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication-providers'] });
      setIsCreateModalOpen(false);
      toast({
        title: "Provider Created",
        description: "The communication provider has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  // Update an existing provider
  const updateProviderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ProviderFormValues> }) => {
      const response = await apiRequest('PATCH', `/api/communication-providers/${id}`, data);
      return response.json() as Promise<CommunicationProvider>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication-providers'] });
      setIsEditModalOpen(false);
      setSelectedProvider(null);
      toast({
        title: "Provider Updated",
        description: "The communication provider has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  // Delete a provider
  const deleteProviderMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/communication-providers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communication-providers'] });
      toast({
        title: "Provider Deleted",
        description: "The communication provider has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  // Create form
  const createForm = useForm<ProviderFormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      type: activeTab,
      name: "",
      isDefault: false,
      isActive: true,
      clientId: null,
      clientSecret: null,
      apiKey: null,
      accountSid: null,
      authToken: null,
      email: null,
      phoneNumber: null,
      settings: null,
    },
  });

  // Edit form
  const editForm = useForm<ProviderFormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      type: activeTab,
      name: "",
      isDefault: false,
      isActive: true,
      clientId: null,
      clientSecret: null,
      apiKey: null,
      accountSid: null,
      authToken: null,
      email: null,
      phoneNumber: null,
      settings: null,
    },
  });

  // Filter providers by type
  const filteredProviders = providers.filter(
    (provider: CommunicationProvider) => provider.type === activeTab
  );

  // Handle form submission for creating a provider
  function onCreateSubmit(data: ProviderFormValues) {
    createProviderMutation.mutate(data);
  }

  // Handle form submission for editing a provider
  function onEditSubmit(data: ProviderFormValues) {
    if (selectedProvider) {
      updateProviderMutation.mutate({ id: selectedProvider.id, data });
    }
  }

  // Handle provider deletion
  function handleDeleteProvider(id: number) {
    deleteProviderMutation.mutate(id);
  }

  // Handle opening the edit modal
  function handleEdit(provider: CommunicationProvider) {
    setSelectedProvider(provider);
    editForm.reset({
      type: provider.type,
      name: provider.name,
      isDefault: provider.isDefault,
      isActive: provider.isActive,
      clientId: provider.clientId,
      clientSecret: provider.clientSecret,
      apiKey: provider.apiKey,
      accountSid: provider.accountSid,
      authToken: provider.authToken,
      email: provider.email,
      phoneNumber: provider.phoneNumber,
      settings: provider.settings,
    });
    setIsEditModalOpen(true);
  }

  // Handle toggling a provider as default
  function handleSetDefault(provider: CommunicationProvider) {
    updateProviderMutation.mutate({
      id: provider.id,
      data: { isDefault: true },
    });
  }

  // Handle toggling a provider's active status
  function handleToggleActive(provider: CommunicationProvider) {
    updateProviderMutation.mutate({
      id: provider.id,
      data: { isActive: !provider.isActive },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Communication Providers</h3>
          <p className="text-sm text-muted-foreground">
            Manage external communication services for email, SMS, and calls
          </p>
        </div>
        {/* Hide Add Provider button when Gmail is connected and on Gmail tab */}
        {!(activeTab === "gmail" && gmailStatus?.connected) && (
          <Button 
            onClick={() => {
              createForm.reset({
                type: activeTab,
                name: "",
                isDefault: filteredProviders.length === 0, // Set as default if it's the first of its type
                isActive: true,
                clientId: null,
                clientSecret: null,
                apiKey: null,
                accountSid: null,
                authToken: null,
                email: null,
                phoneNumber: null,
                settings: null,
              });
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Provider</span>
          </Button>
        )}
      </div>

      <Tabs
        defaultValue="gmail"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ProviderType)}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="gmail" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>Gmail</span>
          </TabsTrigger>
          <TabsTrigger value="outlook" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>Outlook</span>
          </TabsTrigger>
          <TabsTrigger value="ringcentral" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span>RingCentral</span>
          </TabsTrigger>
          <TabsTrigger value="twilio" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Twilio</span>
          </TabsTrigger>
        </TabsList>

        {PROVIDER_TYPES.map((type) => (
          <TabsContent key={type} value={type}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {type === "gmail" && <Mail className="h-5 w-5" />}
                  {type === "outlook" && <Mail className="h-5 w-5" />}
                  {type === "ringcentral" && <Phone className="h-5 w-5" />}
                  {type === "twilio" && <MessageSquare className="h-5 w-5" />}
                  {type.charAt(0).toUpperCase() + type.slice(1)} Integration
                </CardTitle>
                <CardDescription>
                  {type === "gmail" && "Configure Gmail for sending email communications"}
                  {type === "outlook" && "Configure Outlook/Microsoft 365 for sending email communications"}
                  {type === "ringcentral" && "Configure RingCentral for voice and SMS communications"}
                  {type === "twilio" && "Configure Twilio for SMS and voice communications"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Show Gmail connection status */}
                {type === "gmail" && (
                  <>
                    {isGmailLoading ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Checking Gmail connection...
                      </div>
                    ) : gmailStatus?.connected ? (
                      <div className="py-6 border rounded-md bg-green-50/50 dark:bg-green-900/20">
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 flex items-center gap-1 text-sm px-3 py-1">
                              <Check className="h-4 w-4" />
                              Gmail Connected
                            </Badge>
                          </div>
                          {gmailStatus.email && (
                            <p className="text-sm text-muted-foreground">
                              Connected as <strong>{gmailStatus.email}</strong>
                            </p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm" asChild data-testid="btn-go-to-communications">
                              <Link to="/communications">
                                <Mail className="h-4 w-4 mr-2" />
                                Go to Communications
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  disabled={disconnectGmailMutation.isPending}
                                  data-testid="btn-disconnect-gmail"
                                >
                                  {disconnectGmailMutation.isPending ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Trash className="h-4 w-4 mr-2" />
                                  )}
                                  Disconnect
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Disconnect Gmail?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove the Gmail connection from your account. You won't be able to sync or send emails until you reconnect.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => disconnectGmailMutation.mutate()}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Disconnect
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Gmail is connected via Google OAuth. Use the Communications page to sync and view emails.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center border rounded-md">
                        <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground mb-4">Gmail not connected</p>
                        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                          Connect your Gmail account to sync emails, send notifications, and link communications to your projects, repairs, and clients.
                        </p>
                        <Button
                          onClick={handleConnectGmail}
                          className="flex items-center gap-2"
                          data-testid="btn-connect-gmail"
                        >
                          <Mail className="h-4 w-4" />
                          Connect Gmail Account
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {/* Show Outlook connection status */}
                {type === "outlook" && (
                  <>
                    {isOutlookLoading ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Checking Outlook connection...
                      </div>
                    ) : outlookStatus?.connected ? (
                      <div className="py-6 border rounded-md bg-blue-50/50 dark:bg-blue-900/20">
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-400 flex items-center gap-1 text-sm px-3 py-1">
                              <Check className="h-4 w-4" />
                              Outlook Connected
                            </Badge>
                          </div>
                          {outlookStatus.email && (
                            <p className="text-sm text-muted-foreground">
                              Connected as <strong>{outlookStatus.email}</strong>
                            </p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm" asChild data-testid="btn-outlook-go-to-communications">
                              <Link to="/communications">
                                <Mail className="h-4 w-4 mr-2" />
                                Go to Communications
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  disabled={disconnectOutlookMutation.isPending}
                                  data-testid="btn-disconnect-outlook"
                                >
                                  {disconnectOutlookMutation.isPending ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Trash className="h-4 w-4 mr-2" />
                                  )}
                                  Disconnect
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Disconnect Outlook?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove the Outlook connection from your account. You won't be able to sync or send emails until you reconnect.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => disconnectOutlookMutation.mutate()}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Disconnect
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Outlook is connected via Microsoft OAuth. Use the Communications page to sync and view emails.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center border rounded-md">
                        <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground mb-4">Outlook not connected</p>
                        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                          Connect your Outlook or Microsoft 365 account to sync emails and send notifications.
                        </p>
                        <Button
                          onClick={handleConnectOutlook}
                          className="flex items-center gap-2"
                          variant="outline"
                          data-testid="btn-connect-outlook"
                        >
                          <Mail className="h-4 w-4" />
                          Connect Outlook Account
                        </Button>
                        <p className="text-xs text-muted-foreground mt-4">
                          Note: Microsoft OAuth integration is not yet configured.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Show RingCentral connection status */}
                {type === "ringcentral" && (
                  <>
                    {isRingCentralLoading ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Checking RingCentral connection...
                      </div>
                    ) : ringCentralStatus?.connected ? (
                      <div className="py-6 border rounded-md bg-green-50/50 dark:bg-green-900/20">
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 flex items-center gap-1 text-sm px-3 py-1">
                              <Check className="h-4 w-4" />
                              RingCentral Connected
                            </Badge>
                          </div>
                          {ringCentralStatus.phoneNumber && (
                            <p className="text-sm text-muted-foreground">
                              Connected as <strong>{ringCentralStatus.phoneNumber}</strong>
                            </p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm" asChild data-testid="btn-go-to-communications-ringcentral">
                              <Link to="/communications">
                                <Phone className="h-4 w-4 mr-2" />
                                Go to Communications
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  disabled={disconnectRingCentralMutation.isPending}
                                  data-testid="btn-disconnect-ringcentral"
                                >
                                  {disconnectRingCentralMutation.isPending ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Trash className="h-4 w-4 mr-2" />
                                  )}
                                  Disconnect
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Disconnect RingCentral?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove the RingCentral connection from your account. You won't be able to send or receive SMS until you reconnect.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => disconnectRingCentralMutation.mutate()}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Disconnect
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            RingCentral is connected via OAuth. Use the Communications page to send and view SMS messages.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center border rounded-md">
                        <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground mb-4">RingCentral not connected</p>
                        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                          Connect your RingCentral account to send SMS messages, receive notifications, and communicate with clients via text.
                        </p>
                        <Button
                          onClick={handleConnectRingCentral}
                          className="flex items-center gap-2"
                          data-testid="btn-connect-ringcentral"
                        >
                          <Phone className="h-4 w-4" />
                          Connect RingCentral Account
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {/* Show Twilio provider configuration */}
                {type === "twilio" && (isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading providers...</div>
                ) : filteredProviders.length === 0 ? (
                  <div className="py-8 text-center border rounded-md">
                    <p className="text-muted-foreground mb-4">No Twilio providers configured</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        createForm.reset({
                          type: "twilio" as ProviderType,
                          name: "",
                          isDefault: true,
                          isActive: true,
                          clientId: null,
                          clientSecret: null,
                          apiKey: null,
                          accountSid: null,
                          authToken: null,
                          email: null,
                          phoneNumber: null,
                          settings: null,
                        });
                        setIsCreateModalOpen(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Twilio Provider</span>
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead>Credentials</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProviders.map((provider: CommunicationProvider) => (
                        <TableRow key={provider.id}>
                          <TableCell className="font-medium">{provider.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={provider.isActive}
                                onCheckedChange={() => handleToggleActive(provider)}
                              />
                              <span>{provider.isActive ? "Active" : "Inactive"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {provider.isDefault ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Default
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetDefault(provider)}
                                className="text-xs h-7"
                              >
                                Set as default
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <span>{provider.accountSid ? "Configured" : "Not configured"}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleEdit(provider)}
                              >
                                <span className="sr-only">Edit</span>
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive"
                                  >
                                    <span className="sr-only">Delete</span>
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="w-[95%] max-w-[500px] p-4 md:p-6">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete {provider.name}?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently remove this provider. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                    <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteProvider(provider.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ))}
              </CardContent>
              <CardFooter className="border-t p-4 flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {type === "gmail" && gmailStatus?.connected
                    ? "Gmail connected via Google OAuth"
                    : type === "ringcentral" && ringCentralStatus?.connected
                    ? "RingCentral connected via OAuth"
                    : filteredProviders.length > 0
                    ? `${filteredProviders.length} ${
                        filteredProviders.length === 1 ? "provider" : "providers"
                      } configured`
                    : "No providers configured"}
                </div>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ExternalLink className="h-3 w-3" />
                  <span>Documentation</span>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Create provider modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="w-[95%] max-w-[500px] p-4 md:p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Add New Provider</DialogTitle>
            <DialogDescription>
              Configure a new communication provider for the system.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Type</FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setActiveTab(value as ProviderType);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROVIDER_TYPES.map((type) => (
                          <SelectItem 
                            key={type} 
                            value={type}
                            disabled={type === "gmail" && gmailStatus?.connected}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                            {type === "gmail" && gmailStatus?.connected && " (Connected via Replit)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Company Gmail" {...field} />
                    </FormControl>
                    <FormDescription>
                      A name to identify this provider configuration
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Default Provider</FormLabel>
                      <FormDescription>
                        Make this the default provider for this type
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
                control={createForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Enable or disable this provider
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

              {/* Dynamic fields based on provider type */}
              {createForm.watch("type") === "gmail" && (
                <>
                  <FormField
                    control={createForm.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="OAuth 2.0 Client ID" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="clientSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Secret</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="OAuth 2.0 Client Secret" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="sender@yourdomain.com" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormDescription>
                          The email address that will be used to send emails
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {createForm.watch("type") === "outlook" && (
                <>
                  <FormField
                    control={createForm.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Microsoft Application Client ID" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="clientSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Secret</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Microsoft Application Secret" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="sender@yourdomain.com" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormDescription>
                          The Microsoft 365 email address that will be used to send emails
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {createForm.watch("type") === "ringcentral" && (
                <>
                  <FormField
                    control={createForm.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="RingCentral Client ID" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="clientSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Secret</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="RingCentral Client Secret" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+15551234567" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormDescription>
                          The RingCentral phone number to use for SMS and calls
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {createForm.watch("type") === "twilio" && (
                <>
                  <FormField
                    control={createForm.control}
                    name="accountSid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account SID</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Twilio Account SID" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="authToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auth Token</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Twilio Auth Token" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+15551234567" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormDescription>
                          The Twilio phone number to use for SMS
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={createForm.control}
                name="settings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Settings (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"key": "value"}'
                        className="font-mono"
                        rows={3}
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional JSON configuration for provider-specific settings
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createProviderMutation.isPending}
                >
                  {createProviderMutation.isPending ? "Creating..." : "Create Provider"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit provider modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-[95%] max-w-[500px] p-4 md:p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Provider</DialogTitle>
            <DialogDescription>
              Update the communication provider configuration.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Type</FormLabel>
                    <FormControl>
                      <Input 
                        disabled 
                        value={field.value.charAt(0).toUpperCase() + field.value.slice(1)} 
                      />
                    </FormControl>
                    <FormDescription>
                      Provider type cannot be changed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Company Gmail" {...field} />
                    </FormControl>
                    <FormDescription>
                      A name to identify this provider configuration
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Default Provider</FormLabel>
                      <FormDescription>
                        Make this the default provider for this type
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={field.value} // Can't unset default, need to set another one
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Enable or disable this provider
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

              {/* Dynamic fields based on provider type */}
              {editForm.watch("type") === "gmail" && (
                <>
                  <FormField
                    control={editForm.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="OAuth 2.0 Client ID" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="clientSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Secret</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="OAuth 2.0 Client Secret" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="sender@yourdomain.com" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormDescription>
                          The email address that will be used to send emails
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {editForm.watch("type") === "outlook" && (
                <>
                  <FormField
                    control={editForm.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Microsoft Application Client ID" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="clientSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Secret</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Microsoft Application Secret" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="sender@yourdomain.com" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormDescription>
                          The Microsoft 365 email address that will be used to send emails
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {editForm.watch("type") === "ringcentral" && (
                <>
                  <FormField
                    control={editForm.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="RingCentral Client ID" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="clientSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Secret</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="RingCentral Client Secret" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+15551234567" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormDescription>
                          The RingCentral phone number to use for SMS and calls
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {editForm.watch("type") === "twilio" && (
                <>
                  <FormField
                    control={editForm.control}
                    name="accountSid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account SID</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Twilio Account SID" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="authToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auth Token</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Twilio Auth Token" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+15551234567" 
                            {...field} 
                            value={field.value || ""} 
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormDescription>
                          The Twilio phone number to use for SMS
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={editForm.control}
                name="settings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Settings (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"key": "value"}'
                        className="font-mono"
                        rows={3}
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional JSON configuration for provider-specific settings
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateProviderMutation.isPending}
                >
                  {updateProviderMutation.isPending ? "Updating..." : "Update Provider"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}