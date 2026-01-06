import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, RefreshCw, ExternalLink, Send, ArrowDownLeft, ArrowUpRight, AlertCircle } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SMSMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  subject?: string;
  messageStatus: string;
  readStatus?: string;
  creationTime: string;
  lastModifiedTime?: string;
}

interface RingCentralStatus {
  connected: boolean;
  phoneNumber?: string;
  error?: string;
}

interface EntitySMSListProps {
  entityType: 'project' | 'repair' | 'client' | 'maintenance';
  entityId: number;
  entityName: string;
  entityPhone?: string;
}

export function EntitySMSList({ entityType, entityId, entityName, entityPhone }: EntitySMSListProps) {
  const [selectedSMS, setSelectedSMS] = useState<SMSMessage | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({ to: entityPhone || "", message: "" });
  const { toast } = useToast();

  const { data: connectionStatus, isLoading: isConnectionLoading } = useQuery<RingCentralStatus>({
    queryKey: ['/api/sms/connection-status']
  });

  const { data: smsData, isLoading, refetch, isFetching } = useQuery<{ messages: SMSMessage[]; success: boolean }>({
    queryKey: ['/api/sms/messages', entityType, entityId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityType === 'client') {
        params.set('clientId', entityId.toString());
      }
      const res = await fetch(`/api/sms/messages?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch SMS messages');
      return res.json();
    },
    enabled: !!entityId && connectionStatus?.connected === true
  });

  const sendSMSMutation = useMutation({
    mutationFn: async (data: { to: string; message: string; clientId?: number }) => {
      const response = await apiRequest('POST', '/api/sms/send', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sms/messages'] });
      toast({ title: "SMS Sent", description: "Your SMS has been sent successfully." });
      setComposeOpen(false);
      setComposeData({ to: entityPhone || "", message: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Send Failed", description: error.message, variant: "destructive" });
    }
  });

  const messages = smsData?.messages || [];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <Badge variant="default" className="bg-green-500">Delivered</Badge>;
      case 'sent':
        return <Badge variant="secondary">Sent</Badge>;
      case 'queued':
        return <Badge variant="outline">Queued</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'received':
        return <Badge variant="default" className="bg-blue-500">Received</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleSendSMS = () => {
    if (!composeData.to || !composeData.message) {
      toast({ title: "Error", description: "Phone number and message are required", variant: "destructive" });
      return;
    }
    sendSMSMutation.mutate({ 
      to: composeData.to, 
      message: composeData.message,
      clientId: entityType === 'client' ? entityId : undefined
    });
  };

  const handleOpenCompose = () => {
    setComposeData({ to: entityPhone || "", message: "" });
    setComposeOpen(true);
  };

  if (isLoading || isConnectionLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SMS Messages</CardTitle>
          <CardDescription>Loading SMS messages...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = connectionStatus?.connected === true;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>SMS Messages</CardTitle>
            <CardDescription>
              SMS communication for {entityName}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleOpenCompose}
              disabled={!isConnected}
              data-testid="button-send-sms"
            >
              <Send className="h-4 w-4 mr-1" />
              Send SMS
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching || !isConnected}
              data-testid="button-refresh-sms"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/communications">
                <ExternalLink className="h-4 w-4 mr-1" />
                View All
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="bg-muted rounded-md p-6 text-center" data-testid="sms-not-connected">
              <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
              <h3 className="text-lg font-medium">SMS Not Connected</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                RingCentral is not connected. Please configure your RingCentral integration in Settings to enable SMS functionality.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link to="/settings">Go to Settings</Link>
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="bg-muted rounded-md p-6 text-center" data-testid="sms-empty">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No SMS Messages</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                No SMS messages have been exchanged with this {entityType} yet. Send an SMS to start the conversation.
              </p>
              <Button variant="outline" className="mt-4" onClick={handleOpenCompose}>
                <Send className="h-4 w-4 mr-1" />
                Send First SMS
              </Button>
            </div>
          ) : (
            <div className="space-y-2" data-testid="sms-list">
              {messages.map((sms) => (
                <div
                  key={sms.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${sms.readStatus === 'Unread' ? 'bg-blue-50/50 border-blue-100' : ''}`}
                  onClick={() => setSelectedSMS(sms)}
                  data-testid={`sms-row-${sms.id}`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {sms.direction === 'inbound' ? (
                      <ArrowDownLeft className="h-5 w-5 text-blue-500" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={sms.direction === 'inbound' ? 'secondary' : 'outline'} className="text-xs">
                        {sms.direction === 'inbound' ? 'Received' : 'Sent'}
                      </Badge>
                      <span className="text-sm text-muted-foreground truncate">
                        {sms.direction === 'inbound' ? `From: ${sms.from}` : `To: ${sms.to}`}
                      </span>
                      {getStatusBadge(sms.messageStatus)}
                    </div>
                    <p className="text-sm truncate">
                      {sms.subject || '(No preview available)'}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-xs text-muted-foreground">
                    {formatDate(sms.creationTime)}
                  </div>
                </div>
              ))}
              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {messages.length} SMS message{messages.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSMS} onOpenChange={(open) => !open && setSelectedSMS(null)}>
        <DialogContent className="max-w-lg" data-testid="sms-detail-modal">
          {selectedSMS && (
            <>
              <DialogHeader>
                <DialogTitle>SMS Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex gap-2 items-center">
                    <span className="font-medium text-muted-foreground">Direction:</span>
                    <Badge variant={selectedSMS.direction === 'inbound' ? 'secondary' : 'outline'}>
                      {selectedSMS.direction === 'inbound' ? 'Received' : 'Sent'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-medium text-muted-foreground">From:</span>
                    <span>{selectedSMS.from}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-medium text-muted-foreground">To:</span>
                    <span>{selectedSMS.to}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="font-medium text-muted-foreground">Status:</span>
                    {getStatusBadge(selectedSMS.messageStatus)}
                  </div>
                  <div className="flex gap-2">
                    <span className="font-medium text-muted-foreground">Date:</span>
                    <span>{new Date(selectedSMS.creationTime).toLocaleString()}</span>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Message:</p>
                  <div className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md">
                    {selectedSMS.subject || '(No content available)'}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg" data-testid="sms-compose-modal">
          <DialogHeader>
            <DialogTitle>Send SMS to {entityName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sms-to">Phone Number</Label>
              <Input
                id="sms-to"
                placeholder="+1234567890"
                value={composeData.to}
                onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                data-testid="input-sms-to"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-message">Message</Label>
              <Textarea
                id="sms-message"
                placeholder="Type your message here..."
                rows={4}
                value={composeData.message}
                onChange={(e) => setComposeData({ ...composeData, message: e.target.value })}
                data-testid="input-sms-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendSMS} 
              disabled={sendSMSMutation.isPending}
              data-testid="button-send-sms-submit"
            >
              {sendSMSMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Send SMS
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
