import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Mail, MessageSquare, Phone, Search, AlertCircle, Settings, RefreshCw, Send, Check, Circle, Paperclip, Star, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";
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
  const { data: clients = [] } = useQuery<ClientResponse[]>({
    queryKey: ['/api/clients']
  });

  const { data: gmailStatus } = useQuery<{ connected: boolean; email?: string; messagesTotal?: number }>({
    queryKey: ['/api/emails/connection-status/gmail']
  });

  // Fetch emails mutation (transient - not saved to database)
  const fetchEmailsMutation = useMutation({
    mutationFn: async ({ pageToken, appendEmails = false }: { pageToken?: string | null; appendEmails?: boolean }) => {
      const response = await apiRequest('POST', '/api/emails/fetch', { 
        maxResults: 20,
        pageToken,
        starredOnly,
        includeSent
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
    mutationFn: async ({ email, clientId }: { email: TransientEmail; clientId: number }) => {
      const response = await apiRequest('POST', '/api/emails/link', { email, clientId });
      return response.json();
    },
    onSuccess: (data: { success: boolean; message: string }) => {
      toast({ 
        title: "Email Linked", 
        description: data.message
      });
      setLinkDialogOpen(false);
      setEmailToLink(null);
      setSelectedClientId(null);
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
  
  // Email is ready if Gmail connector is connected OR we have database providers
  const hasEmailProvider = gmailStatus?.connected || emailProviders.length > 0;
  const hasSmsProvider = smsProviders.length > 0;
  const hasVoiceProvider = voiceProviders.length > 0;

  // Search filter and pagination
  const filteredEmails = transientEmails.filter(email => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(query) ||
      email.fromEmail?.toLowerCase().includes(query) ||
      email.fromName?.toLowerCase().includes(query) ||
      email.snippet?.toLowerCase().includes(query)
    );
  });
  
  const totalPages = Math.ceil(filteredEmails.length / EMAILS_PER_PAGE);
  const paginatedEmails = filteredEmails.slice(
    (currentPage - 1) * EMAILS_PER_PAGE,
    currentPage * EMAILS_PER_PAGE
  );

  const handleFetchEmails = (loadMore: boolean = false) => {
    const pageToken = loadMore ? nextPageToken : null;
    fetchEmailsMutation.mutate({ pageToken, appendEmails: loadMore });
  };

  const handleFetchMore = () => {
    handleFetchEmails(true);
  };

  const handleSendToClient = (email: TransientEmail) => {
    setEmailToLink(email);
    setLinkDialogOpen(true);
  };

  const handleConfirmLink = () => {
    if (!emailToLink || !selectedClientId) {
      toast({ title: "Error", description: "Please select a client.", variant: "destructive" });
      return;
    }
    linkEmailMutation.mutate({ email: emailToLink, clientId: selectedClientId });
  };

  const handleSendEmail = () => {
    if (!composeData.to || !composeData.subject || !composeData.body) {
      toast({ title: "Validation Error", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    sendEmailMutation.mutate(composeData);
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
                  placeholder="Search emails..." 
                  className="w-64" 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  data-testid="input-search-emails" 
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  disabled={!hasEmailProvider || fetchEmailsMutation.isPending}
                  onClick={() => handleFetchEmails()}
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
              ) : filteredEmails.length === 0 ? (
                <div className="space-y-2">
                  <div className="bg-muted rounded-md p-6 text-center" data-testid="emails-empty">
                    <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">
                      {searchQuery ? 'No matching emails' : 'No emails loaded'}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                      {searchQuery 
                        ? `No emails match "${searchQuery}". Try a different search term.`
                        : hasEmailProvider 
                          ? "Click 'Sync Emails' to fetch your latest emails from Gmail. Emails are only saved when you link them to a client." 
                          : "Connect your email account to view and link client emails."}
                    </p>
                    {hasEmailProvider && !searchQuery && (
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

                  <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                    <DialogContent className="sm:max-w-[400px]">
                      <DialogHeader>
                        <DialogTitle>Send Email to Client</DialogTitle>
                        <DialogDescription>
                          Select a client to link this email to their page.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Label htmlFor="client-select">Select Client</Label>
                        <Select 
                          value={selectedClientId?.toString() || ""} 
                          onValueChange={(val) => setSelectedClientId(Number(val))}
                        >
                          <SelectTrigger className="mt-2" data-testid="select-client">
                            <SelectValue placeholder="Choose a client..." />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.user?.name || 'Unknown'} ({client.user?.email || 'No email'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {emailToLink && (
                          <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                            <p className="font-medium">{emailToLink.subject || '(No Subject)'}</p>
                            <p className="text-muted-foreground">From: {emailToLink.fromEmail}</p>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleConfirmLink}
                          disabled={!selectedClientId || linkEmailMutation.isPending}
                          data-testid="button-confirm-link"
                        >
                          {linkEmailMutation.isPending ? 'Linking...' : 'Link to Client'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </CardContent>
            <CardFooter className="border-t p-4">
              <div className="flex w-full justify-between items-center">
                <div className="text-sm text-muted-foreground" data-testid="text-email-count">
                  {transientEmails.length > 0 
                    ? filteredEmails.length > 0
                      ? `Showing ${(currentPage - 1) * EMAILS_PER_PAGE + 1}-${Math.min(currentPage * EMAILS_PER_PAGE, filteredEmails.length)} of ${filteredEmails.length}${searchQuery ? ' matching' : ''} emails${hasMoreEmails && !searchQuery ? ' (more available)' : ''}`
                      : `0 matching emails (${transientEmails.length} total loaded)` 
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
                <span>You need to set up an SMS provider (like Twilio) to use this feature.</span>
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
                  {smsProviders.filter(p => p.isDefault)[0]?.name || smsProviders[0]?.name}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Using {smsProviders.filter(p => p.isDefault)[0]?.type || smsProviders[0]?.type} for SMS messaging
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
                  <SelectItem value="all">All Messages</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Search messages..." className="w-64" />
            </div>
            <Button disabled={!hasSmsProvider}>
              <MessageSquare className="h-4 w-4 mr-2" />
              New SMS
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>SMS Messages</CardTitle>
              <CardDescription>
                Send and track text messages to clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-muted-foreground">No messages to display yet.</p>
                <div className="bg-muted rounded-md p-6 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">SMS Integration</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                    {hasSmsProvider 
                      ? "Your SMS provider is configured. You can now send text messages to clients." 
                      : "Connect with an SMS provider to send maintenance reminders, service updates, and other communications to clients."}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t p-4">
              <div className="flex w-full justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {hasSmsProvider 
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
