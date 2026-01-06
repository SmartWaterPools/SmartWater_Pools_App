import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Mail, MessageSquare, Phone, Search, AlertCircle, Settings, RefreshCw, Send, Check, Circle, Paperclip, Star } from "lucide-react";
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

interface Email {
  id: number;
  providerId: number;
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
  sentAt: string | null;
  syncedAt: string;
  organizationId: number | null;
}

export default function Communications() {
  const [activeTab, setActiveTab] = useState("email");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({ to: "", subject: "", body: "" });
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasMoreEmails, setHasMoreEmails] = useState(false);
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

  const { data: emails = [], isLoading: isLoadingEmails } = useQuery<Email[]>({
    queryKey: ['/api/emails']
  });

  const { data: gmailStatus } = useQuery<{ connected: boolean; email?: string; messagesTotal?: number }>({
    queryKey: ['/api/emails/connection-status/gmail']
  });

  const syncEmailsMutation = useMutation({
    mutationFn: async ({ providerId, pageToken }: { providerId?: number; pageToken?: string | null }) => {
      const response = await apiRequest('POST', '/api/emails/sync', { 
        providerId: providerId || 0,
        maxResults: 10,
        pageToken 
      });
      return response.json();
    },
    onSuccess: (data: { emailsSynced: number; nextPageToken?: string | null; hasMore: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      setNextPageToken(data.nextPageToken || null);
      setHasMoreEmails(data.hasMore);
      toast({ 
        title: "Emails Synced", 
        description: `${data.emailsSynced} new emails synced.${data.hasMore ? ' More emails available.' : ''}`
      });
    },
    onError: (error: Error) => {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
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

  const handleSyncEmails = (loadMore: boolean = false) => {
    const pageToken = loadMore ? nextPageToken : null;
    
    // If Gmail connector is connected, use it directly (no providerId needed)
    if (gmailStatus?.connected) {
      syncEmailsMutation.mutate({ providerId: 0, pageToken });
    } else {
      const providerId = emailProviders[0]?.id;
      if (providerId) {
        syncEmailsMutation.mutate({ providerId, pageToken });
      }
    }
  };

  const handleSyncMore = () => {
    handleSyncEmails(true);
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
              {gmailStatus?.connected && gmailStatus.messagesTotal !== undefined && (
                <div className="flex items-center gap-2" data-testid="gmail-status">
                  <span className="text-sm text-muted-foreground">({gmailStatus.messagesTotal} messages in account)</span>
                </div>
              )}
            </div>
          )}
        
          <div className="flex justify-between mb-4">
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]" data-testid="select-email-filter">
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Emails</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="drafts">Drafts</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Search emails..." className="w-64" data-testid="input-search-emails" />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                disabled={!hasEmailProvider || syncEmailsMutation.isPending}
                onClick={() => handleSyncEmails()}
                data-testid="button-sync-emails"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncEmailsMutation.isPending ? 'animate-spin' : ''}`} />
                {syncEmailsMutation.isPending ? 'Syncing...' : 'Sync Emails'}
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
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Emails</CardTitle>
              <CardDescription>
                Manage and view client email correspondence
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingEmails || isLoadingEmailProviders ? (
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
              ) : emails.length === 0 ? (
                <div className="space-y-2">
                  <div className="bg-muted rounded-md p-6 text-center" data-testid="emails-empty">
                    <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No emails found</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                      {hasEmailProvider 
                        ? "Click 'Sync Emails' to fetch your latest emails from the connected provider." 
                        : "Connect your email account to send and receive client emails directly from this dashboard."}
                    </p>
                    {hasEmailProvider && (
                      <Button 
                        className="mt-4" 
                        onClick={() => handleSyncEmails()}
                        disabled={syncEmailsMutation.isPending}
                        data-testid="button-sync-emails-empty"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncEmailsMutation.isPending ? 'animate-spin' : ''}`} />
                        {syncEmailsMutation.isPending ? 'Syncing...' : 'Sync Emails Now'}
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
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emails.map((email) => (
                        <TableRow 
                          key={email.id}
                          className={`cursor-pointer hover:bg-muted/50 ${!email.isRead ? 'font-semibold' : ''}`}
                          onClick={() => setSelectedEmail(email)}
                          data-testid={`email-row-${email.id}`}
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
                            {formatDate(email.receivedAt || email.sentAt)}
                          </TableCell>
                          <TableCell>
                            {email.isSent && <Badge variant="outline" className="text-xs">Sent</Badge>}
                            {email.isDraft && <Badge variant="outline" className="text-xs">Draft</Badge>}
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
                          <p>Date: {formatDate(selectedEmail?.receivedAt || selectedEmail?.sentAt || null)}</p>
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
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </CardContent>
            <CardFooter className="border-t p-4">
              <div className="flex w-full justify-between items-center">
                <div className="text-sm text-muted-foreground" data-testid="text-email-count">
                  {emails.length > 0 
                    ? `${emails.length} email${emails.length === 1 ? '' : 's'} synced${hasMoreEmails ? ' (more available)' : ''}` 
                    : hasEmailProvider 
                      ? `${emailProviders.length} email ${emailProviders.length === 1 ? 'provider' : 'providers'} configured` 
                      : "No email providers configured"}
                </div>
                <div className="flex gap-2">
                  {hasMoreEmails && emails.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSyncMore}
                      disabled={syncEmailsMutation.isPending}
                      data-testid="button-sync-more"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncEmailsMutation.isPending ? 'animate-spin' : ''}`} />
                      {syncEmailsMutation.isPending ? 'Syncing...' : 'Sync More'}
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
