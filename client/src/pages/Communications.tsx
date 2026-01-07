import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Mail, MessageSquare, Phone, Search, AlertCircle, Settings, RefreshCw, Send, Check, Circle, Paperclip, Star, UserPlus, ChevronLeft, ChevronRight, Users, Eye, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface CommunicationProvider {
  id: number;
  type: 'gmail' | 'outlook' | 'ringcentral' | 'twilio';
  name: string;
  isDefault: boolean;
  isActive: boolean;
  clientId: string | null;
  clientSecret: string | null;
  apiKey: string | null;
  accountSid: string | null;
  authToken: string | null;
  email: string | null;
  phoneNumber: string | null;
  settings: string | null;
  createdAt: string;
  updatedAt: string;
}

// Transient email from fetch (not saved to database)
interface TransientEmail {
  externalId: string;
  threadId: string | null;
  subject: string | null;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[] | null;
  ccEmails: string[] | null;
  bccEmails: string[] | null;
  bodyText: string | null;
  bodyHtml: string | null;
  snippet: string | null;
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  isSent: boolean;
  hasAttachments: boolean;
  labels: string[] | null;
  receivedAt: string | null;
}

interface ClientResponse {
  id: number;
  client: {
    id: number;
    companyName: string | null;
    contractType: string;
  };
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  };
}

interface RingCentralStatus {
  connected: boolean;
  phoneNumber?: string;
  error?: string;
}

interface Vendor {
  id: number;
  name: string;
  category?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface Project {
  id: number;
  name: string;
  status: string;
  clientId: number;
}

interface SMSMessage {
  id: number;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  body: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  externalId?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  clientId?: number | null;
  maintenanceId?: number | null;
  repairId?: number | null;
  projectId?: number | null;
}

const EMAILS_PER_PAGE = 10;

export default function Communications() {
  const [activeTab, setActiveTab] = useState("email");
  const [selectedEmail, setSelectedEmail] = useState<TransientEmail | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({ to: "", subject: "", body: "" });
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasMoreEmails, setHasMoreEmails] = useState(false);
  
  // Transient emails state (not persisted)
  const [transientEmails, setTransientEmails] = useState<TransientEmail[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Sync options
  const [starredOnly, setStarredOnly] = useState(false);
  const [includeSent, setIncludeSent] = useState(false);
  
  // Send to client dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [emailToLink, setEmailToLink] = useState<TransientEmail | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState<string | null>(null);
  
  // SMS compose dialog
  const [composeSmsOpen, setComposeSmsOpen] = useState(false);
  const [composeSmsData, setComposeSmsData] = useState({ to: "", message: "", clientId: "" });
  
  // SMS link to client dialog
  const [linkSmsDialogOpen, setLinkSmsDialogOpen] = useState(false);
  const [smsToLink, setSmsToLink] = useState<SMSMessage | null>(null);
  const [selectedSmsClientId, setSelectedSmsClientId] = useState<number | null>(null);
  const [selectedSmsVendorId, setSelectedSmsVendorId] = useState<number | null>(null);
  const [selectedSmsProjectId, setSelectedSmsProjectId] = useState<number | null>(null);
  
  // Email link entity selection (vendor and project)
  const [selectedEmailVendorId, setSelectedEmailVendorId] = useState<number | null>(null);
  const [selectedEmailProjectId, setSelectedEmailProjectId] = useState<number | null>(null);
  
  // SMS view message dialog
  const [selectedSmsMessage, setSelectedSmsMessage] = useState<SMSMessage | null>(null);
  
  // Create new client from link dialogs
  const [showCreateSmsClient, setShowCreateSmsClient] = useState(false);
  const [showCreateEmailClient, setShowCreateEmailClient] = useState(false);
  const [newSmsClientForm, setNewSmsClientForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [newEmailClientForm, setNewEmailClientForm] = useState({ name: "", email: "", phone: "", address: "" });
  
  const { toast } = useToast();
  
  const { data: emailProviders = [], isLoading: isLoadingEmailProviders } = useQuery<CommunicationProvider[]>({
    queryKey: ['/api/communication-providers'],
    select: (data) => data.filter(provider => 
      (provider.type === 'gmail' || provider.type === 'outlook') && provider.isActive
    )
  });
  
  const { data: smsProviders = [] } = useQuery<CommunicationProvider[]>({
    queryKey: ['/api/communication-providers'],
    select: (data) => data.filter(provider => provider.type === 'twilio' && provider.isActive)
  });
  
  const { data: voiceProviders = [] } = useQuery<CommunicationProvider[]>({
    queryKey: ['/api/communication-providers'], 
    select: (data) => data.filter(provider => provider.type === 'ringcentral' && provider.isActive)
  });

  // Fetch clients for the link dialog
  const { data: clients = [] } = useQuery<{ clients: ClientResponse[] } | ClientResponse[], Error, ClientResponse[]>({
    queryKey: ['/api/clients'],
    select: (data): ClientResponse[] => {
      if (Array.isArray(data)) return data;
      return data?.clients || [];
    }
  });

  // Fetch vendors for the link dialog
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors']
  });

