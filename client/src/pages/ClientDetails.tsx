import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MapPin, Phone, Mail, Calendar, Clock, AlertCircle, CheckCircle2, User, Droplet as DropletIcon, Settings, BarChart, Building2, Camera, Plus, ImagePlus, CalendarIcon, History, MessageSquare, FileText, DollarSign, Eye, Trash2 } from 'lucide-react';
import { formatDate, formatCurrency, ClientWithUser, PoolEquipment, PoolImage } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import ClientAddressMap from '@/components/maps/ClientAddressMap';
import { EntityEmailList } from '@/components/communications/EntityEmailList';
import { EntitySMSList } from '@/components/communications/EntitySMSList';
import { QuickContactActions } from '@/components/communications/QuickContactActions';

// We need to extend the ClientWithUser type to include the additional properties
// that are used in this component but are not part of the original type
interface ExtendedClientData extends Omit<ClientWithUser, 'poolType' | 'poolSize' | 'filterType' | 'chemicalSystem' | 'heaterType' | 'specialNotes' | 'serviceDay'> {
  // These properties are used in the component but not in the original ClientWithUser
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  poolType?: string | null;
  poolSize?: string | null;
  filterType?: string | null;
  heaterType?: string | null;
  chemicalSystem?: string | null;
  poolFeatures?: string;
  serviceDay: string | null;
  specialNotes: string | null;
  monthlyRate?: number;
  contractStartDate?: string | Date;
  contractRenewalDate?: string | Date;
  upcomingServices?: Array<any>;
  issues?: Array<any>;
  serviceHistory?: Array<any>;
  paymentInfo?: { lastFour?: string };
  billingCycle?: string;
  autoPay?: boolean;
  invoices?: Array<any>;
  documents?: Array<any>;
  equipment?: Array<PoolEquipment>;
  images?: Array<PoolImage>;
}

