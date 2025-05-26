import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Trash2,
  RefreshCw,
  Settings
} from 'lucide-react';

interface EmailProviderStatus {
  connected: boolean;
  provider: string | null;
  emailAddress: string | null;
  configuredAt: string | null;
  needsReauth: boolean;
}

export default function SecureEmailProviderSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch current email provider status
  const { data: providerStatus, isLoading } = useQuery<{
    success: boolean;
    data: EmailProviderStatus;
  }>({
    queryKey: ['/api/email-providers/status']
  });

  const status = providerStatus?.data;

  // Connect Gmail provider mutation
  const connectGmailMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/email-providers/gmail/auth', {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate Gmail connection');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        setIsConnecting(true);
        // Open OAuth flow in the same window for better UX
        window.location.href = data.authUrl;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  });

  // Disconnect provider mutation
  const disconnectMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await fetch(`/api/email-providers/${provider}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to disconnect provider');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-providers/status'] });
      toast({
        title: "Provider disconnected",
        description: "Email provider has been successfully disconnected"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnection failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Check for OAuth callback results in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const email = urlParams.get('email');

    if (success === 'gmail_connected') {
      toast({
        title: "Gmail connected successfully!",
        description: email ? `Connected to ${email}` : "Your Gmail account is now connected"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email-providers/status'] });
      setIsConnecting(false);
      
      // Clean up URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      let errorMessage = "Failed to connect email provider";
      switch (error) {
        case 'gmail_auth_failed':
          errorMessage = "Gmail authorization was declined or failed";
          break;
        case 'unauthorized':
          errorMessage = "You don't have permission to configure email providers";
          break;
        case 'oauth_callback_failed':
          errorMessage = "OAuth callback processing failed";
          break;
        default:
          errorMessage = "An error occurred during connection";
      }
      
      toast({
        title: "Connection failed",
        description: errorMessage,
        variant: "destructive"
      });
      setIsConnecting(false);
      
      // Clean up URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast, queryClient]);

  const handleConnectGmail = () => {
    connectGmailMutation.mutate();
  };

  const handleDisconnect = (provider: string) => {
    if (window.confirm('Are you sure you want to disconnect this email provider? This will disable email functionality.')) {
      disconnectMutation.mutate(provider);
    }
  };

  const handleReconnect = () => {
    handleConnectGmail();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Email Provider Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mail className="h-5 w-5 mr-2" />
          Email Provider Setup
        </CardTitle>
        <p className="text-sm text-gray-600">
          Securely connect your email account using OAuth authentication
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Current Status */}
        {status?.connected ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <h3 className="font-medium text-green-900">
                    {status.provider === 'gmail' ? 'Gmail' : status.provider} Connected
                  </h3>
                  <p className="text-sm text-green-700">
                    {status.emailAddress}
                  </p>
                  {status.configuredAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Connected on {new Date(status.configuredAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {status.needsReauth && (
                  <Badge variant="destructive" className="text-xs">
                    Needs Reauth
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect(status.provider!)}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {status.needsReauth && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Your email provider needs to be reconnected. Click below to refresh the connection.
                  </p>
                </div>
                <Button
                  onClick={handleReconnect}
                  disabled={connectGmailMutation.isPending}
                  className="mt-2 bg-yellow-600 hover:bg-yellow-700"
                  size="sm"
                >
                  Reconnect
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-gray-400" />
              <div>
                <h3 className="font-medium text-gray-900">No Email Provider Connected</h3>
                <p className="text-sm text-gray-600">
                  Connect an email provider to enable email functionality
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Gmail Connection Option */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Available Providers</h3>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-medium">Gmail</h4>
                  <p className="text-sm text-gray-600">
                    Connect your Gmail account securely using OAuth
                  </p>
                </div>
              </div>
              
              {!status?.connected || status.provider !== 'gmail' ? (
                <Button
                  onClick={handleConnectGmail}
                  disabled={connectGmailMutation.isPending || isConnecting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {connectGmailMutation.isPending || isConnecting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Connect with OAuth
                    </>
                  )}
                </Button>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Connected
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Security Information */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Secure OAuth Authentication</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your email credentials are never stored on our servers</li>
                <li>• OAuth tokens are encrypted and securely managed</li>
                <li>• You can revoke access at any time from your email provider</li>
                <li>• Only organization administrators can configure email providers</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-sm text-gray-600">
          <p>
            <strong>Note:</strong> After connecting your email provider, it will be used for sending 
            automated notifications, service confirmations, and other client communications.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}