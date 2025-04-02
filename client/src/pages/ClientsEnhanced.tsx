import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  PlusCircle, 
  Users,
  ArrowLeft
} from "lucide-react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientWithUser } from "@/lib/types";
import { ClientsTable } from "@/components/clients/ClientsTable";

export default function ClientsEnhanced() {
  const [, setLocation] = useLocation();

  // Fetch clients data
  const { data, isLoading, error } = useQuery<{clients: ClientWithUser[]}>({
    queryKey: ["/api/clients"],
  });
  
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
    </div>
  );
}