  // Fetch projects for the link dialog
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects']
  });

  const { data: gmailStatus } = useQuery<{ connected: boolean; email?: string; messagesTotal?: number }>({
    queryKey: ['/api/emails/connection-status/gmail']
  });

  // Fetch RingCentral connection status
  const { data: ringCentralStatus, isLoading: isRingCentralLoading } = useQuery<RingCentralStatus>({
    queryKey: ['/api/sms/connection-status']
  });

  // Fetch SMS messages
  const { data: smsMessagesData, isLoading: isSmsMessagesLoading, refetch: refetchSmsMessages } = useQuery<{ messages: SMSMessage[]; success: boolean }>({
    queryKey: ['/api/sms/messages'],
    enabled: ringCentralStatus?.connected === true
  });

  // Sync SMS messages from RingCentral
  const syncSmsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/sms/sync');
      return response.json();
    },
    onSuccess: (data: { success: boolean; synced: number; message: string; error?: string }) => {
      if (data.success) {
        toast({ 
          title: "Messages Synced", 
          description: data.message || `Synced ${data.synced} messages from RingCentral`
        });
        refetchSmsMessages();
      } else {
        toast({ 
          title: "Sync Failed", 
          description: data.error || 'Failed to sync messages',
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    }
  });

  // Link SMS to client mutation
  const linkSmsMutation = useMutation({
    mutationFn: async ({ messageId, clientId, vendorId, projectId }: { messageId: number; clientId?: number | null; vendorId?: number | null; projectId?: number | null }) => {
      const response = await apiRequest('PATCH', `/api/sms/messages/${messageId}/link`, { clientId, vendorId, projectId });
      return response.json();
    },
    onSuccess: (data: { success: boolean; message: string }) => {
      toast({ 
        title: "SMS Linked", 
        description: data.message || 'SMS message linked successfully'
      });
      setLinkSmsDialogOpen(false);
      setSmsToLink(null);
      setSelectedSmsClientId(null);
      setSelectedSmsVendorId(null);
      setSelectedSmsProjectId(null);
      refetchSmsMessages();
    },
    onError: (error: Error) => {
      toast({ title: "Link Failed", description: error.message, variant: "destructive" });
    }
  });

  // Fetch emails mutation (transient - not saved to database)
  const fetchEmailsMutation = useMutation({
    mutationFn: async ({ pageToken, appendEmails = false, searchQuery: queryToSearch = null }: { pageToken?: string | null; appendEmails?: boolean; searchQuery?: string | null }) => {
      const response = await apiRequest('POST', '/api/emails/fetch', { 
        maxResults: 20,
        pageToken,
        starredOnly,
        includeSent,
        searchQuery: queryToSearch
      });
      return { data: await response.json(), appendEmails };
    },
    onSuccess: ({ data, appendEmails }: { data: { emails: TransientEmail[]; nextPageToken?: string | null; hasMore: boolean; success?: boolean; errors?: string[] }; appendEmails: boolean }) => {
      if (data.success === false || (data.errors && data.errors.length > 0)) {
        toast({ 
          title: "Fetch Error", 
          description: data.errors?.join(', ') || 'Unknown error occurred',
          variant: "destructive"
        });
        return;
      }
      
      if (appendEmails) {
        setTransientEmails(prev => [...prev, ...data.emails]);
      } else {
        setTransientEmails(data.emails);
        setCurrentPage(1);
      }
      
      setNextPageToken(data.nextPageToken || null);
      setHasMoreEmails(data.hasMore);
      
      toast({ 
        title: "Emails Loaded", 
        description: `${data.emails.length} email${data.emails.length === 1 ? '' : 's'} fetched.${data.hasMore ? ' More available.' : ''}`
      });
    },
    onError: (error: Error) => {
      toast({ title: "Fetch Failed", description: error.message, variant: "destructive" });
    }
  });

  // Link email to client mutation
  const linkEmailMutation = useMutation({
    mutationFn: async ({ email, clientId, vendorId, projectId }: { email: TransientEmail; clientId?: number | null; vendorId?: number | null; projectId?: number | null }) => {
      const response = await apiRequest('POST', '/api/emails/link', { email, clientId, vendorId, projectId });
      return response.json();
    },
    onSuccess: (data: { success: boolean; message: string }) => {
      toast({ 
        title: "Email Linked", 
        description: data.message || 'Email linked successfully'
      });
      setLinkDialogOpen(false);
      setEmailToLink(null);
      setSelectedClientId(null);
      setSelectedEmailVendorId(null);
      setSelectedEmailProjectId(null);
      // Invalidate client emails cache
      queryClient.invalidateQueries({ queryKey: ['/api/emails/by-client'] });
    },
    onError: (error: Error) => {
      toast({ title: "Link Failed", description: error.message, variant: "destructive" });
    }
  });
  
  const disconnectGmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/emails/disconnect-gmail', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails/connection-status/gmail'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session'] });
      toast({ title: "Gmail Disconnected", description: "You can reconnect Gmail using Google Sign In." });
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: (error: Error) => {
      toast({ title: "Disconnect Failed", description: error.message, variant: "destructive" });
    }
  });
  
  const diagnoseGmailMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/emails/diagnose-gmail', { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log('Gmail Diagnostics:', data);
      if (data.apiError) {
        toast({ 
          title: "Gmail API Error", 
          description: data.apiError,
          variant: "destructive"
        });
      } else if (data.messagesFound !== undefined) {
        toast({ 
          title: "Gmail Connection OK", 
          description: `Found ${data.messagesFound} messages. Profile: ${data.profile?.emailAddress || 'Unknown'}`
        });
      } else if (data.error) {
        toast({ 
          title: "Gmail Issue", 
          description: data.error,
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Diagnose Failed", description: error.message, variant: "destructive" });
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string }) => {
      const response = await apiRequest('POST', '/api/emails/send', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      toast({ title: "Email Sent", description: "Your email has been sent successfully." });
      setComposeOpen(false);
      setComposeData({ to: "", subject: "", body: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Send Failed", description: error.message, variant: "destructive" });
    }
  });

  // Send SMS mutation
  const sendSMSMutation = useMutation({
    mutationFn: async (data: { to: string; message: string }) => {
      const response = await apiRequest('POST', '/api/sms/send', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sms/messages'] });
      toast({ title: "SMS Sent", description: "Your SMS has been sent successfully." });
      setComposeSmsOpen(false);
      setComposeSmsData({ to: "", message: "", clientId: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Send Failed", description: error.message, variant: "destructive" });
    }
  });

  // Create new client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string; address: string }) => {
      const response = await apiRequest('POST', '/api/clients', data);
      return response.json();
    },
    onSuccess: (data: { success: boolean; client: ClientResponse['user']; message: string }, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({ title: "Client Created", description: data.message || "New client created successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Create Failed", description: error.message, variant: "destructive" });
    }
  });
  
  // Email is ready if Gmail connector is connected OR we have database providers
  const hasEmailProvider = gmailStatus?.connected || emailProviders.length > 0;
  // SMS is ready if RingCentral is connected OR we have Twilio providers
  const hasSmsProvider = ringCentralStatus?.connected || smsProviders.length > 0;
  const hasVoiceProvider = voiceProviders.length > 0;

  // Pagination (no local filtering - search is done via API)
  const totalPages = Math.ceil(transientEmails.length / EMAILS_PER_PAGE);
  const paginatedEmails = transientEmails.slice(
    (currentPage - 1) * EMAILS_PER_PAGE,
    currentPage * EMAILS_PER_PAGE
  );

  const handleFetchEmails = (loadMore: boolean = false, search: string | null = null) => {
    const pageToken = loadMore ? nextPageToken : null;
    fetchEmailsMutation.mutate({ pageToken, appendEmails: loadMore, searchQuery: search });
  };

  const handleSearch = () => {
    const query = searchQuery.trim() || null;
    setActiveSearchQuery(query);
    setCurrentPage(1);
    handleFetchEmails(false, query);
  };

  const handleFetchMore = () => {
    handleFetchEmails(true, activeSearchQuery);
  };

  const handleSendToClient = (email: TransientEmail) => {
    setEmailToLink(email);
    setLinkDialogOpen(true);
  };

  const handleConfirmLink = () => {
    if (!emailToLink || (!selectedClientId && !selectedEmailVendorId && !selectedEmailProjectId)) {
      toast({ title: "Error", description: "Please select at least one entity to link.", variant: "destructive" });
      return;
    }
    linkEmailMutation.mutate({ 
      email: emailToLink, 
      clientId: selectedClientId, 
      vendorId: selectedEmailVendorId, 
      projectId: selectedEmailProjectId 
    });
  };

  const handleSendEmail = () => {
    if (!composeData.to || !composeData.subject || !composeData.body) {
      toast({ title: "Validation Error", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    sendEmailMutation.mutate(composeData);
  };

  const handleSendSms = () => {
    if (!composeSmsData.to || !composeSmsData.message) {
      toast({ title: "Validation Error", description: "Please fill in phone number and message.", variant: "destructive" });
      return;
    }
    sendSMSMutation.mutate({ to: composeSmsData.to, message: composeSmsData.message });
  };

  const handleClientSelectForSms = (clientId: string) => {
    const client = clients.find(c => c.id.toString() === clientId);
    if (client?.user.phone) {
      setComposeSmsData({ ...composeSmsData, to: client.user.phone, clientId });
    }
  };

  // Normalize phone number for comparison (remove all non-digit characters except +)
  const normalizePhone = (phone: string): string => {
    if (!phone) return '';
    const digits = phone.replace(/[^\d]/g, '');
    // Return last 10 digits for US numbers to compare
    return digits.length >= 10 ? digits.slice(-10) : digits;
  };

  // Handler to open link SMS to client dialog with auto-matching by phone
  const handleLinkSmsToClient = (message: SMSMessage) => {
    setSmsToLink(message);
    setLinkSmsDialogOpen(true);
    
    // Try to auto-match client by phone number
    const phoneToMatch = message.direction === 'inbound' ? message.fromNumber : message.toNumber;
    const normalizedPhone = normalizePhone(phoneToMatch);
    
    const matchingClient = clients.find(c => {
      if (!c.user.phone) return false;
      return normalizePhone(c.user.phone) === normalizedPhone;
    });
    
    if (matchingClient) {
      setSelectedSmsClientId(matchingClient.id);
    } else {
      setSelectedSmsClientId(null);
    }
  };

  // Confirm linking SMS to client
  const handleConfirmSmsLink = () => {
    if (!smsToLink || (!selectedSmsClientId && !selectedSmsVendorId && !selectedSmsProjectId)) {
      toast({ title: "Error", description: "Please select at least one entity to link.", variant: "destructive" });
      return;
    }
    linkSmsMutation.mutate({ 
      messageId: smsToLink.id, 
      clientId: selectedSmsClientId, 
      vendorId: selectedSmsVendorId, 
      projectId: selectedSmsProjectId 
    });
  };

  // Handle opening SMS link dialog with phone pre-fill for new client
  const handleOpenSmsCreateClient = () => {
    if (smsToLink) {
      const phoneToUse = smsToLink.direction === 'inbound' ? smsToLink.fromNumber : smsToLink.toNumber;
      setNewSmsClientForm({ name: "", email: "", phone: phoneToUse, address: "" });
      setShowCreateSmsClient(true);
    }
  };

  // Handle opening Email link dialog with email pre-fill for new client
  const handleOpenEmailCreateClient = () => {
    if (emailToLink) {
      setNewEmailClientForm({ name: "", email: emailToLink.fromEmail, phone: "", address: "" });
      setShowCreateEmailClient(true);
    }
  };

  // Create client from SMS dialog
  const handleCreateSmsClient = async () => {
    if (!newSmsClientForm.name.trim()) {
      toast({ title: "Validation Error", description: "Name is required.", variant: "destructive" });
      return;
    }
    if (!newSmsClientForm.phone.trim() && !newSmsClientForm.email.trim()) {
      toast({ title: "Validation Error", description: "Phone or email is required.", variant: "destructive" });
      return;
    }
    
    try {
      const result = await createClientMutation.mutateAsync(newSmsClientForm);
      if (result.success && result.client) {
        setSelectedSmsClientId(result.client.id);
        setShowCreateSmsClient(false);
        setNewSmsClientForm({ name: "", email: "", phone: "", address: "" });
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Create client from Email dialog
  const handleCreateEmailClient = async () => {
    if (!newEmailClientForm.name.trim()) {
      toast({ title: "Validation Error", description: "Name is required.", variant: "destructive" });
      return;
    }
    if (!newEmailClientForm.email.trim() && !newEmailClientForm.phone.trim()) {
      toast({ title: "Validation Error", description: "Email or phone is required.", variant: "destructive" });
      return;
    }
    
    try {
      const result = await createClientMutation.mutateAsync(newEmailClientForm);
      if (result.success && result.client) {
        setSelectedClientId(result.client.id);
        setShowCreateEmailClient(false);
        setNewEmailClientForm({ name: "", email: "", phone: "", address: "" });
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "MMM d, yyyy h:mm a");
    } catch {
      return dateStr;
    }
  };
  
  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Communications</h1>
          <p className="text-muted-foreground">
            Manage client communications through multiple channels
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-search">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          <Button 
            data-testid="button-new-message"
            onClick={() => {
              if (!hasEmailProvider && activeTab === "email") {
                toast({
                  title: "No Email Provider Configured",
                  description: "You need to set up an email provider in Settings first.",
                  variant: "destructive",
                });
                return;
              }
              
              if (!hasSmsProvider && activeTab === "sms") {
                toast({
                  title: "No SMS Provider Configured",
                  description: "You need to set up an SMS provider in Settings first.",
                  variant: "destructive",
                });
                return;
              }
              
              if (activeTab === "email") {
                setComposeOpen(true);
              }
            }}
          >
            New Message
          </Button>
        </div>
      </div>
      
      <Tabs 
        defaultValue="email" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 w-full max-w-lg mx-auto mb-6">
          <TabsTrigger value="email" className="flex items-center" data-testid="tab-email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center" data-testid="tab-sms">
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="calls" className="flex items-center" data-testid="tab-calls">
            <Phone className="h-4 w-4 mr-2" />
            Call Log
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="email" className="space-y-4">
          {!hasEmailProvider ? (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Email Provider Configured</AlertTitle>
              <AlertDescription className="flex justify-between items-center">
                <span>You need to set up an email provider to use this feature.</span>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Provider
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                {gmailStatus?.connected ? (
                  <>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Gmail Connected
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Connected as {gmailStatus.email || 'Gmail account'}
                    </span>
                  </>
                ) : emailProviders.length > 0 ? (
                  <>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {emailProviders.filter(p => p.isDefault)[0]?.name || emailProviders[0]?.name}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Using {emailProviders.filter(p => p.isDefault)[0]?.type || emailProviders[0]?.type} as the default email provider
                    </span>
                  </>
                ) : null}
              </div>
              {gmailStatus?.connected && (
                <div className="flex items-center gap-2 mt-2" data-testid="gmail-status">
                  {gmailStatus.messagesTotal !== undefined && (
                    <span className="text-sm text-muted-foreground">({gmailStatus.messagesTotal} messages in account)</span>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => diagnoseGmailMutation.mutate()}
                    disabled={diagnoseGmailMutation.isPending}
                    data-testid="button-diagnose-gmail"
                  >
                    {diagnoseGmailMutation.isPending ? 'Testing...' : 'Test Connection'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => disconnectGmailMutation.mutate()}
                    disabled={disconnectGmailMutation.isPending}
                    data-testid="button-disconnect-gmail"
                  >
                    {disconnectGmailMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                </div>
              )}
            </div>
          )}
        
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex justify-between">
              <div className="flex gap-2">
                <Input 
                  placeholder="Search inbox..." 
                  className="w-64" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  data-testid="input-search-emails" 
                />
                <Button
                  variant="outline"
                  onClick={handleSearch}
                  disabled={fetchEmailsMutation.isPending}
                  data-testid="button-search-emails"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  disabled={!hasEmailProvider || fetchEmailsMutation.isPending}
                  onClick={() => {
                    setSearchQuery("");
                    setActiveSearchQuery(null);
                    handleFetchEmails();
                  }}
                  data-testid="button-sync-emails"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${fetchEmailsMutation.isPending ? 'animate-spin' : ''}`} />
                  {fetchEmailsMutation.isPending ? 'Fetching...' : 'Sync Emails'}
                </Button>
              <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!hasEmailProvider} data-testid="button-compose-email">
                    <Mail className="h-4 w-4 mr-2" />
                    Compose Email
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Compose Email</DialogTitle>
                    <DialogDescription>
                      Send an email to a client or contact.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="to">To</Label>
                      <Input 
                        id="to" 
                        type="email"
                        placeholder="recipient@example.com"
                        value={composeData.to}
                        onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                        data-testid="input-compose-to"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input 
                        id="subject" 
                        placeholder="Email subject"
                        value={composeData.subject}
                        onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                        data-testid="input-compose-subject"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="body">Message</Label>
                      <Textarea 
                        id="body" 
                        placeholder="Type your message here..."
                        rows={8}
                        value={composeData.body}
                        onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                        data-testid="textarea-compose-body"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setComposeOpen(false)} data-testid="button-compose-cancel">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSendEmail} 
                      disabled={sendEmailMutation.isPending}
                      data-testid="button-compose-send"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="starredOnly" 
                  checked={starredOnly}
                  onCheckedChange={(checked) => setStarredOnly(checked === true)}
                  data-testid="checkbox-starred-only"
                />
                <Label htmlFor="starredOnly" className="text-sm cursor-pointer">Starred only</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="includeSent" 
                  checked={includeSent}
                  onCheckedChange={(checked) => setIncludeSent(checked === true)}
                  data-testid="checkbox-include-sent"
                />
                <Label htmlFor="includeSent" className="text-sm cursor-pointer">Include sent</Label>
              </div>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Emails</CardTitle>
              <CardDescription>
                Emails are shown for preview. Click "Send to Client" to save an email to a client's page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fetchEmailsMutation.isPending || isLoadingEmailProviders ? (
                <div className="space-y-3" data-testid="emails-loading">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center space-x-4 p-3 border rounded-lg">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ))}
                </div>
              ) : transientEmails.length === 0 ? (
                <div className="space-y-2">
                  <div className="bg-muted rounded-md p-6 text-center" data-testid="emails-empty">
                    <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">
                      {activeSearchQuery ? 'No matching emails' : 'No emails loaded'}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                      {activeSearchQuery 
                        ? `No emails match "${activeSearchQuery}". Try a different search term.`
                        : hasEmailProvider 
                          ? "Click 'Sync Emails' to fetch your latest emails from Gmail. Emails are only saved when you link them to a client." 
                          : "Connect your email account to view and link client emails."}
                    </p>
                    {hasEmailProvider && !activeSearchQuery && (
                      <Button 
                        className="mt-4" 
                        onClick={() => handleFetchEmails()}
                        disabled={fetchEmailsMutation.isPending}
                        data-testid="button-sync-emails-empty"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${fetchEmailsMutation.isPending ? 'animate-spin' : ''}`} />
                        {fetchEmailsMutation.isPending ? 'Fetching...' : 'Sync Emails Now'}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <Table data-testid="emails-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedEmails.map((email) => (
                        <TableRow 
                          key={email.externalId}
                          className={`cursor-pointer hover:bg-muted/50 ${!email.isRead ? 'font-semibold' : ''}`}
                          onClick={() => setSelectedEmail(email)}
                          data-testid={`email-row-${email.externalId}`}
                        >
                          <TableCell>
                            {email.isRead ? (
                              <Circle className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Circle className="h-3 w-3 fill-blue-500 text-blue-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className={!email.isRead ? 'font-semibold' : ''}>{email.fromName || email.fromEmail}</span>
                              {email.fromName && <span className="text-xs text-muted-foreground">{email.fromEmail}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={!email.isRead ? 'font-semibold' : ''}>{email.subject || '(No Subject)'}</span>
                              {email.hasAttachments && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                              {email.isStarred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                            </div>
                            {email.snippet && (
                              <p className="text-xs text-muted-foreground truncate max-w-md">{email.snippet}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(email.receivedAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {email.isSent && <Badge variant="outline" className="text-xs">Sent</Badge>}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendToClient(email);
                                }}
                                data-testid={`button-send-to-client-${email.externalId}`}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Send to Client
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
                    <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          {selectedEmail?.subject || '(No Subject)'}
                          {selectedEmail?.isStarred && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                        </DialogTitle>
                        <DialogDescription>
                          From: {selectedEmail?.fromName || selectedEmail?.fromEmail} 
                          {selectedEmail?.fromName && ` <${selectedEmail.fromEmail}>`}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4" data-testid="email-detail-modal">
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>To: {selectedEmail?.toEmails?.join(', ') || '-'}</p>
                          {selectedEmail?.ccEmails && selectedEmail.ccEmails.length > 0 && (
                            <p>CC: {selectedEmail.ccEmails.join(', ')}</p>
                          )}
                          <p>Date: {formatDate(selectedEmail?.receivedAt || null)}</p>
                        </div>
                        <div className="border-t pt-4">
                          {selectedEmail?.bodyHtml ? (
                            <div 
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                            />
                          ) : (
                            <p className="whitespace-pre-wrap">{selectedEmail?.bodyText || selectedEmail?.snippet || 'No content'}</p>
                          )}
                        </div>
                        <div className="border-t pt-4">
                          <Button
                            onClick={() => {
                              if (selectedEmail) {
                                handleSendToClient(selectedEmail);
                                setSelectedEmail(null);
                              }
                            }}
                            data-testid="button-send-to-client-modal"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Send to Client
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={linkDialogOpen} onOpenChange={(open) => {
                    setLinkDialogOpen(open);
                    if (!open) {
                      setShowCreateEmailClient(false);
                      setNewEmailClientForm({ name: "", email: "", phone: "", address: "" });
                    }
                  }}>
                    <DialogContent className="sm:max-w-[450px]">
                      <DialogHeader>
                        <DialogTitle>Link Email</DialogTitle>
                        <DialogDescription>
                          Select one or more entities to link this email.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        {!showCreateEmailClient ? (
                          <>
                            <div>
                              <Label htmlFor="client-select">Client (optional)</Label>
                              <Select 
                                value={selectedClientId?.toString() || "none"} 
                                onValueChange={(val) => setSelectedClientId(val && val !== "none" ? Number(val) : null)}
                              >
                                <SelectTrigger className="mt-2" data-testid="select-client">
                                  <SelectValue placeholder="Choose a client..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {clients.map((client) => (
                                    <SelectItem key={client.id} value={client.id.toString()}>
                                      {client.user?.name || 'Unknown'} ({client.user?.email || 'No email'})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-2 text-blue-600 hover:text-blue-700"
                                onClick={handleOpenEmailCreateClient}
                                data-testid="button-create-email-client"
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Create New Client
                              </Button>
                            </div>

                            <div>
                              <Label htmlFor="email-vendor-select">Vendor (optional)</Label>
                              <Select 
                                value={selectedEmailVendorId?.toString() || "none"} 
                                onValueChange={(val) => setSelectedEmailVendorId(val && val !== "none" ? Number(val) : null)}
                              >
                                <SelectTrigger className="mt-2" data-testid="select-email-vendor">
                                  <SelectValue placeholder="Choose a vendor..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {vendors.map((vendor) => (
                                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                      {vendor.name} {vendor.category ? `(${vendor.category})` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor="email-project-select">Project/Job (optional)</Label>
                              <Select 
                                value={selectedEmailProjectId?.toString() || "none"} 
                                onValueChange={(val) => setSelectedEmailProjectId(val && val !== "none" ? Number(val) : null)}
                              >
                                <SelectTrigger className="mt-2" data-testid="select-email-project">
                                  <SelectValue placeholder="Choose a project..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {projects.map((project) => (
                                    <SelectItem key={project.id} value={project.id.toString()}>
                                      {project.name} ({project.status})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                            <div className="flex items-center justify-between">
                              <Label className="font-medium">Create New Client</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setShowCreateEmailClient(false);
                                  setNewEmailClientForm({ name: "", email: "", phone: "", address: "" });
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="new-email-client-name">Name *</Label>
                              <Input
                                id="new-email-client-name"
                                placeholder="Client name"
                                value={newEmailClientForm.name}
                                onChange={(e) => setNewEmailClientForm({ ...newEmailClientForm, name: e.target.value })}
                                data-testid="input-new-email-client-name"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="new-email-client-email">Email</Label>
                              <Input
                                id="new-email-client-email"
                                type="email"
                                placeholder="Email address"
                                value={newEmailClientForm.email}
                                onChange={(e) => setNewEmailClientForm({ ...newEmailClientForm, email: e.target.value })}
                                data-testid="input-new-email-client-email"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="new-email-client-phone">Phone (optional)</Label>
                              <Input
                                id="new-email-client-phone"
                                type="tel"
                                placeholder="Phone number"
                                value={newEmailClientForm.phone}
                                onChange={(e) => setNewEmailClientForm({ ...newEmailClientForm, phone: e.target.value })}
                                data-testid="input-new-email-client-phone"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="new-email-client-address">Address (optional)</Label>
                              <Input
                                id="new-email-client-address"
                                placeholder="Address"
                                value={newEmailClientForm.address}
                                onChange={(e) => setNewEmailClientForm({ ...newEmailClientForm, address: e.target.value })}
                                data-testid="input-new-email-client-address"
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={handleCreateEmailClient}
                              disabled={createClientMutation.isPending}
                              className="w-full"
                              data-testid="button-submit-new-email-client"
                            >
                              {createClientMutation.isPending ? 'Creating...' : 'Create Client'}
                            </Button>
                          </div>
                        )}

                        {emailToLink && (
                          <div className="p-3 bg-muted rounded-md text-sm">
                            <p className="font-medium">{emailToLink.subject || '(No Subject)'}</p>
                            <p className="text-muted-foreground">From: {emailToLink.fromEmail}</p>
                          </div>
                        )}

                        {!showCreateEmailClient && (selectedClientId || selectedEmailVendorId || selectedEmailProjectId) && (
                          <div className="text-sm text-muted-foreground">
                            Linking to: {[
                              selectedClientId && 'Client',
                              selectedEmailVendorId && 'Vendor',
                              selectedEmailProjectId && 'Project'
                            ].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                      {!showCreateEmailClient && (
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleConfirmLink}
                            disabled={(!selectedClientId && !selectedEmailVendorId && !selectedEmailProjectId) || linkEmailMutation.isPending}
                            data-testid="button-confirm-link"
                          >
                            {linkEmailMutation.isPending ? 'Linking...' : 'Link'}
                          </Button>
                        </DialogFooter>
                      )}
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </CardContent>
            <CardFooter className="border-t p-4">
              <div className="flex w-full justify-between items-center">
                <div className="text-sm text-muted-foreground" data-testid="text-email-count">
                  {transientEmails.length > 0 
                    ? `Showing ${(currentPage - 1) * EMAILS_PER_PAGE + 1}-${Math.min(currentPage * EMAILS_PER_PAGE, transientEmails.length)} of ${transientEmails.length} emails${hasMoreEmails ? ' (more available)' : ''}` 
                    : gmailStatus?.connected 
                      ? `Gmail connected as ${gmailStatus.email || 'your account'}`
                      : emailProviders.length > 0
                        ? `${emailProviders.length} email ${emailProviders.length === 1 ? 'provider' : 'providers'} configured` 
                        : "No email providers configured"}
                </div>
                <div className="flex gap-2 items-center">
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm px-2">Page {currentPage} of {totalPages}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        data-testid="button-next-page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {hasMoreEmails && transientEmails.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleFetchMore}
                      disabled={fetchEmailsMutation.isPending}
                      data-testid="button-fetch-more"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${fetchEmailsMutation.isPending ? 'animate-spin' : ''}`} />
                      {fetchEmailsMutation.isPending ? 'Fetching...' : 'Load More'}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Providers
                    </Link>
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="sms" className="space-y-4">
          {!hasSmsProvider ? (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No SMS Provider Configured</AlertTitle>
              <AlertDescription className="flex justify-between items-center">
                <span>You need to connect RingCentral or set up Twilio to use this feature.</span>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Provider
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                {ringCentralStatus?.connected ? (
                  <>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200" data-testid="badge-ringcentral-connected">
                      RingCentral Connected
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Connected as {ringCentralStatus.phoneNumber || 'RingCentral account'}
                    </span>
                  </>
                ) : smsProviders.length > 0 ? (
                  <>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {smsProviders.filter(p => p.isDefault)[0]?.name || smsProviders[0]?.name}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Using {smsProviders.filter(p => p.isDefault)[0]?.type || smsProviders[0]?.type} for SMS messaging
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          )}
          
          <div className="flex justify-between mb-4">
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]" data-testid="select-sms-filter">
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Messages</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Search messages..." className="w-64" data-testid="input-search-sms" />
            </div>
            <div className="flex gap-2">
              {ringCentralStatus?.connected && (
                <Button 
                  variant="outline" 
                  onClick={() => syncSmsMutation.mutate()}
                  disabled={syncSmsMutation.isPending || isSmsMessagesLoading}
                  data-testid="button-sync-sms"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncSmsMutation.isPending ? 'animate-spin' : ''}`} />
                  {syncSmsMutation.isPending ? 'Syncing...' : 'Sync Messages'}
                </Button>
              )}
              <Dialog open={composeSmsOpen} onOpenChange={setComposeSmsOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!hasSmsProvider} data-testid="button-compose-sms">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Compose SMS
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Compose SMS</DialogTitle>
                    <DialogDescription>
                      Send a text message to a client or contact.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="sms-client">Select Client (optional)</Label>
                      <Select 
                        value={composeSmsData.clientId} 
                        onValueChange={handleClientSelectForSms}
                      >
                        <SelectTrigger data-testid="select-sms-client">
                          <SelectValue placeholder="Choose a client to auto-fill phone" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.filter(c => c.user.phone).map((client) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.user.name} - {client.user.phone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="sms-to">Phone Number</Label>
                      <Input 
                        id="sms-to" 
                        type="tel"
                        placeholder="+1234567890"
                        value={composeSmsData.to}
                        onChange={(e) => setComposeSmsData({ ...composeSmsData, to: e.target.value })}
                        data-testid="input-sms-to"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="sms-message">Message</Label>
                      <Textarea 
                        id="sms-message" 
                        placeholder="Type your message here..."
                        rows={4}
                        value={composeSmsData.message}
                        onChange={(e) => setComposeSmsData({ ...composeSmsData, message: e.target.value })}
                        data-testid="textarea-sms-message"
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {composeSmsData.message.length} characters
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setComposeSmsOpen(false)} data-testid="button-sms-cancel">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSendSms} 
                      disabled={sendSMSMutation.isPending}
                      data-testid="button-sms-send"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendSMSMutation.isPending ? 'Sending...' : 'Send SMS'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>SMS Messages</CardTitle>
              <CardDescription>
                Send and track text messages to clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSmsMessagesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-3 border rounded-md">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : smsMessagesData?.messages && smsMessagesData.messages.length > 0 ? (
                <div className="space-y-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Direction</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead className="w-1/3">Message</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {smsMessagesData.messages.map((message) => (
                        <TableRow 
                          key={message.id} 
                          data-testid={`row-sms-${message.id}`}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedSmsMessage(message)}
                        >
                          <TableCell>
                            <Badge variant={message.direction === 'outbound' ? 'default' : 'secondary'}>
                              {message.direction === 'outbound' ? 'Sent' : 'Received'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{message.fromNumber}</TableCell>
                          <TableCell className="font-mono text-sm">{message.toNumber}</TableCell>
                          <TableCell className="text-sm max-w-xs">
                            <p className="truncate" title="Click to view full message">
                              {message.body || <span className="text-muted-foreground italic">No message content</span>}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                message.status === 'delivered' ? 'border-green-500 text-green-700' :
                                message.status === 'sent' ? 'border-blue-500 text-blue-700' :
                                message.status === 'failed' ? 'border-red-500 text-red-700' :
                                'border-yellow-500 text-yellow-700'
                              }`}
                            >
                              {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {message.sentAt ? formatDate(message.sentAt) : formatDate(message.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setSelectedSmsMessage(message);
                                }}
                                data-testid={`button-view-sms-${message.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {message.clientId ? (
                                <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                                  Linked
                                </Badge>
                              ) : (
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 px-3"
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleLinkSmsToClient(message);
                                  }}
                                  data-testid={`button-link-sms-${message.id}`}
                                >
                                  <Link2 className="h-4 w-4 mr-1" />
                                  Link
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-muted rounded-md p-6 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">SMS Integration</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                      {ringCentralStatus?.connected 
                        ? "Your RingCentral account is connected. Click 'Sync Messages' to load your SMS history, or 'Compose SMS' to send a new message." 
                        : hasSmsProvider 
                          ? "Your SMS provider is configured. You can now send text messages to clients." 
                          : "Connect RingCentral or configure Twilio to send maintenance reminders, service updates, and other communications to clients."}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t p-4">
              <div className="flex w-full justify-between items-center">
                <div className="text-sm text-muted-foreground" data-testid="text-sms-status">
                  {ringCentralStatus?.connected 
                    ? `RingCentral connected as ${ringCentralStatus.phoneNumber || 'your account'}${smsMessagesData?.messages ? ` • ${smsMessagesData.messages.length} messages` : ''}`
                    : hasSmsProvider 
                      ? `${smsProviders.length} SMS ${smsProviders.length === 1 ? 'provider' : 'providers'} configured` 
                      : "No SMS providers configured"}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Providers
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
          
          {/* SMS Link Dialog */}
          <Dialog open={linkSmsDialogOpen} onOpenChange={(open) => {
            setLinkSmsDialogOpen(open);
            if (!open) {
              setShowCreateSmsClient(false);
              setNewSmsClientForm({ name: "", email: "", phone: "", address: "" });
            }
          }}>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Link SMS</DialogTitle>
                <DialogDescription>
                  Select one or more entities to link this SMS message.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                {!showCreateSmsClient ? (
                  <>
                    <div>
                      <Label htmlFor="sms-client-select">Client (optional)</Label>
                      <Select 
                        value={selectedSmsClientId?.toString() || "none"} 
                        onValueChange={(val) => setSelectedSmsClientId(val && val !== "none" ? Number(val) : null)}
                      >
                        <SelectTrigger className="mt-2" data-testid="select-sms-client-link">
                          <SelectValue placeholder="Choose a client..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.user?.name || 'Unknown'} {client.user?.phone ? `- ${client.user.phone}` : `(${client.user?.email || 'No contact'})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedSmsClientId && (
                        <div className="mt-1 text-sm text-green-600 flex items-center gap-1">
                          <Check className="h-4 w-4" />
                          Client matched by phone number
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-blue-600 hover:text-blue-700"
                        onClick={handleOpenSmsCreateClient}
                        data-testid="button-create-sms-client"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Create New Client
                      </Button>
                    </div>

                    <div>
                      <Label htmlFor="sms-vendor-select">Vendor (optional)</Label>
                      <Select 
                        value={selectedSmsVendorId?.toString() || "none"} 
                        onValueChange={(val) => setSelectedSmsVendorId(val && val !== "none" ? Number(val) : null)}
                      >
                        <SelectTrigger className="mt-2" data-testid="select-sms-vendor-link">
                          <SelectValue placeholder="Choose a vendor..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id.toString()}>
                              {vendor.name} {vendor.category ? `(${vendor.category})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="sms-project-select">Project/Job (optional)</Label>
                      <Select 
                        value={selectedSmsProjectId?.toString() || "none"} 
                        onValueChange={(val) => setSelectedSmsProjectId(val && val !== "none" ? Number(val) : null)}
                      >
                        <SelectTrigger className="mt-2" data-testid="select-sms-project-link">
                          <SelectValue placeholder="Choose a project..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name} ({project.status})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Create New Client</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowCreateSmsClient(false);
                          setNewSmsClientForm({ name: "", email: "", phone: "", address: "" });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-sms-client-name">Name *</Label>
                      <Input
                        id="new-sms-client-name"
                        placeholder="Client name"
                        value={newSmsClientForm.name}
                        onChange={(e) => setNewSmsClientForm({ ...newSmsClientForm, name: e.target.value })}
                        data-testid="input-new-sms-client-name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-sms-client-phone">Phone</Label>
                      <Input
                        id="new-sms-client-phone"
                        type="tel"
                        placeholder="Phone number"
                        value={newSmsClientForm.phone}
                        onChange={(e) => setNewSmsClientForm({ ...newSmsClientForm, phone: e.target.value })}
                        data-testid="input-new-sms-client-phone"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-sms-client-email">Email (optional)</Label>
                      <Input
                        id="new-sms-client-email"
                        type="email"
                        placeholder="Email address"
                        value={newSmsClientForm.email}
                        onChange={(e) => setNewSmsClientForm({ ...newSmsClientForm, email: e.target.value })}
                        data-testid="input-new-sms-client-email"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new-sms-client-address">Address (optional)</Label>
                      <Input
                        id="new-sms-client-address"
                        placeholder="Address"
                        value={newSmsClientForm.address}
                        onChange={(e) => setNewSmsClientForm({ ...newSmsClientForm, address: e.target.value })}
                        data-testid="input-new-sms-client-address"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleCreateSmsClient}
                      disabled={createClientMutation.isPending}
                      className="w-full"
                      data-testid="button-submit-new-sms-client"
                    >
                      {createClientMutation.isPending ? 'Creating...' : 'Create Client'}
                    </Button>
                  </div>
                )}

                {smsToLink && (
                  <div className="p-3 bg-muted rounded-md text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {smsToLink.direction === 'inbound' ? 'From:' : 'To:'}
                      </span>
                      <span className="font-mono">
                        {smsToLink.direction === 'inbound' ? smsToLink.fromNumber : smsToLink.toNumber}
                      </span>
                    </div>
                    <p className="border-t pt-2">{smsToLink.body || '(No message content)'}</p>
                  </div>
                )}

                {!showCreateSmsClient && (selectedSmsClientId || selectedSmsVendorId || selectedSmsProjectId) && (
                  <div className="text-sm text-muted-foreground">
                    Linking to: {[
                      selectedSmsClientId && 'Client',
                      selectedSmsVendorId && 'Vendor',
                      selectedSmsProjectId && 'Project'
                    ].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
              {!showCreateSmsClient && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setLinkSmsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleConfirmSmsLink}
                    disabled={(!selectedSmsClientId && !selectedSmsVendorId && !selectedSmsProjectId) || linkSmsMutation.isPending}
                    data-testid="button-confirm-sms-link"
                  >
                    {linkSmsMutation.isPending ? 'Linking...' : 'Link'}
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
          
          {/* SMS View Message Dialog */}
          <Dialog open={!!selectedSmsMessage} onOpenChange={(open) => !open && setSelectedSmsMessage(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  SMS Message Details
                </DialogTitle>
                <DialogDescription>
                  {selectedSmsMessage?.direction === 'outbound' ? 'Outbound message' : 'Inbound message'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4" data-testid="sms-detail-modal">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">From:</span>
                    <p className="font-mono">{selectedSmsMessage?.fromNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">To:</span>
                    <p className="font-mono">{selectedSmsMessage?.toNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          selectedSmsMessage?.status === 'delivered' ? 'border-green-500 text-green-700' :
                          selectedSmsMessage?.status === 'sent' ? 'border-blue-500 text-blue-700' :
                          selectedSmsMessage?.status === 'failed' ? 'border-red-500 text-red-700' :
                          'border-yellow-500 text-yellow-700'
                        }`}
                      >
                        {selectedSmsMessage?.status ? selectedSmsMessage.status.charAt(0).toUpperCase() + selectedSmsMessage.status.slice(1) : '-'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p>{selectedSmsMessage?.sentAt ? formatDate(selectedSmsMessage.sentAt) : formatDate(selectedSmsMessage?.createdAt || null)}</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <span className="text-sm text-muted-foreground">Message:</span>
                  <p className="mt-2 whitespace-pre-wrap bg-muted p-3 rounded-md">
                    {selectedSmsMessage?.body || <span className="text-muted-foreground italic">No message content</span>}
                  </p>
                </div>
                {!selectedSmsMessage?.clientId && (
                  <div className="border-t pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (selectedSmsMessage) {
                          handleLinkSmsToClient(selectedSmsMessage);
                          setSelectedSmsMessage(null);
                        }
                      }}
                      data-testid="button-link-from-modal"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Link to Client
                    </Button>
                  </div>
                )}
                {selectedSmsMessage?.clientId && (
                  <div className="border-t pt-4">
                    <Badge variant="outline" className="border-green-500 text-green-700">
                      <Check className="h-3 w-3 mr-1" />
                      Linked to Client
                    </Badge>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        <TabsContent value="calls" className="space-y-4">
          {!hasVoiceProvider ? (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Voice Provider Configured</AlertTitle>
              <AlertDescription className="flex justify-between items-center">
                <span>You need to set up a voice provider (like RingCentral) to use this feature.</span>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Provider
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {voiceProviders.filter(p => p.isDefault)[0]?.name || voiceProviders[0]?.name}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Using {voiceProviders.filter(p => p.isDefault)[0]?.type || voiceProviders[0]?.type} for voice calls
                </span>
              </div>
            </div>
          )}
          
          <div className="flex justify-between mb-4">
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Calls</SelectItem>
                  <SelectItem value="incoming">Incoming</SelectItem>
                  <SelectItem value="outgoing">Outgoing</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Search call logs..." className="w-64" />
            </div>
            <Button disabled={!hasVoiceProvider}>
              <Phone className="h-4 w-4 mr-2" />
              Log New Call
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
              <CardDescription>
                Track and manage client phone conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-muted-foreground">No call logs to display yet.</p>
                <div className="bg-muted rounded-md p-6 text-center">
                  <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Call Tracking</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                    {hasVoiceProvider 
                      ? "Your voice provider is configured. You can now log and track client calls." 
                      : "Configure a voice provider to log and track client calls, set reminders, and manage follow-ups all in one place."}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t p-4">
              <div className="flex w-full justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {hasVoiceProvider 
                    ? `${voiceProviders.length} voice ${voiceProviders.length === 1 ? 'provider' : 'providers'} configured` 
                    : "No voice providers configured"}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Providers
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
