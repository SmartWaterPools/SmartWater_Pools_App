import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Shield, 
  CheckCircle2, 
  ExternalLink,
  Plus,
  AlertCircle
} from 'lucide-react';

interface OAuthProvider {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  description: string;
  scopes: string[];
}

interface OAuthEmailProviderSetupProps {
  organizationId?: number;
  onProviderAdded?: () => void;
}

export default function OAuthEmailProviderSetup({ organizationId, onProviderAdded }: OAuthEmailProviderSetupProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  // Fetch available OAuth providers
  const { data: providersData, isLoading } = useQuery({
    queryKey: ['/api/email-providers/oauth/available']
  });

  const availableProviders = providersData?.data?.providers || [];

  // Initiate OAuth flow mutation
  const initiateOAuthMutation = useMutation({
    mutationFn: async ({ providerId, organizationId }: { providerId: string; organizationId?: number }) => {
      const response = await fetch(`/api/email-providers/oauth/${providerId}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate OAuth flow');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Redirect to OAuth provider
      window.location.href = data.authUrl;
    },
    onError: (error: Error) => {
      setIsConnecting(null);
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleConnectProvider = (providerId: string) => {
    setIsConnecting(providerId);
    initiateOAuthMutation.mutate({ providerId, organizationId });
  };

  const getProviderIcon = (provider: OAuthProvider) => {
    switch (provider.id) {
      case 'gmail':
        return (
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            G
          </div>
        );
      case 'outlook':
        return (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            O
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white">
            <Mail className="h-4 w-4" />
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading available providers...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-green-600" />
            Secure Email Provider Setup
          </CardTitle>
          <p className="text-sm text-gray-600">
            Connect your email accounts securely using OAuth authentication. Your credentials are never stored locally.
          </p>
        </CardHeader>
        <CardContent>
          {availableProviders.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No OAuth Providers Available</h3>
              <p className="text-sm text-gray-600 mb-4">
                OAuth authentication requires additional configuration. Contact your administrator to enable secure email provider connections.
              </p>
              <div className="bg-blue-50 rounded-lg p-4 text-left">
                <p className="text-sm text-blue-800">
                  <strong>For administrators:</strong> Configure Google OAuth or Microsoft OAuth credentials in your environment variables to enable secure email provider setup.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {availableProviders.map((provider: OAuthProvider) => (
                <div key={provider.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getProviderIcon(provider)}
                      <div>
                        <h3 className="font-medium text-gray-900">{provider.displayName}</h3>
                        <p className="text-sm text-gray-600">{provider.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            OAuth 2.0
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Secure
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleConnectProvider(provider.id)}
                      disabled={isConnecting === provider.id}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isConnecting === provider.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Connect Securely
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Permissions Preview */}
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-gray-700 mb-2">Permissions needed:</p>
                    <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                      {provider.scopes.map((scope, index) => (
                        <div key={index} className="flex items-center">
                          <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
                          {scope.replace('gmail.', '').replace('Mail.', '').replace('User.', '')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Information */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-medium text-gray-900 mb-1">Your Security is Our Priority</h4>
              <ul className="space-y-1 text-gray-600 text-xs">
                <li>• We use industry-standard OAuth 2.0 authentication</li>
                <li>• Your email passwords are never stored or transmitted</li>
                <li>• You can revoke access at any time from your email provider's settings</li>
                <li>• All connections are encrypted and secure</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}