import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  PlusCircle, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  MoreHorizontal,
  Building,
  FileText,
  CalendarCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientList } from "@/components/clients/ClientList";
import { ClientWithUser } from "@/lib/types";

export default function Clients() {
  const [open, setOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  const commercialClients = filteredClients?.filter(client => client.contractType === "Commercial");
  const residentialClients = filteredClients?.filter(client => client.contractType === "Residential");

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground font-heading">Clients</h1>
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white font-medium">
                <PlusCircle className="h-4 w-4 mr-1" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Client form would go here */}
                <p className="text-sm text-gray-500">Form for adding new clients</p>
              </div>
            </DialogContent>
          </Dialog>
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
            onClientSelect={setSelectedClient}
          />
        </TabsContent>
        
        <TabsContent value="residential">
          <ClientList 
            clients={residentialClients || []} 
            isLoading={isLoading} 
            onClientSelect={setSelectedClient}
          />
        </TabsContent>
        
        <TabsContent value="commercial">
          <ClientList 
            clients={commercialClients || []} 
            isLoading={isLoading} 
            onClientSelect={setSelectedClient}
          />
        </TabsContent>
      </Tabs>

      {/* Client detail dialog */}
      {selectedClient && (
        <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Client Details</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center">
                      <div className="h-24 w-24 rounded-full bg-primary text-white flex items-center justify-center text-3xl mb-4">
                        {selectedClient.user.name.charAt(0)}
                      </div>
                      <h3 className="text-lg font-semibold">{selectedClient.user.name}</h3>
                      {selectedClient.companyName && (
                        <p className="text-sm text-gray-500">{selectedClient.companyName}</p>
                      )}
                      <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-primary">
                        {selectedClient.contractType}
                      </div>
                    </div>
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        <span>{selectedClient.user.email}</span>
                      </div>
                      {selectedClient.user.phone && (
                        <div className="flex items-center text-sm">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <span>{selectedClient.user.phone}</span>
                        </div>
                      )}
                      {selectedClient.user.address && (
                        <div className="flex items-start text-sm">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                          <span>{selectedClient.user.address}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="md:col-span-2 space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-4">
                      <Building className="h-5 w-5 text-primary mr-2" />
                      <h3 className="text-lg font-semibold">Projects</h3>
                    </div>
                    <div className="space-y-2">
                      {isLoading ? (
                        <Skeleton className="h-8 w-full" />
                      ) : (
                        <p className="text-sm text-gray-500">No active projects found for this client.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-4">
                      <CalendarCheck className="h-5 w-5 text-green-500 mr-2" />
                      <h3 className="text-lg font-semibold">Maintenance Schedule</h3>
                    </div>
                    <div className="space-y-2">
                      {isLoading ? (
                        <Skeleton className="h-8 w-full" />
                      ) : (
                        <p className="text-sm text-gray-500">No upcoming maintenance scheduled.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-4">
                      <FileText className="h-5 w-5 text-yellow-500 mr-2" />
                      <h3 className="text-lg font-semibold">Invoices</h3>
                    </div>
                    <div className="space-y-2">
                      {isLoading ? (
                        <Skeleton className="h-8 w-full" />
                      ) : (
                        <p className="text-sm text-gray-500">No recent invoices found.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
