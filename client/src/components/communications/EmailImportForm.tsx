import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Upload, 
  Users, 
  User, 
  AlertCircle, 
  CheckCircle2,
  X 
} from 'lucide-react';

interface EmailImportFormProps {
  clientId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EmailImportForm({ clientId, onClose, onSuccess }: EmailImportFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    subject: '',
    fromEmail: '',
    fromName: '',
    toEmails: '',
    ccEmails: '',
    htmlContent: '',
    textContent: '',
    direction: 'inbound' as 'inbound' | 'outbound' | 'internal',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    sentAt: '',
    receivedAt: '',
    isSharedWithClient: false
  });

  const importEmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      const response = await fetch(`/api/clients/${clientId}/communications/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import email');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'communications'] });
      toast({
        title: "Email imported successfully",
        description: "The email has been added to the client communication hub"
      });
      onSuccess?.();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please enter an email subject",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.fromEmail.trim()) {
      toast({
        title: "From email required",
        description: "Please enter the sender's email address",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.toEmails.trim()) {
      toast({
        title: "Recipients required",
        description: "Please enter at least one recipient email",
        variant: "destructive"
      });
      return;
    }

    // Process email addresses
    const toEmailsArray = formData.toEmails.split(',').map(email => email.trim()).filter(email => email);
    const ccEmailsArray = formData.ccEmails ? formData.ccEmails.split(',').map(email => email.trim()).filter(email => email) : [];

    const emailData = {
      subject: formData.subject.trim(),
      fromEmail: formData.fromEmail.trim(),
      fromName: formData.fromName.trim() || undefined,
      toEmails: toEmailsArray,
      ccEmails: ccEmailsArray.length > 0 ? ccEmailsArray : undefined,
      htmlContent: formData.htmlContent.trim() || undefined,
      textContent: formData.textContent.trim() || undefined,
      direction: formData.direction,
      priority: formData.priority,
      sentAt: formData.sentAt || undefined,
      receivedAt: formData.receivedAt || undefined,
      isSharedWithClient: formData.isSharedWithClient
    };

    importEmailMutation.mutate(emailData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Import Email to Client Communications
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="Email subject line"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fromEmail">From Email *</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={formData.fromEmail}
                    onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                    placeholder="sender@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    value={formData.fromName}
                    onChange={(e) => handleInputChange('fromName', e.target.value)}
                    placeholder="Sender's display name"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="toEmails">To (Recipients) *</Label>
                <Input
                  id="toEmails"
                  value={formData.toEmails}
                  onChange={(e) => handleInputChange('toEmails', e.target.value)}
                  placeholder="recipient1@example.com, recipient2@example.com"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
              </div>

              <div>
                <Label htmlFor="ccEmails">CC (Optional)</Label>
                <Input
                  id="ccEmails"
                  value={formData.ccEmails}
                  onChange={(e) => handleInputChange('ccEmails', e.target.value)}
                  placeholder="cc1@example.com, cc2@example.com"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
              </div>
            </div>

            {/* Email Content */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="textContent">Email Content</Label>
                <Textarea
                  id="textContent"
                  value={formData.textContent}
                  onChange={(e) => handleInputChange('textContent', e.target.value)}
                  placeholder="Copy and paste the email content here..."
                  rows={6}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="htmlContent">HTML Content (Optional)</Label>
                <Textarea
                  id="htmlContent"
                  value={formData.htmlContent}
                  onChange={(e) => handleInputChange('htmlContent', e.target.value)}
                  placeholder="If the email has HTML formatting, paste it here..."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Email Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="direction">Email Direction</Label>
                <Select value={formData.direction} onValueChange={(value) => handleInputChange('direction', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">Inbound (From Client)</SelectItem>
                    <SelectItem value="outbound">Outbound (To Client)</SelectItem>
                    <SelectItem value="internal">Internal Team Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority Level</Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="normal">Normal Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sentAt">Sent Date/Time (Optional)</Label>
                <Input
                  id="sentAt"
                  type="datetime-local"
                  value={formData.sentAt}
                  onChange={(e) => handleInputChange('sentAt', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="receivedAt">Received Date/Time (Optional)</Label>
                <Input
                  id="receivedAt"
                  type="datetime-local"
                  value={formData.receivedAt}
                  onChange={(e) => handleInputChange('receivedAt', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Sharing Options */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Switch
                    id="isSharedWithClient"
                    checked={formData.isSharedWithClient}
                    onCheckedChange={(checked) => handleInputChange('isSharedWithClient', checked)}
                  />
                  <div>
                    <Label htmlFor="isSharedWithClient" className="text-sm font-medium">
                      Share with Client
                    </Label>
                    <p className="text-xs text-gray-600">
                      Should this email be visible to the client in their communications view?
                    </p>
                  </div>
                </div>
                {formData.isSharedWithClient ? (
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Client Visible
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-1" />
                    Team Only
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={importEmailMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {importEmailMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Import Email
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How to import emails:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Copy the email content from your inbox and paste it here</li>
                  <li>• Fill in the sender, recipients, and subject information</li>
                  <li>• Choose whether to share this with the client or keep it internal</li>
                  <li>• Your team can then collaborate on responses using comments</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}