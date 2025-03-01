import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Mail, Calendar, Clock, AlertCircle, CheckCircle2, User, Droplet as DropletIcon, Settings, BarChart, Building2, Camera } from 'lucide-react';
import { formatDate, formatCurrency, ClientWithUser } from '@/lib/types';

// We need to extend the ClientWithUser type to include the additional properties
// that are used in this component but are not part of the original type
interface ExtendedClientData extends Omit<ClientWithUser, 'poolType' | 'poolSize' | 'filterType' | 'chemicalSystem'> {
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
  serviceDay?: string | null;
  specialNotes?: string | null;
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
  equipment?: Array<any>;
  images?: Array<any>;
}

export default function ClientDetails() {
  const { id } = useParams();
  const [_, setLocation] = useLocation();
  const [client, setClient] = useState<ExtendedClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!id) return;

    fetch(`/api/clients/${id}`)
      .then(res => res.json())
      .then(data => {
        setClient(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching client:", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
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
            onClick={() => setLocation(`/clients/${id}/pool-wizard`)}
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
                      <p>{client.address}</p>
                      <p>{client.city}, {client.state} {client.zipCode}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-gray-500" />
                    <p>{client.phone}</p>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 mr-2 text-gray-500" />
                    <p>{client.user.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Pool Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pool Type:</span>
                    <span>{client.poolType || 'In-ground'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Size:</span>
                    <span>{client.poolSize || '15,000 gallons'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Filter Type:</span>
                    <span>{client.filterType || 'Sand'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Chemical System:</span>
                    <span>{client.chemicalSystem || 'Salt Water'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Features:</span>
                    <span>{client.poolFeatures || 'Spa, Waterfall'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Service Contract</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Contract Type:</span>
                    <Badge variant="outline">
                      {client.contractType || 'Weekly Service'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service Day:</span>
                    <span>{client.serviceDay || 'Tuesday'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Monthly Rate:</span>
                    <span className="font-medium">{formatCurrency(client.monthlyRate || 199)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Start Date:</span>
                    <span>{client.contractStartDate ? formatDate(client.contractStartDate) : '01/01/2023'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Renewal Date:</span>
                    <span>{client.contractRenewalDate ? formatDate(client.contractRenewalDate) : '01/01/2024'}</span>
                  </div>
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
                {client.upcomingServices && client.upcomingServices.length > 0 ? (
                  <div className="space-y-4">
                    {client.upcomingServices.map((service, index) => (
                      <div key={index} className="flex items-start p-3 border rounded-lg">
                        <div className="bg-blue-100 p-2 rounded-full mr-3">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex justify-between">
                            <h4 className="font-medium">{service.type}</h4>
                            <span className="text-sm text-gray-500">{formatDate(service.date)}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{service.time}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <User className="h-3 w-3 mr-1" />
                            <span>{service.technician}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <DropletIcon className="h-12 w-12 mx-auto text-blue-200 mb-2" />
                    <p className="text-gray-500">No upcoming services scheduled</p>
                    <Button variant="outline" className="mt-4">Schedule Service</Button>
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
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-200 mb-2" />
                    <p className="text-gray-500">No recent issues reported</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services">
          <div className="space-y-6">
            {/* Sub-tabs for different service types */}
            <Tabs defaultValue="all">
              <div className="flex justify-center w-full overflow-x-auto pb-2">
                <TabsList className="justify-center min-w-max">
                  <TabsTrigger value="all">All Services</TabsTrigger>
                  <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                  <TabsTrigger value="repair">Repairs</TabsTrigger>
                  <TabsTrigger value="construction">Construction</TabsTrigger>
                </TabsList>
              </div>

              {/* All Services Tab */}
              <TabsContent value="all">
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle>Service History</CardTitle>
                    <CardDescription>All service visits for this client</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {client.serviceHistory && client.serviceHistory.length > 0 ? (
                        client.serviceHistory.map((service, index) => (
                          <div key={index} className="flex items-start p-4 border rounded-lg">
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
                                  <Badge className="mt-1" variant={
                                    service.category === 'repair' ? 'destructive' : 
                                    service.category === 'construction' ? 'secondary' : 
                                    'default'
                                  }>
                                    {service.category || 'Maintenance'}
                                  </Badge>
                                </div>
                                <span className="text-sm text-gray-500">{formatDate(service.date)}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-2">{service.notes}</p>
                              {service.category === 'maintenance' && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">pH:</span> {service.waterChemistry?.ph || 'N/A'}
                                  </div>
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Chlorine:</span> {service.waterChemistry?.chlorine || 'N/A'} ppm
                                  </div>
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Alkalinity:</span> {service.waterChemistry?.alkalinity || 'N/A'} ppm
                                  </div>
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Technician:</span> {service.technician}
                                  </div>
                                </div>
                              )}
                              <Button variant="ghost" size="sm" className="mt-2">View Full Report</Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No service history available</p>
                          <Button variant="outline" className="mt-4">Schedule Service</Button>
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
                      {client.serviceHistory && client.serviceHistory.filter(s => s.category === 'maintenance' || !s.category).length > 0 ? (
                        client.serviceHistory
                          .filter(s => s.category === 'maintenance' || !s.category)
                          .map((service, index) => (
                            <div key={index} className="flex items-start p-4 border rounded-lg">
                              <div className="mr-4">
                                <div className="bg-blue-100 p-3 rounded-full">
                                  <DropletIcon className="h-5 w-5 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <h4 className="font-medium">{service.type || 'Regular Maintenance'}</h4>
                                  <span className="text-sm text-gray-500">{formatDate(service.date)}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{service.notes}</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">pH:</span> {service.waterChemistry?.ph || 'N/A'}
                                  </div>
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Chlorine:</span> {service.waterChemistry?.chlorine || 'N/A'} ppm
                                  </div>
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Alkalinity:</span> {service.waterChemistry?.alkalinity || 'N/A'} ppm
                                  </div>
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Technician:</span> {service.technician}
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" className="mt-2">View Full Report</Button>
                              </div>
                            </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No maintenance history available</p>
                          <Button variant="outline" className="mt-4">Schedule Maintenance</Button>
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
                      {client.serviceHistory && client.serviceHistory.filter(s => s.category === 'repair').length > 0 ? (
                        client.serviceHistory
                          .filter(s => s.category === 'repair')
                          .map((service, index) => (
                            <div key={index} className="flex items-start p-4 border rounded-lg">
                              <div className="mr-4">
                                <div className="bg-amber-100 p-3 rounded-full">
                                  <Settings className="h-5 w-5 text-amber-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <h4 className="font-medium">{service.type || 'Equipment Repair'}</h4>
                                  <span className="text-sm text-gray-500">{formatDate(service.date)}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{service.notes}</p>
                                <div className="flex flex-col xs:flex-row gap-2 mt-3">
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Cost:</span> {formatCurrency(service.cost || 0)}
                                  </div>
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Technician:</span> {service.technician}
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" className="mt-2">View Full Report</Button>
                              </div>
                            </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No repair history available</p>
                          <Button variant="outline" className="mt-4">Request Repair</Button>
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
                      {client.serviceHistory && client.serviceHistory.filter(s => s.category === 'construction').length > 0 ? (
                        client.serviceHistory
                          .filter(s => s.category === 'construction')
                          .map((service, index) => (
                            <div key={index} className="flex items-start p-4 border rounded-lg">
                              <div className="mr-4">
                                <div className="bg-indigo-100 p-3 rounded-full">
                                  <Building2 className="h-5 w-5 text-indigo-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <h4 className="font-medium">{service.type || 'Construction'}</h4>
                                  <span className="text-sm text-gray-500">{formatDate(service.date)}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{service.notes}</p>
                                <div className="flex flex-col xs:flex-row gap-2 mt-3">
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Project Value:</span> {formatCurrency(service.cost || 0)}
                                  </div>
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Supervisor:</span> {service.technician}
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" className="mt-2">View Project Details</Button>
                              </div>
                            </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No construction/renovation history available</p>
                          <Button variant="outline" className="mt-4">Discuss Renovation Options</Button>
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
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Pool Details</h2>
              <Button 
                onClick={() => setLocation(`/clients/${id}/pool-wizard`)}
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
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-primary" />
                  Equipment Inventory
                </CardTitle>
                <CardDescription>Pool equipment and components</CardDescription>
              </CardHeader>
              <CardContent>
                {client.equipment && client.equipment.length > 0 ? (
                  <div className="space-y-4">
                    {client.equipment.map((item, index) => (
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
                            <p className="text-sm">{formatDate(item.installDate)}</p>
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
                      onClick={() => setLocation(`/clients/${id}/pool-wizard`)}
                    >
                      Add Equipment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Pool Images Gallery Section */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="h-5 w-5 mr-2 text-primary" />
                  Pool Images
                </CardTitle>
                <CardDescription>Photos of the pool and equipment</CardDescription>
              </CardHeader>
              <CardContent>
                {client.images && client.images.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {client.images.map((image, index) => (
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
                      onClick={() => setLocation(`/clients/${id}/pool-wizard`)}
                    >
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
                  client.documents.map((doc, index) => (
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
      </Tabs>
    </div>
  );
}