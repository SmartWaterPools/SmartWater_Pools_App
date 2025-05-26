import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Plus, 
  MessageSquare, 
  Users, 
  ArrowLeft, 
  Calendar,
  User,
  Eye,
  EyeOff,
  Send,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import EmailImportForm from '@/components/communications/EmailImportForm';

interface Communication {
  id: number;
  subject: string;
  fromEmail: string;
  fromName?: string;
  direction: 'inbound' | 'outbound' | 'internal';
  status: 'unread' | 'read' | 'replied' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isSharedWithClient: boolean;
  isInternal: boolean;
  htmlContent?: string;
  textContent?: string;
  sentAt?: string;
  receivedAt?: string;
  createdAt: string;
  assignedToUser?: {
    id: number;
    name: string;
    email: string;
  };
  createdByUser: {
    id: number;
    name: string;
    email: string;
  };
  comments: Array<{
    id: number;
    content: string;
    isInternal: boolean;
    createdAt: string;
    user: {
      id: number;
      name: string;
      email: string;
    };
  }>;
  attachments: Array<{
    id: number;
    fileName: string;
    fileSize?: number;
    mimeType?: string;
  }>;
}

interface Client {
  id: number;
  name: string;
}

export default function ClientCommunications() {
  const { clientId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCommunication, setSelectedCommunication] = useState<Communication | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Fetch client communications
  const { data: communicationsData, isLoading } = useQuery({
    queryKey: ['/api/clients', clientId, 'communications'],
    enabled: !!clientId
  });

  const communications = communicationsData?.data?.communications || [];
  const clientName = communicationsData?.data?.clientName || '';

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ communicationId, content, isInternal }: {
      communicationId: number;
      content: string;
      isInternal: boolean;
    }) => {
      const response = await fetch(`/api/communications/${communicationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, isInternal })
      });
      if (!response.ok) throw new Error('Failed to add comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'communications'] });
      setNewComment('');
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    }
  });

  // Update communication mutation
  const updateCommunicationMutation = useMutation({
    mutationFn: async ({ communicationId, updates }: {
      communicationId: number;
      updates: Partial<Communication>;
    }) => {
      const response = await fetch(`/api/communications/${communicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update communication');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'communications'] });
      toast({
        title: "Updated",
        description: "Communication updated successfully"
      });
    }
  });

  const handleAddComment = () => {
    if (!selectedCommunication || !newComment.trim()) return;
    
    addCommentMutation.mutate({
      communicationId: selectedCommunication.id,
      content: newComment.trim(),
      isInternal: isInternalComment
    });
  };

  const handleStatusChange = (communicationId: number, status: string) => {
    updateCommunicationMutation.mutate({
      communicationId,
      updates: { status: status as Communication['status'] }
    });
  };

  const handlePriorityChange = (communicationId: number, priority: string) => {
    updateCommunicationMutation.mutate({
      communicationId,
      updates: { priority: priority as Communication['priority'] }
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread': return 'bg-yellow-100 text-yellow-800';
      case 'read': return 'bg-blue-100 text-blue-800';
      case 'replied': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading communications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/clients')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Communications - {clientName}
            </h1>
            <p className="text-gray-600">
              Collaborative client communication hub
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowImportDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Import Email
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Communications List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Communications ({communications.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {communications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Mail className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                    <p>No communications yet</p>
                    <p className="text-sm">Import your first email to get started</p>
                  </div>
                ) : (
                  communications.map((comm: Communication) => (
                    <div
                      key={comm.id}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                        selectedCommunication?.id === comm.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => setSelectedCommunication(comm)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-sm truncate pr-2">
                          {comm.subject}
                        </h3>
                        <div className="flex space-x-1">
                          <Badge className={`text-xs ${getPriorityColor(comm.priority)}`}>
                            {comm.priority}
                          </Badge>
                          <Badge className={`text-xs ${getStatusColor(comm.status)}`}>
                            {comm.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        From: {comm.fromName || comm.fromEmail}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {format(new Date(comm.createdAt), 'MMM d, h:mm a')}
                        </p>
                        <div className="flex items-center space-x-1">
                          {comm.comments.length > 0 && (
                            <span className="flex items-center text-xs text-gray-500">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              {comm.comments.length}
                            </span>
                          )}
                          {comm.isSharedWithClient ? (
                            <Eye className="h-3 w-3 text-green-600" />
                          ) : (
                            <EyeOff className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Communication Detail */}
        <div className="lg:col-span-2">
          {selectedCommunication ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg mb-2">
                      {selectedCommunication.subject}
                    </CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>From: {selectedCommunication.fromName || selectedCommunication.fromEmail}</span>
                      <span>•</span>
                      <span>{format(new Date(selectedCommunication.createdAt), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Select
                      value={selectedCommunication.status}
                      onValueChange={(value) => handleStatusChange(selectedCommunication.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unread">Unread</SelectItem>
                        <SelectItem value="read">Read</SelectItem>
                        <SelectItem value="replied">Replied</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={selectedCommunication.priority}
                      onValueChange={(value) => handlePriorityChange(selectedCommunication.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Email Content */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  {selectedCommunication.htmlContent ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: selectedCommunication.htmlContent }}
                      className="prose prose-sm max-w-none"
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">
                      {selectedCommunication.textContent || 'No content available'}
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4 flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Team Collaboration ({selectedCommunication.comments.length})
                  </h3>
                  
                  {/* Comments List */}
                  <div className="space-y-4 mb-6">
                    {selectedCommunication.comments.map((comment) => (
                      <div key={comment.id} className="flex space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {comment.user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">{comment.user.name}</span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                            </span>
                            {comment.isInternal ? (
                              <Badge variant="secondary" className="text-xs">
                                Internal
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Client Visible
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Select
                        value={isInternalComment ? "internal" : "external"}
                        onValueChange={(value) => setIsInternalComment(value === "internal")}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">
                            <span className="flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              Internal Team Note
                            </span>
                          </SelectItem>
                          <SelectItem value="external">
                            <span className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              Client Visible Comment
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {isInternalComment ? (
                        <div className="flex items-center text-sm text-gray-600">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Only visible to your team
                        </div>
                      ) : (
                        <div className="flex items-center text-sm text-green-600">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Will be shared with client
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Textarea
                        placeholder={isInternalComment ? "Add an internal team note..." : "Add a comment that will be shared with the client..."}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1"
                        rows={3}
                      />
                      <Button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || addCommentMutation.isPending}
                        size="sm"
                        className="self-end"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="font-medium mb-2">Select a Communication</h3>
                  <p className="text-sm">Choose an email from the list to view details and collaborate with your team</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Import Email Dialog */}
      {showImportDialog && (
        <EmailImportForm
          clientId={clientId!}
          onClose={() => setShowImportDialog(false)}
          onSuccess={() => {
            // Refresh communications list
            queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'communications'] });
          }}
        />
      )}
    </div>
  );
}