import React from "react";
import { useLocation } from "wouter";
import { 
  PlusCircle, 
  Users,
  ArrowLeft
} from "lucide-react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientsTable } from "@/components/clients/ClientsTable";

// Demo data with the same structure as ClientWithUser
const demoClients = [
  {
    user: {
      id: "user1",
      name: "John Smith",
      email: "john@example.com",
    },
    client: {
      id: "client1",
      userId: "user1",
      companyName: "Smith Construction",
      contractType: "commercial",
      phone: "555-123-4567",
      address: "123 Business Ave",
      city: "Phoenix",
      state: "AZ",
      zip: "85001"
    },
    id: "client1",
    companyName: "Smith Construction",
    contractType: "commercial"
  },
  {
    user: {
      id: "user2",
      name: "Sarah Johnson",
      email: "sarah@example.com",
    },
    client: {
      id: "client2",
      userId: "user2",
      companyName: null,
      contractType: "residential",
      phone: "555-987-6543",
      address: "456 Home St",
      city: "Scottsdale",
      state: "AZ",
      zip: "85250"
    },
    id: "client2",
    companyName: null,
    contractType: "residential"
  },
  {
    user: {
      id: "user3",
      name: "Acme Pools Inc",
      email: "info@acmepools.example",
    },
    client: {
      id: "client3",
      userId: "user3",
      companyName: "Acme Pools Inc",
      contractType: "commercial",
      phone: "555-777-8888",
      address: "789 Corporate Blvd",
      city: "Tempe",
      state: "AZ",
      zip: "85281"
    },
    id: "client3",
    companyName: "Acme Pools Inc",
    contractType: "commercial"
  },
  {
    user: {
      id: "user4",
      name: "Robert Williams",
      email: "robert@example.com",
    },
    client: {
      id: "client4",
      userId: "user4",
      companyName: null,
      contractType: "residential",
      phone: "555-333-2222",
      address: "101 Resident Lane",
      city: "Mesa",
      state: "AZ",
      zip: "85201"
    },
    id: "client4",
    companyName: null,
    contractType: "residential"
  },
  {
    user: {
      id: "user5",
      name: "Elena Rodriguez",
      email: "elena@example.com",
    },
    client: {
      id: "client5",
      userId: "user5",
      companyName: null,
      contractType: "service",
      phone: "555-444-5555",
      address: "222 Service Rd",
      city: "Chandler",
      state: "AZ",
      zip: "85224"
    },
    id: "client5",
    companyName: null,
    contractType: "service"
  }
];

export default function ClientsDemo() {
  const [, setLocation] = useLocation();

  // Filter clients by type
  const commercialClients = demoClients.filter(client => 
    client.contractType?.toLowerCase() === "commercial");
    
  const residentialClients = demoClients.filter(client => 
    client.contractType?.toLowerCase() === "residential");
  
  const serviceClients = demoClients.filter(client =>
    client.contractType?.toLowerCase() === "service");

  return (
    <div>
      <Helmet>
        <title>Clients Demo | Pool Management</title>
      </Helmet>
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center">
          <Users className="h-7 w-7 text-primary mr-2" />
          <h1 className="text-2xl font-bold text-foreground font-heading">Clients Demo</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/clients")}
            className="h-9"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Clients
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white font-medium"
            onClick={() => setLocation("/demo/data-table")}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            View Tasks Demo
          </Button>
        </div>
      </div>

      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-yellow-800">
          <strong>Note:</strong> This is a demo page with sample data to showcase the enhanced table functionality.
          The actual client data is only accessible after authentication.
        </p>
      </div>

      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Clients ({demoClients.length})</TabsTrigger>
          <TabsTrigger value="residential">Residential ({residentialClients.length})</TabsTrigger>
          <TabsTrigger value="commercial">Commercial ({commercialClients.length})</TabsTrigger>
          <TabsTrigger value="service">Service ({serviceClients.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <ClientsTable 
            clients={demoClients} 
            isLoading={false}
          />
        </TabsContent>
        
        <TabsContent value="residential">
          <ClientsTable 
            clients={residentialClients} 
            isLoading={false}
          />
        </TabsContent>
        
        <TabsContent value="commercial">
          <ClientsTable 
            clients={commercialClients} 
            isLoading={false}
          />
        </TabsContent>
        
        <TabsContent value="service">
          <ClientsTable 
            clients={serviceClients} 
            isLoading={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}