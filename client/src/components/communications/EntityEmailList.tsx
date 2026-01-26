import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Mail, Paperclip, Star, RefreshCw, ExternalLink, FileText } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

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
  linkInfo?: {
    id: number;
    linkType: string;
    isAutoLinked: boolean;
    confidence: number | null;
  };
}

interface EntityEmailListProps {
  entityType: 'project' | 'repair' | 'client' | 'vendor';
  entityId: number;
  entityName: string;
  onSendToDocuments?: (email: Email) => void;
}

export function EntityEmailList({ entityType, entityId, entityName, onSendToDocuments }: EntityEmailListProps) {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  
  const endpointMap = {
    project: `/api/emails/by-project/${entityId}`,
    repair: `/api/emails/by-repair/${entityId}`,
    client: `/api/emails/by-client/${entityId}`,
    vendor: `/api/emails/by-vendor/${entityId}`
  };

  const { data: emails = [], isLoading, refetch, isFetching } = useQuery<Email[]>({
    queryKey: [endpointMap[entityType]],
    enabled: !!entityId
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'N/A';
    }
  };

  const extractName = (emailStr: string) => {
    const match = emailStr.match(/^([^<]+)</);
    if (match) return match[1].trim();
    return emailStr.split('@')[0];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{entityType.charAt(0).toUpperCase() + entityType.slice(1)} Emails</CardTitle>
          <CardDescription>Loading emails...</CardDescription>
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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{entityType.charAt(0).toUpperCase() + entityType.slice(1)} Emails</CardTitle>
            <CardDescription>
              Email communication related to {entityName}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-refresh-emails"
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
          {emails.length === 0 ? (
            <div className="bg-muted rounded-md p-6 text-center" data-testid="emails-empty">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Emails Linked</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                No emails have been linked to this {entityType} yet. Sync your email to automatically link related messages, or manually link emails from the Communications hub.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link to="/communications">Go to Communications</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2" data-testid="emails-list">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${!email.isRead ? 'bg-blue-50/50 border-blue-100' : ''}`}
                  onClick={() => setSelectedEmail(email)}
                  data-testid={`email-row-${email.id}`}
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className={`h-2 w-2 rounded-full ${email.isRead ? 'bg-transparent' : 'bg-blue-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium truncate ${!email.isRead ? 'font-semibold' : ''}`}>
                        {extractName(email.fromEmail)}
                      </span>
                      {email.isStarred && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                      {email.hasAttachments && <Paperclip className="h-4 w-4 text-muted-foreground" />}
                      {email.linkInfo?.isAutoLinked && (
                        <Badge variant="outline" className="text-xs">Auto-linked</Badge>
                      )}
                    </div>
                    <p className={`text-sm truncate ${!email.isRead ? 'font-medium' : 'text-muted-foreground'}`}>
                      {email.subject || '(No subject)'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {email.snippet || email.bodyText?.slice(0, 100) || ''}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-xs text-muted-foreground">
                    {formatDate(email.receivedAt || email.sentAt)}
                  </div>
                </div>
              ))}
              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {emails.length} linked email{emails.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="email-detail-modal">
          {selectedEmail && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEmail.subject || '(No subject)'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex gap-2">
                    <span className="font-medium text-muted-foreground">From:</span>
                    <span>{selectedEmail.fromEmail}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-medium text-muted-foreground">To:</span>
                    <span>{selectedEmail.toEmails?.join(', ') || 'N/A'}</span>
                  </div>
                  {selectedEmail.ccEmails && selectedEmail.ccEmails.length > 0 && (
                    <div className="flex gap-2">
                      <span className="font-medium text-muted-foreground">CC:</span>
                      <span>{selectedEmail.ccEmails.join(', ')}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="font-medium text-muted-foreground">Date:</span>
                    <span>
                      {selectedEmail.receivedAt 
                        ? new Date(selectedEmail.receivedAt).toLocaleString() 
                        : selectedEmail.sentAt 
                          ? new Date(selectedEmail.sentAt).toLocaleString() 
                          : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="border-t pt-4">
                  {selectedEmail.bodyHtml ? (
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">
                      {selectedEmail.bodyText || 'No content'}
                    </div>
                  )}
                </div>
              </div>
              {onSendToDocuments && selectedEmail.hasAttachments && (
                <DialogFooter className="border-t pt-4">
                  <Button
                    onClick={() => {
                      onSendToDocuments(selectedEmail);
                      setSelectedEmail(null);
                    }}
                    className="w-full sm:w-auto"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Send to Document Analyzer
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
