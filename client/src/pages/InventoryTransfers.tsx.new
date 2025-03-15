import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { RotateCw, Truck, Boxes, Filter, Plus, Eye } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { PageHeader, PageHeaderDescription, PageHeaderHeading } from "@/components/page-header";
import { InventoryTransfer } from "@/components/inventory/InventoryTransfer";

// Transfer status badges
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    case 'in_transit':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Transit</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Format transfer type for display
const formatTransferType = (type: string) => {
  const [source, destination] = type.split('_to_');
  return (
    <div className="flex items-center gap-1.5">
      {source === 'warehouse' ? <Boxes className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
      <span className="capitalize">{source}</span>
      <span className="mx-1">→</span>
      {destination === 'warehouse' ? <Boxes className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
      <span className="capitalize">{destination}</span>
    </div>
  );
};

export default function InventoryTransfers() {
  const [activeTab, setActiveTab] = useState("all");
  
  // Fetch inventory transfers
  const { data: transfers = [], isLoading, error } = useQuery({
    queryKey: ['/api/inventory/transfers'],
    staleTime: 30000
  });

  // Define transfer type
  interface Transfer {
    id: number;
    transferType: string;
    status: string;
    createdAt: string;
    completedAt?: string;
    items?: Array<any>;
    notes?: string;
    sourceId: number;
    destinationId: number;
  }

  // Filter transfers based on active tab
  const filteredTransfers = (transfers as Transfer[]).filter((transfer) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return transfer.status === "pending";
    if (activeTab === "in_transit") return transfer.status === "in_transit";
    if (activeTab === "completed") return transfer.status === "completed";
    return true;
  });

  // Set document title via useEffect
  useEffect(() => {
    document.title = "Inventory Transfers | Pool Service Management";
  }, []);

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader>
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/business">Business</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Inventory Transfers</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <PageHeaderHeading>Inventory Transfers</PageHeaderHeading>
          <PageHeaderDescription>
            Manage inventory transfers between warehouses, vehicles, and client sites
          </PageHeaderDescription>
        </PageHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="all">All Transfers</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in_transit">In Transit</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              
              <Button variant="outline" size="sm" className="gap-1">
                <RotateCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
          
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create New Transfer</CardTitle>
                <CardDescription>
                  Transfer inventory between locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InventoryTransfer />
              </CardContent>
            </Card>
          
            <Card>
              <CardHeader>
                <CardTitle>Recent Transfers</CardTitle>
                <CardDescription>
                  View and manage inventory transfers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <RotateCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-destructive">
                    Failed to load transfers
                  </div>
                ) : filteredTransfers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No transfers found
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransfers.map((transfer: any) => (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              {format(new Date(transfer.createdAt), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>{formatTransferType(transfer.transferType)}</TableCell>
                            <TableCell>{transfer.items?.length || 0} items</TableCell>
                            <TableCell>
                              <StatusBadge status={transfer.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Eye className="h-4 w-4" />
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Transfers</CardTitle>
                <CardDescription>
                  Transfers that are pending approval or pickup
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <RotateCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTransfers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending transfers found
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransfers.map((transfer: any) => (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              {format(new Date(transfer.createdAt), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>{formatTransferType(transfer.transferType)}</TableCell>
                            <TableCell>{transfer.items?.length || 0} items</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Eye className="h-4 w-4" />
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="in_transit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>In Transit Transfers</CardTitle>
                <CardDescription>
                  Transfers that are currently in transit
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <RotateCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTransfers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No transfers in transit
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransfers.map((transfer: any) => (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              {format(new Date(transfer.createdAt), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>{formatTransferType(transfer.transferType)}</TableCell>
                            <TableCell>{transfer.items?.length || 0} items</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Eye className="h-4 w-4" />
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="completed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Completed Transfers</CardTitle>
                <CardDescription>
                  Transfers that have been completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <RotateCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTransfers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No completed transfers found
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Completed Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransfers.map((transfer: any) => (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              {format(new Date(transfer.createdAt), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>{formatTransferType(transfer.transferType)}</TableCell>
                            <TableCell>{transfer.items?.length || 0} items</TableCell>
                            <TableCell>
                              {transfer.completedAt 
                                ? format(new Date(transfer.completedAt), 'MMM d, yyyy')
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Eye className="h-4 w-4" />
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}