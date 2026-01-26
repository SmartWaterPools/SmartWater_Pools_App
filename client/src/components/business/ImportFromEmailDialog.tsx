import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Paperclip, Calendar, Check } from 'lucide-react';

interface Email {
  id: number;
  subject: string | null;
  fromEmail: string;
  fromName: string | null;
  receivedAt: string | null;
  hasAttachments: boolean;
  snippet: string | null;
}

interface ImportFromEmailDialogProps {
  vendorId: number;
  vendorEmail?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
}

export function ImportFromEmailDialog({
  vendorId,
  vendorEmail,
  open,
  onOpenChange,
  onImportSuccess,
}: ImportFromEmailDialogProps) {
  const { toast } = useToast();
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);

  const { data: emails, isLoading, error } = useQuery<Email[]>({
    queryKey: ['/api/vendor-invoices/from-vendor-emails', vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/vendor-invoices/from-vendor-emails/${vendorId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch emails');
      }
      return res.json();
    },
    enabled: open,
  });

  const importMutation = useMutation({
    mutationFn: async (emailId: number) => {
      return apiRequest('POST', '/api/vendor-invoices/import-from-email', {
        emailId,
        vendorId,
      });
    },
    onSuccess: () => {
      toast({ 
        title: 'Invoice Imported', 
        description: 'The email has been imported as a vendor invoice.' 
      });
      onImportSuccess();
      onOpenChange(false);
      setSelectedEmailId(null);
    },
    onError: (error) => {
      toast({ 
        title: 'Import Failed', 
        description: `Failed to import invoice: ${error.message}`, 
        variant: 'destructive' 
      });
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleImport = () => {
    if (selectedEmailId) {
      importMutation.mutate(selectedEmailId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Import Invoice from Email
          </DialogTitle>
          <DialogDescription>
            {vendorEmail 
              ? `Select an email from ${vendorEmail} to import as an invoice.`
              : 'Select an email to import as an invoice.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <p>Failed to load emails. Please try again.</p>
            </div>
          ) : !emails || emails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No emails found from this vendor.</p>
              <p className="text-sm mt-2">
                {vendorEmail 
                  ? `We looked for emails from ${vendorEmail}.`
                  : 'Make sure the vendor has an email address configured.'
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmailId(email.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedEmailId === email.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {selectedEmailId === email.id && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                          <h4 className="font-medium truncate">
                            {email.subject || '(No subject)'}
                          </h4>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          From: {email.fromName || email.fromEmail}
                        </p>
                        {email.snippet && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {email.snippet}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(email.receivedAt)}
                        </div>
                        {email.hasAttachments && (
                          <Badge variant="secondary" className="text-xs">
                            <Paperclip className="h-3 w-3 mr-1" />
                            Attachments
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!selectedEmailId || importMutation.isPending}
          >
            {importMutation.isPending ? 'Importing...' : 'Import as Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
