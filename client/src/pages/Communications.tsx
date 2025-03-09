import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Mail, MessageSquare, Phone, Search, AlertCircle, Settings, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

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

export default function Communications() {
  const [activeTab, setActiveTab] = useState("email");
  const { toast } = useToast();
  
  // Fetch email providers (Gmail and Outlook)
  const { data: emailProviders = [], isLoading: isLoadingEmailProviders } = useQuery<CommunicationProvider[]>({
    queryKey: ['/api/communication-providers'],
    select: (data) => data.filter(provider => 
      (provider.type === 'gmail' || provider.type === 'outlook') && provider.isActive
    )
  });
  
  // Fetch SMS providers (Twilio)
  const { data: smsProviders = [], isLoading: isLoadingSmsProviders } = useQuery<CommunicationProvider[]>({
    queryKey: ['/api/communication-providers'],
    select: (data) => data.filter(provider => provider.type === 'twilio' && provider.isActive)
  });
  
  // Fetch voice providers (RingCentral)
  const { data: voiceProviders = [], isLoading: isLoadingVoiceProviders } = useQuery<CommunicationProvider[]>({
    queryKey: ['/api/communication-providers'], 
    select: (data) => data.filter(provider => provider.type === 'ringcentral' && provider.isActive)
  });
  
  // Check if providers are configured
  const hasEmailProvider = emailProviders.length > 0;
  const hasSmsProvider = smsProviders.length > 0;
  const hasVoiceProvider = voiceProviders.length > 0;
  
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
          <Button variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          <Button 
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
              
              // If all good, proceed to create new message
              toast({
                title: "Create Message",
                description: "Creating a new message...",
              });
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
          <TabsTrigger value="email" className="flex items-center">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="calls" className="flex items-center">
            <Phone className="h-4 w-4 mr-2" />
            Call Log
          </TabsTrigger>
        </TabsList>
        
        {/* Email Tab Content */}
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
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {emailProviders.filter(p => p.isDefault)[0]?.name || emailProviders[0]?.name}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Using {emailProviders.filter(p => p.isDefault)[0]?.type || emailProviders[0]?.type} as the default email provider
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
                  <SelectItem value="all">All Emails</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="drafts">Drafts</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Search emails..." className="w-64" />
            </div>
            <Button disabled={!hasEmailProvider}>
              <Mail className="h-4 w-4 mr-2" />
              Compose Email
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Emails</CardTitle>
              <CardDescription>
                Manage and view client email correspondence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-muted-foreground">No emails to display yet.</p>
                <div className="bg-muted rounded-md p-6 text-center">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Email Integration</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                    {hasEmailProvider 
                      ? "Your email provider is configured. You can now send and receive emails." 
                      : "Connect your email account to send and receive client emails directly from this dashboard."}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t p-4">
              <div className="flex w-full justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {hasEmailProvider 
                    ? `${emailProviders.length} email ${emailProviders.length === 1 ? 'provider' : 'providers'} configured` 
                    : "No email providers configured"}
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
        
        {/* SMS Tab Content */}
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
        
        {/* Call Log Tab Content */}
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