function ClientCallHistory({ clientId }: { clientId: number }) {
  const { data, isLoading } = useQuery<{ success: boolean; callLogs: Array<{
    id: number;
    direction: string;
    fromNumber: string;
    toNumber: string;
    status: string;
    duration: number | null;
    notes: string | null;
    createdAt: string;
  }> }>({
    queryKey: ['/api/twilio/call-logs/client', clientId],
    queryFn: async () => {
      const res = await fetch(`/api/twilio/call-logs/client/${clientId}`);
      if (!res.ok) throw new Error('Failed to fetch call logs');
      return res.json();
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  const logs = data?.callLogs || [];

  if (logs.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No call history with this client yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((call) => (
        <div key={call.id} className="flex items-center justify-between p-3 border rounded-md">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-full ${call.direction === 'outbound' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              <Phone className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {call.direction === 'outbound' ? 'Outgoing' : 'Incoming'} Call
              </p>
              <p className="text-xs text-muted-foreground">
                {call.toNumber} &middot; {call.createdAt ? new Date(call.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {call.duration && (
              <span className="text-xs text-muted-foreground">
                {Math.floor(call.duration / 60)}m {call.duration % 60}s
              </span>
            )}
            <Badge variant={
              call.status === 'completed' ? 'default' :
              call.status === 'failed' ? 'destructive' :
              'secondary'
            } className="text-xs">
              {call.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ClientDetails() {
  const { id } = useParams();
  const [_, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const isMobile = useIsMobile();
  
  // Fetch client data
  const { 
    data: client, 
    isLoading: isClientLoading,
    error: clientError
  } = useQuery({
    queryKey: ['/api/clients', id],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error('Failed to fetch client');
      return res.json() as Promise<ExtendedClientData>;
    },
    enabled: !!id
  });

  // Fetch equipment data when pool tab is active
  const { 
    data: equipmentData,
    isLoading: isEquipmentLoading
  } = useQuery({
    queryKey: [`/api/clients/${id}/equipment`],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${id}/equipment`);
      if (!res.ok) throw new Error('Failed to fetch equipment');
      return res.json() as Promise<PoolEquipment[]>;
    },
    enabled: !!id
  });

  // Fetch images data when pool tab is active
  const { 
    data: imagesData,
    isLoading: isImagesLoading
  } = useQuery({
    queryKey: [`/api/clients/${id}/images`],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${id}/images`);
      if (!res.ok) throw new Error('Failed to fetch images');
      return res.json() as Promise<PoolImage[]>;
    },
    enabled: !!id
  });
  
  // Fetch upcoming maintenance services for this client
  const {
    data: upcomingServicesData,
    isLoading: isServicesLoading
  } = useQuery({
    queryKey: [`/api/maintenances/upcoming`, id],
    queryFn: async () => {
      const res = await fetch(`/api/maintenances/upcoming?clientId=${id}&days=30`);
      if (!res.ok) throw new Error('Failed to fetch upcoming services');
      return res.json();
    },
    enabled: !!id
  });
  
  // Fetch all work orders for this client
  const {
    data: workOrdersData,
    isLoading: isHistoryLoading
  } = useQuery({
    queryKey: ['/api/work-orders', 'client', id],
    queryFn: async () => {
      const res = await fetch(`/api/work-orders?clientId=${id}&includeClient=true`);
      if (!res.ok) throw new Error('Failed to fetch work orders');
      return res.json();
    },
    enabled: !!id
  });

  // Fetch invoices for this client
  const { 
    data: invoicesData,
    isLoading: isInvoicesLoading
  } = useQuery({
    queryKey: ['/api/invoices', 'client', id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices?clientId=${id}`);
      if (!res.ok) throw new Error('Failed to fetch invoices');
      return res.json();
    },
    enabled: !!id
  });

  // Calculate invoice summary metrics
  const invoiceSummary = {
    totalBilled: invoicesData?.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) || 0,
    totalPaid: invoicesData?.reduce((sum: number, inv: any) => inv.status === 'paid' ? sum + (inv.total || 0) : sum, 0) || 0,
    outstanding: invoicesData?.reduce((sum: number, inv: any) => ['sent', 'viewed', 'partial', 'overdue'].includes(inv.status) ? sum + (inv.amountDue || 0) : sum, 0) || 0
  };
  
  // Process work orders to create service history items
  const serviceHistory = workOrdersData?.map((wo: any) => {
    return {
      id: wo.id,
      date: wo.scheduledDate,
      type: wo.title || wo.category || 'Work Order',
      category: wo.category || 'maintenance',
      notes: wo.description || wo.notes || '',
      technician: wo.technician?.user?.name || 'Unassigned',
      status: wo.status,
      priority: wo.priority
    };
  }) || [];

  // Selection state for bulk operations
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const { toast } = useToast();

  const deleteWorkOrderMutation = useMutation({
    mutationFn: async (workOrderId: number) => {
      await apiRequest('DELETE', `/api/work-orders/${workOrderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders', 'client', id] });
      toast({ title: 'Work order deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete work order', description: error.message, variant: 'destructive' });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(woId => apiRequest('DELETE', `/api/work-orders/${woId}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders', 'client', id] });
      setSelectedServices(new Set());
      toast({ title: 'Selected work orders deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete work orders', description: error.message, variant: 'destructive' });
    }
  });

  const toggleServiceSelection = (serviceId: number) => {
    setSelectedServices(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const toggleSelectAll = (services: any[]) => {
    if (selectedServices.size === services.length) {
      setSelectedServices(new Set());
    } else {
      setSelectedServices(new Set(services.map((s: any) => s.id)));
    }
  };

  // Update ExtendedClientData with the fetched equipment, images, and services
  const clientWithData: ExtendedClientData | null = client ? {
    ...client,
    equipment: equipmentData || [],
    images: imagesData || [],
    upcomingServices: upcomingServicesData || [],
    serviceHistory: serviceHistory || []
  } : null;
  
  // Add console logs for debugging
  useEffect(() => {
    if (client) {
      console.log('Client data loaded:', client);
    }
    if (equipmentData) {
      console.log('Equipment data loaded:', equipmentData);
    }
    if (imagesData) {
      console.log('Images data loaded:', imagesData);
    }
    if (workOrdersData) {
      console.log('Work orders loaded:', workOrdersData);
    }
    if (serviceHistory) {
      console.log('Service history processed:', serviceHistory);
    }
  }, [client, equipmentData, imagesData, workOrdersData, serviceHistory]);

  if (isClientLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <Skeleton className="h-8 w-40 mr-4" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Client not found</h1>
        <Button onClick={() => setLocation('/clients')}>Back to Clients</Button>
      </div>
    );
  }

  // Client data is directly available via client, equipment via equipmentData, and images via imagesData
  // We don't need to rely on displayClient anymore as we're accessing direct data sources

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{client.user.name}</h1>
          <p className="text-gray-500">{client.user.address || 'No address provided'}</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button variant="outline" onClick={() => setLocation(`/clients/${id}/edit`)}>
            Edit Client
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setLocation(`/pool-wizard/${id}`)}
            className="flex items-center"
          >
            <DropletIcon className="h-4 w-4 mr-2" />
            Pool Wizard
          </Button>
          <Button onClick={() => setLocation(`/clients/${id}/portal`)}>
            View Client Portal
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList className="bg-white border min-w-max">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="pool">Pool Details</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="communications" className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-1" />
            Communications
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center">
            <FileText className="h-4 w-4 mr-1" />
            Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                    <div>
                      <p>{client.user.address || 'No address provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-gray-500" />
                    <p>{client.user.phone || 'No phone provided'}</p>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 mr-2 text-gray-500" />
                    <p>{client.user.email || 'No email provided'}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t mt-2">
                    <QuickContactActions
                      phone={client.user.phone}
                      email={client.user.email}
                      clientId={client.client.id}
                      entityName={client.user.name}
                    />
                  </div>
                  
                  {(client.client?.billingAddress || client.client?.billingCity || client.client?.billingState || client.client?.billingZip) && (
                    <div className="pt-2 border-t mt-2">
                      <p className="text-sm font-medium text-gray-500 mb-1">Billing Address</p>
                      <div className="flex items-start">
                        <MapPin className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                        <div>
                          {client.client?.billingAddress && <p>{client.client.billingAddress}</p>}
                          <p>
                            {[client.client?.billingCity, client.client?.billingState].filter(Boolean).join(', ')}
                            {client.client?.billingZip ? ` ${client.client.billingZip}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Google Maps integration */}
                  {client.user.address && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <ClientAddressMap 
                        address={client.user.address}
                        latitude={client.client.latitude || null}
                        longitude={client.client.longitude || null}
                        height="200px"
                        width="100%"
                        mapType="satellite"
                        zoom={17}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="pb-2 flex justify-between items-center">
                <CardTitle className="text-lg">Pool Information</CardTitle>
                {!isMobile && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-primary hover:text-primary/80"
                    onClick={() => {
                      setActiveTab('pool');
                      // Use setTimeout to ensure tab content is rendered before scrolling
                      setTimeout(() => {
                        const poolSection = document.getElementById('pool-details-section');
                        if (poolSection) {
                          poolSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 100);
                    }}
                  >
                    View Details
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pool Type:</span>
                    <span>{client.poolType || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Size:</span>
                    <span>{client.poolSize || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Filter Type:</span>
                    <span>{client.filterType || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Chemical System:</span>
                    <span>{client.chemicalSystem || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Heater Type:</span>
                    <span>{client.heaterType || 'Not specified'}</span>
                  </div>
                  
                  {/* Add button for mobile view */}
                  {isMobile && (
                    <div className="flex flex-col gap-2 pt-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => setLocation(`/pool-wizard/${id}`)}
                      >
                        Edit Pool Information
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="pb-2 flex justify-between items-center">
                <CardTitle className="text-lg">Service Contract</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Contract Type:</span>
                    <Badge variant="outline">
                      {client.contractType || 'Not Specified'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service Day:</span>
                    <span>{client.serviceDay || 'Not Specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Monthly Rate:</span>
                    <span className="font-medium">{formatCurrency(client.monthlyRate || 199)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Special Notes:</span>
                    <span>{client.specialNotes || 'None'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Updated:</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                  
                  {/* Add Edit Contract button for mobile */}
                  {isMobile && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => setLocation(`/clients/${id}/edit`)}
                    >
                      Edit Contract
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Services</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingServicesData && upcomingServicesData.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingServicesData.map((service: any, index: number) => (
                      <div key={index} className="flex items-start p-3 border rounded-lg">
                        <div className="bg-blue-100 p-2 rounded-full mr-3">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h4 className="font-medium">{service.type || 'Maintenance'}</h4>
                            <span className="text-sm text-gray-500">{formatDate(service.scheduleDate)}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{service.scheduleTime || '09:00 AM'}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <User className="h-3 w-3 mr-1" />
                            <span>{service.technician?.user?.name || 'Not assigned'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Schedule Service button at the bottom when on mobile */}
                    {isMobile && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={() => {
                          setLocation('/maintenance');
                        }}
                      >
                        Schedule Additional Service
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <DropletIcon className="h-12 w-12 mx-auto text-blue-200 mb-2" />
                    <p className="text-gray-500">No upcoming services scheduled</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        // Navigate to maintenance page
                        setLocation('/maintenance');
                      }}
                    >
                      Schedule Service
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Recent Issues</CardTitle>
              </CardHeader>
              <CardContent>
                {client.issues && client.issues.length > 0 ? (
                  <div className="space-y-4">
                    {client.issues.map((issue, index) => (
                      <div key={index} className="flex items-start p-3 border rounded-lg">
                        <div className={`p-2 rounded-full mr-3 ${issue.resolved ? 'bg-green-100' : 'bg-amber-100'}`}>
                          {issue.resolved ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h4 className="font-medium">{issue.title}</h4>
                            <Badge variant={issue.resolved ? "outline" : "secondary"}>
                              {issue.resolved ? "Resolved" : "Open"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-500">
                              Reported: {formatDate(issue.reportedDate)}
                            </span>
                            {issue.resolved && (
                              <span className="text-xs text-gray-500">
                                Resolved: {formatDate(issue.resolvedDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Report Issue button for mobile view */}
                    {isMobile && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={() => {
                          setLocation(`/repairs`);
                        }}
                      >
                        Report New Issue
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-200 mb-2" />
                    <p className="text-gray-500">No recent issues reported</p>
                    
                    {/* Always show the button when there are no issues */}
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        setLocation(`/repairs`);
                      }}
                    >
                      Report New Issue
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services">
          <div className="space-y-6">
            {selectedServices.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium">{selectedServices.size} item{selectedServices.size > 1 ? 's' : ''} selected</span>
                <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={bulkDeleteMutation.isPending}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {selectedServices.size} work order{selectedServices.size > 1 ? 's' : ''}?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone. The selected work orders will be permanently deleted.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { bulkDeleteMutation.mutate(Array.from(selectedServices)); setShowBulkDeleteDialog(false); }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" size="sm" onClick={() => setSelectedServices(new Set())}>Cancel</Button>
              </div>
            )}

            <Tabs defaultValue="all">
              <div className="flex justify-center w-full overflow-x-auto pb-2">
                <TabsList className="justify-center min-w-max">
                  <TabsTrigger value="all">All Services</TabsTrigger>
                  <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                  <TabsTrigger value="repair">Repairs</TabsTrigger>
                  <TabsTrigger value="construction">Construction</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all">
                <Card className="bg-white">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Service History</CardTitle>
                        <CardDescription>All work orders for this client</CardDescription>
                      </div>
                      {serviceHistory && serviceHistory.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedServices.size === serviceHistory.length && serviceHistory.length > 0}
                            onCheckedChange={() => toggleSelectAll(serviceHistory)}
                          />
                          <span className="text-sm text-gray-500">Select All</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {serviceHistory && serviceHistory.length > 0 ? (
                        serviceHistory.map((service: any) => (
                          <div key={service.id} className="flex items-start p-4 border rounded-lg">
                            <div className="flex items-center mr-3 pt-1">
                              <Checkbox
                                checked={selectedServices.has(service.id)}
                                onCheckedChange={() => toggleServiceSelection(service.id)}
                              />
                            </div>
                            <div className="mr-4">
                              <div className={`p-3 rounded-full ${
                                service.category === 'repair' ? 'bg-amber-100' : 
                                service.category === 'construction' ? 'bg-indigo-100' : 
                                'bg-blue-100'
                              }`}>
                                <DropletIcon className={`h-5 w-5 ${
                                  service.category === 'repair' ? 'text-amber-600' : 
                                  service.category === 'construction' ? 'text-indigo-600' : 
                                  'text-blue-600'
                                }`} />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <div>
                                  <h4 className="font-medium">{service.type}</h4>
                                  <div className="flex gap-1 mt-1">
                                    <Badge variant={
                                      service.category === 'repair' ? 'destructive' : 
                                      service.category === 'construction' ? 'secondary' : 
                                      'default'
                                    }>
                                      {service.category || 'Maintenance'}
                                    </Badge>
                                    <Badge variant="outline" className={
                                      service.status === 'completed' ? 'border-green-500 text-green-700' :
                                      service.status === 'in_progress' ? 'border-blue-500 text-blue-700' :
                                      service.status === 'scheduled' ? 'border-purple-500 text-purple-700' :
                                      service.status === 'cancelled' ? 'border-red-500 text-red-700' :
                                      'border-gray-500 text-gray-700'
                                    }>
                                      {service.status}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-sm text-gray-500">{formatDate(service.date)}</span>
                                  <AlertDialog open={deleteTargetId === service.id} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600" onClick={() => setDeleteTargetId(service.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete work order?</AlertDialogTitle>
                                        <AlertDialogDescription>This action cannot be undone. "{service.type}" will be permanently deleted.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => { deleteWorkOrderMutation.mutate(service.id); setDeleteTargetId(null); }}>Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mt-2">{service.notes}</p>
                              <div className="flex gap-2 mt-3">
                                <div className="text-xs bg-gray-100 p-2 rounded-md">
                                  <span className="text-gray-500">Technician:</span> {service.technician}
                                </div>
                                {service.priority && (
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Priority:</span> {service.priority}
                                  </div>
                                )}
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="mt-2"
                                onClick={() => setLocation(`/service-report/${service.id}`)}
                              >
                                View Full Report
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <History className="h-12 w-12 mx-auto text-blue-200 mb-2" />
                          <p className="text-gray-500">No service history available</p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => setLocation('/maintenance')}
                          >
                            Schedule Service
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Maintenance Tab */}
              <TabsContent value="maintenance">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle>Maintenance History</CardTitle>
                    <CardDescription>Regular pool maintenance visits</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {serviceHistory && serviceHistory.filter((s: any) => s.category === 'maintenance').length > 0 ? (
                        serviceHistory
                          .filter((s: any) => s.category === 'maintenance')
                          .map((service: any) => (
                            <div key={service.id} className="flex items-start p-4 border rounded-lg">
                              <div className="flex items-center mr-3 pt-1">
                                <Checkbox checked={selectedServices.has(service.id)} onCheckedChange={() => toggleServiceSelection(service.id)} />
                              </div>
                              <div className="mr-4">
                                <div className="bg-blue-100 p-3 rounded-full">
                                  <DropletIcon className="h-5 w-5 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <div>
                                    <h4 className="font-medium">{service.type || 'Regular Maintenance'}</h4>
                                    <Badge variant="outline" className={service.status === 'completed' ? 'border-green-500 text-green-700' : service.status === 'in_progress' ? 'border-blue-500 text-blue-700' : 'border-gray-500 text-gray-700'}>{service.status}</Badge>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="text-sm text-gray-500">{formatDate(service.date)}</span>
                                    <AlertDialog open={deleteTargetId === service.id} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600" onClick={() => setDeleteTargetId(service.id)}><Trash2 className="h-4 w-4" /></Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Delete work order?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { deleteWorkOrderMutation.mutate(service.id); setDeleteTargetId(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{service.notes}</p>
                                <div className="flex gap-2 mt-3">
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Technician:</span> {service.technician}
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setLocation(`/service-report/${service.id}`)}>View Full Report</Button>
                              </div>
                            </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <History className="h-12 w-12 mx-auto text-blue-200 mb-2" />
                          <p className="text-gray-500">No maintenance history available</p>
                          <Button variant="outline" className="mt-4" onClick={() => setLocation('/maintenance')}>Schedule Maintenance</Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Repairs Tab */}
              <TabsContent value="repair">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle>Repair History</CardTitle>
                    <CardDescription>Equipment and system repairs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {serviceHistory && serviceHistory.filter((s: any) => s.category === 'repair').length > 0 ? (
                        serviceHistory
                          .filter((s: any) => s.category === 'repair')
                          .map((service: any) => (
                            <div key={service.id} className="flex items-start p-4 border rounded-lg">
                              <div className="flex items-center mr-3 pt-1">
                                <Checkbox checked={selectedServices.has(service.id)} onCheckedChange={() => toggleServiceSelection(service.id)} />
                              </div>
                              <div className="mr-4">
                                <div className="bg-amber-100 p-3 rounded-full">
                                  <Settings className="h-5 w-5 text-amber-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <div>
                                    <h4 className="font-medium">{service.type || 'Equipment Repair'}</h4>
                                    <Badge variant="outline" className={service.status === 'completed' ? 'border-green-500 text-green-700' : service.status === 'in_progress' ? 'border-blue-500 text-blue-700' : 'border-gray-500 text-gray-700'}>{service.status}</Badge>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="text-sm text-gray-500">{formatDate(service.date)}</span>
                                    <AlertDialog open={deleteTargetId === service.id} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600" onClick={() => setDeleteTargetId(service.id)}><Trash2 className="h-4 w-4" /></Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Delete work order?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { deleteWorkOrderMutation.mutate(service.id); setDeleteTargetId(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{service.notes}</p>
                                <div className="flex gap-2 mt-3">
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Technician:</span> {service.technician}
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setLocation(`/service-report/${service.id}`)}>View Full Report</Button>
                              </div>
                            </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Settings className="h-12 w-12 mx-auto text-amber-200 mb-2" />
                          <p className="text-gray-500">No repair history available</p>
                          <Button variant="outline" className="mt-4" onClick={() => setLocation('/repairs')}>Request Repair</Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Construction Tab */}
              <TabsContent value="construction">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle>Construction History</CardTitle>
                    <CardDescription>Pool construction and major renovations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {serviceHistory && serviceHistory.filter((s: any) => s.category === 'construction').length > 0 ? (
                        serviceHistory
                          .filter((s: any) => s.category === 'construction')
                          .map((service: any) => (
                            <div key={service.id} className="flex items-start p-4 border rounded-lg">
                              <div className="flex items-center mr-3 pt-1">
                                <Checkbox checked={selectedServices.has(service.id)} onCheckedChange={() => toggleServiceSelection(service.id)} />
                              </div>
                              <div className="mr-4">
                                <div className="bg-indigo-100 p-3 rounded-full">
                                  <Building2 className="h-5 w-5 text-indigo-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <div>
                                    <h4 className="font-medium">{service.type || 'Construction'}</h4>
                                    <Badge variant="outline" className={service.status === 'completed' ? 'border-green-500 text-green-700' : service.status === 'in_progress' ? 'border-blue-500 text-blue-700' : 'border-gray-500 text-gray-700'}>{service.status}</Badge>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="text-sm text-gray-500">{formatDate(service.date)}</span>
                                    <AlertDialog open={deleteTargetId === service.id} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600" onClick={() => setDeleteTargetId(service.id)}><Trash2 className="h-4 w-4" /></Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Delete work order?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { deleteWorkOrderMutation.mutate(service.id); setDeleteTargetId(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{service.notes}</p>
                                <div className="flex gap-2 mt-3">
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Supervisor:</span> {service.technician}
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setLocation(`/service-report/${service.id}`)}>View Project Details</Button>
                              </div>
                            </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Building2 className="h-12 w-12 mx-auto text-indigo-200 mb-2" />
                          <p className="text-gray-500">No construction/renovation history available</p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => setLocation('/projects')}
                          >
                            Discuss Renovation Options
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Payment Details</h3>
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500">Payment Method:</span>
                      <span>Credit Card ending in {client.paymentInfo?.lastFour || '1234'}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500">Billing Cycle:</span>
                      <span>{client.billingCycle || 'Monthly'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Auto-Pay:</span>
                      <span>{client.autoPay ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </div>
                  <Button variant="outline">Update Payment Method</Button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Recent Invoices</h3>
                  {client.invoices && client.invoices.length > 0 ? (
                    <div className="space-y-2">
                      {client.invoices.map((invoice, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">Invoice #{invoice.number}</p>
                            <p className="text-sm text-gray-500">{formatDate(invoice.date)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                            <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'pending' ? 'secondary' : 'outline'}>
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 border rounded-lg">
                      <p className="text-gray-500">No invoices available</p>
                    </div>
                  )}
                  <Button variant="outline">View All Invoices</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pool">
          <div id="pool-details-section" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Pool Details</h2>
              <Button 
                onClick={() => {
                  // Prepare existing data for the wizard
                  const poolData = {
                    poolType: client.poolType || '',
                    poolSize: client.poolSize || '',
                    filterType: client.filterType || '',
                    heaterType: client.heaterType || null,
                    chemicalSystem: client.chemicalSystem || '',
                    specialNotes: client.specialNotes || '',
                    serviceDay: client.serviceDay || '',
                    equipment: equipmentData || [],
                    images: imagesData || []
                  };
                  
                  // Save existing data to localStorage for the wizard to use
                  localStorage.setItem(`pool_wizard_${id}`, JSON.stringify(poolData));
                  
                  // Navigate to the pool wizard
                  setLocation(`/pool-wizard/${id}`);
                }}
                className="flex items-center"
              >
                <Settings className="h-4 w-4 mr-2" />
                Update Pool Information
              </Button>
            </div>
            
            {/* Pool Information Details Section */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DropletIcon className="h-5 w-5 mr-2 text-primary" />
                  Pool Specifications
                </CardTitle>
                <CardDescription>Technical details about the pool</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Pool Type:</span>
                      <span>{client.poolType || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Pool Size:</span>
                      <span>{client.poolSize || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Filter Type:</span>
                      <span>{client.filterType || 'Not specified'}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Heater Type:</span>
                      <span>{client.heaterType || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Chemical System:</span>
                      <span>{client.chemicalSystem || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Service Day:</span>
                      <span>{client.serviceDay || 'Not specified'}</span>
                    </div>
                  </div>
                </div>
                
                {client.specialNotes && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-2">Special Notes:</h4>
                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm">{client.specialNotes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Equipment Inventory Section */}
            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-primary" />
                    Equipment Inventory
                  </CardTitle>
                  <CardDescription>Pool equipment and components</CardDescription>
                </div>
                <Button
                  onClick={() => setLocation(`/pool-wizard/${id}`)}
                  size="sm"
                  className="ml-auto"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Equipment
                </Button>
              </CardHeader>
              <CardContent>
                {isEquipmentLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : equipmentData && equipmentData.length > 0 ? (
                  <div className="space-y-4">
                    {equipmentData.map((item, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{item.name}</h3>
                            <Badge variant="outline" className="mt-1">
                              {item.type}
                            </Badge>
                          </div>
                          <Badge 
                            className={
                              item.status === 'operational' ? 'bg-green-100 text-green-800' :
                              item.status === 'needs_service' ? 'bg-yellow-100 text-yellow-800' :
                              item.status === 'replaced' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {item.status === 'operational' ? 'Operational' :
                             item.status === 'needs_service' ? 'Needs Service' :
                             item.status === 'replaced' ? 'Replaced' :
                             item.status === 'obsolete' ? 'Obsolete' : 'Unknown Status'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                          <div>
                            <span className="text-xs text-gray-500">Brand</span>
                            <p className="text-sm">{item.brand || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Model</span>
                            <p className="text-sm">{item.model || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Serial Number</span>
                            <p className="text-sm">{item.serialNumber || 'N/A'}</p>
                          </div>
                        </div>
                        
                        {item.installDate && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">Install Date</span>
                            <p className="text-sm">{formatDate(new Date(item.installDate))}</p>
                          </div>
                        )}
                        
                        {item.notes && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">Notes</span>
                            <p className="text-sm">{item.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 mx-auto text-gray-200 mb-2" />
                    <p className="text-gray-500">No equipment recorded</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setLocation(`/pool-wizard/${id}`)}
                    >
                      Add Equipment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Pool Images Gallery Section */}
            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Camera className="h-5 w-5 mr-2 text-primary" />
                    Pool Images
                  </CardTitle>
                  <CardDescription>Photos of the pool and equipment</CardDescription>
                </div>
                <Button
                  onClick={() => setLocation(`/pool-wizard/${id}`)}
                  size="sm"
                  className="ml-auto"
                >
                  <ImagePlus className="h-4 w-4 mr-1" />
                  Add Images
                </Button>
              </CardHeader>
              <CardContent>
                {isImagesLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                  </div>
                ) : imagesData && imagesData.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {imagesData.map((image, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <div className="aspect-video relative">
                          <img
                            src={image.imageUrl}
                            alt={image.caption || `Pool image ${index + 1}`}
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                            <p className="text-sm truncate">
                              {image.caption || `Image ${index + 1}`}
                            </p>
                          </div>
                          <Badge 
                            className="absolute top-2 right-2 text-xs"
                            variant="secondary"
                          >
                            {image.category || 'pool'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Camera className="h-12 w-12 mx-auto text-gray-200 mb-2" />
                    <p className="text-gray-500">No images available</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setLocation(`/pool-wizard/${id}`)}
                    >
                      <ImagePlus className="h-4 w-4 mr-1" />
                      Add Images
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Contracts, reports, and other documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {client.documents && client.documents.length > 0 ? (
                  client.documents.map((doc: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center mb-3">
                        <div className="bg-blue-100 p-2 rounded-lg mr-3">
                          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{doc.name}</h4>
                          <p className="text-xs text-gray-500">{formatDate(doc.date)}</p>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Type: {doc.type}</span>
                        <span className="text-gray-500">{doc.size}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 col-span-3">
                    <p className="text-gray-500">No documents available</p>
                    <Button variant="outline" className="mt-4">Upload Document</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Recent Call History
                </CardTitle>
                <CardDescription>Voice calls with this client via Twilio</CardDescription>
              </CardHeader>
              <CardContent>
                <ClientCallHistory clientId={client.client.id} />
              </CardContent>
            </Card>
            <EntityEmailList
              entityType="client"
              entityId={client.client.id}
              entityName={client.user.name}
            />
            <EntitySMSList
              entityType="client"
              entityId={client.client.id}
              entityName={client.user.name}
              entityPhone={client.user.phone || undefined}
            />
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold">Client Invoices</h2>
                <p className="text-sm text-muted-foreground">
                  View and manage invoices for this client
                </p>
              </div>
              <Link href={`/invoices/new?clientId=${id}`}>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Invoice
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoiceSummary.totalBilled / 100)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {invoicesData?.length || 0} total invoices
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoiceSummary.totalPaid / 100)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {invoicesData?.filter((inv: any) => inv.status === 'paid').length || 0} paid invoices
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
                  <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoiceSummary.outstanding / 100)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {invoicesData?.filter((inv: any) => ['sent', 'viewed', 'partial', 'overdue'].includes(inv.status)).length || 0} pending invoices
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Invoice History</CardTitle>
                <CardDescription>All invoices for this client</CardDescription>
              </CardHeader>
              <CardContent>
                {isInvoicesLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : invoicesData && invoicesData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium text-sm">Invoice #</th>
                          <th className="text-left py-3 px-2 font-medium text-sm">Date</th>
                          <th className="text-left py-3 px-2 font-medium text-sm">Due Date</th>
                          <th className="text-right py-3 px-2 font-medium text-sm">Amount</th>
                          <th className="text-center py-3 px-2 font-medium text-sm">Status</th>
                          <th className="text-center py-3 px-2 font-medium text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoicesData.map((invoice: any) => {
                          const statusColors: Record<string, string> = {
                            draft: "bg-gray-100 text-gray-700",
                            sent: "bg-blue-100 text-blue-700",
                            viewed: "bg-purple-100 text-purple-700",
                            partial: "bg-yellow-100 text-yellow-700",
                            paid: "bg-green-100 text-green-700",
                            overdue: "bg-red-100 text-red-700",
                            cancelled: "bg-gray-100 text-gray-500 line-through"
                          };
                          
                          return (
                            <tr key={invoice.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-2 text-sm font-medium">{invoice.invoiceNumber}</td>
                              <td className="py-3 px-2 text-sm">
                                {new Date(invoice.issueDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </td>
                              <td className="py-3 px-2 text-sm">
                                {new Date(invoice.dueDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </td>
                              <td className="py-3 px-2 text-sm text-right font-medium">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((invoice.total || 0) / 100)}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <Badge className={statusColors[invoice.status] || statusColors.draft}>
                                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                </Badge>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <Link href={`/invoices/${invoice.id}`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No invoices yet</h3>
                    <p className="text-gray-500 mb-4">Create your first invoice for this client</p>
                    <Link href={`/invoices/new?clientId=${id}`}>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Invoice
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}