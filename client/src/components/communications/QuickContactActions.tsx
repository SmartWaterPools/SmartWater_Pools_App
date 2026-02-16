import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Phone, MessageSquare, Mail, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface QuickContactActionsProps {
  phone?: string | null;
  email?: string | null;
  clientId?: number;
  vendorId?: number;
  projectId?: number;
  entityName?: string;
  compact?: boolean;
}

export function QuickContactActions({ phone, email, clientId, vendorId, projectId, entityName, compact = false }: QuickContactActionsProps) {
  const [callOpen, setCallOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [callerPhone, setCallerPhone] = useState("");
  const [callNotes, setCallNotes] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: twilioStatus } = useQuery<{ connected: boolean; phoneNumber?: string }>({
    queryKey: ['/api/twilio/connection-status'],
  });

  const initiateCallMutation = useMutation({
    mutationFn: async (data: { customerPhone: string; callerPhone: string; clientId?: number; vendorId?: number; projectId?: number; notes?: string }) => {
      const response = await apiRequest('POST', '/api/twilio/call', data);
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({ title: "Call Initiated", description: "Your phone will ring shortly. Answer to connect." });
        setCallOpen(false);
        setCallerPhone("");
        setCallNotes("");
      } else {
        toast({ title: "Call Failed", description: data.error || 'Failed to initiate call', variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Call Failed", description: error.message, variant: "destructive" });
    }
  });

  const sendSmsMutation = useMutation({
    mutationFn: async (data: { to: string; message: string; clientId?: number; projectId?: number }) => {
      const response = await apiRequest('POST', '/api/twilio/send-sms', data);
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({ title: "SMS Sent", description: "Message sent successfully" });
        setSmsOpen(false);
        setSmsMessage("");
      } else {
        toast({ title: "Send Failed", description: data.error || 'Failed to send SMS', variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Send Failed", description: error.message, variant: "destructive" });
    }
  });

  const handleEmailClick = () => {
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  const isConnected = twilioStatus?.connected;
  const buttonSize = compact ? "sm" as const : "default" as const;
  const iconSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <>
      <div className={`flex ${compact ? 'gap-1' : 'gap-2'}`}>
        {phone && isConnected && (
          <Button
            variant="outline"
            size={buttonSize}
            onClick={() => {
              setCallerPhone(user?.phone || "");
              setCallOpen(true);
            }}
            title={`Call ${entityName || phone}`}
          >
            <Phone className={`${iconSize} ${compact ? '' : 'mr-1'}`} />
            {!compact && "Call"}
          </Button>
        )}
        {phone && isConnected && (
          <Button
            variant="outline"
            size={buttonSize}
            onClick={() => setSmsOpen(true)}
            title={`Text ${entityName || phone}`}
          >
            <MessageSquare className={`${iconSize} ${compact ? '' : 'mr-1'}`} />
            {!compact && "Text"}
          </Button>
        )}
        {email && (
          <Button
            variant="outline"
            size={buttonSize}
            onClick={handleEmailClick}
            title={`Email ${entityName || email}`}
          >
            <Mail className={`${iconSize} ${compact ? '' : 'mr-1'}`} />
            {!compact && "Email"}
          </Button>
        )}
      </div>

      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Call {entityName || phone}</DialogTitle>
            <DialogDescription>
              We'll ring your phone first, then connect you to {entityName || 'the contact'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer Phone</Label>
              <Input value={phone || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Your Cell Phone</Label>
              <Input
                placeholder="+1234567890"
                value={callerPhone}
                onChange={(e) => setCallerPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">The number we'll ring first</p>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Call notes..."
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallOpen(false)}>Cancel</Button>
            <Button
              disabled={!callerPhone || !phone || initiateCallMutation.isPending}
              onClick={() => initiateCallMutation.mutate({
                customerPhone: phone!,
                callerPhone,
                clientId,
                vendorId,
                projectId,
                notes: callNotes || undefined
              })}
            >
              {initiateCallMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Phone className="h-4 w-4 mr-2" />}
              Call Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={smsOpen} onOpenChange={setSmsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send SMS to {entityName || phone}</DialogTitle>
            <DialogDescription>
              Send a text message via Twilio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>To</Label>
              <Input value={phone || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Type your message..."
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSmsOpen(false)}>Cancel</Button>
            <Button
              disabled={!smsMessage || !phone || sendSmsMutation.isPending}
              onClick={() => sendSmsMutation.mutate({
                to: phone!,
                message: smsMessage,
                clientId,
                projectId
              })}
            >
              {sendSmsMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}