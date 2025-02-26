import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  PlusCircle, 
  Search, 
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientList } from "@/components/clients/ClientList";
import { ClientWithUser } from "@/lib/types";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  const { data: clients, isLoading } = useQuery<ClientWithUser[]>({
    queryKey: ["/api/clients"],
  });

  const filteredClients = clients?.filter(client => {
    if (
      searchTerm &&
      !client.user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !(client.companyName && client.companyName.toLowerCase().includes(searchTerm.toLowerCase())) &&
      !client.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const commercialClients = filteredClients?.filter(client => 
    client.contractType?.toLowerCase() === "commercial");
    
  const residentialClients = filteredClients?.filter(client => 
    client.contractType?.toLowerCase() === "residential");

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center">
          <Users className="h-7 w-7 text-primary mr-2" />
          <h1 className="text-2xl font-bold text-foreground font-heading">Clients</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-3 md:mt-0">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search clients..." 
              className="pl-10 pr-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
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
          <TabsTrigger value="all">All Clients ({filteredClients?.length || 0})</TabsTrigger>
          <TabsTrigger value="residential">Residential ({residentialClients?.length || 0})</TabsTrigger>
          <TabsTrigger value="commercial">Commercial ({commercialClients?.length || 0})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <ClientList 
            clients={filteredClients || []} 
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="residential">
          <ClientList 
            clients={residentialClients || []} 
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="commercial">
          <ClientList 
            clients={commercialClients || []} 
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
