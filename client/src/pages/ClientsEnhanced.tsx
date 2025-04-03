import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  PlusCircle, 
  Users,
  ArrowLeft,
  AlertCircle,
  Loader2,
  LogIn
} from "lucide-react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ClientWithUser } from "@/lib/types";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { useAuth } from "@/contexts/AuthContext";

export default function ClientsEnhanced() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Fetch clients data
  const { data, isLoading: dataLoading, error } = useQuery<{clients: ClientWithUser[]}>({
    queryKey: ["/api/clients"],
    // Don't attempt to fetch if not authenticated
    enabled: isAuthenticated,
  });
  
  const isLoading = authLoading || dataLoading;
  
  // Extract clients array from response, handling both formats for backward compatibility
  const clients = data && Array.isArray(data) ? data : data?.clients;
  
  // Log for debugging
  console.log("Clients data received:", data);
  if (error) console.error("Error fetching clients:", error);

  // Transform ClientWithUser structure for component use
  const processedClients = clients?.map(clientData => {
    return {
      ...clientData,
      // Add top-level fields for convenience
      id: clientData.client.id,
      companyName: clientData.client.companyName,
      contractType: clientData.client.contractType
    };
  });

  // Extract clients by contract type
  const commercialClients = processedClients?.filter(client => 
    client.contractType?.toLowerCase() === "commercial");
    
  const residentialClients = processedClients?.filter(client => 
    client.contractType?.toLowerCase() === "residential" || !client.contractType);
  
  const serviceClients = processedClients?.filter(client =>
    client.contractType?.toLowerCase() === "service");

  // Handle authentication state
  if (!isAuthenticated && !authLoading) {
    return (
      <div>
        <Helmet>
          <title>Clients | Pool Management</title>
        </Helmet>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center">
            <Users className="h-7 w-7 text-primary mr-2" />
            <h1 className="text-2xl font-bold text-foreground font-heading">Clients</h1>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              <h3 className="text-lg font-medium">Authentication Required</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4">You need to be logged in to view client information.</p>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white font-medium"
              onClick={() => setLocation("/")}
            >
              <LogIn className="h-4 w-4 mr-1" />
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Helmet>
        <title>Clients | Pool Management</title>
      </Helmet>
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center">
          <Users className="h-7 w-7 text-primary mr-2" />
          <h1 className="text-2xl font-bold text-foreground font-heading">Clients</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/clients")}
            className="h-9"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Card View
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white font-medium"
            onClick={() => setLocation("/clients/add")}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Add Client
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            There was a problem loading the client data. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading clients...</span>
        </div>
      ) : (
        <Tabs defaultValue="all" className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Clients ({processedClients?.length || 0})</TabsTrigger>
            <TabsTrigger value="residential">Residential ({residentialClients?.length || 0})</TabsTrigger>
            <TabsTrigger value="commercial">Commercial ({commercialClients?.length || 0})</TabsTrigger>
            <TabsTrigger value="service">Service ({serviceClients?.length || 0})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <ClientsTable 
              clients={processedClients || []} 
              isLoading={isLoading}
            />
          </TabsContent>
          
          <TabsContent value="residential">
            <ClientsTable 
              clients={residentialClients || []} 
              isLoading={isLoading}
            />
          </TabsContent>
          
          <TabsContent value="commercial">
            <ClientsTable 
              clients={commercialClients || []} 
              isLoading={isLoading}
            />
          </TabsContent>
          
          <TabsContent value="service">
            <ClientsTable 
              clients={serviceClients || []} 
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}