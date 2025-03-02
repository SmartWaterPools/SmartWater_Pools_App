import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Activity, Clipboard, FileText, DropletIcon, ThermometerIcon, BeakerIcon, Settings, Building2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate, ClientWithUser } from '@/lib/types';

// Create an extended type for the client portal that includes all the properties used
interface ExtendedClientPortalData extends Omit<ClientWithUser, 'poolType' | 'poolSize' | 'filterType' | 'heaterType' | 'chemicalSystem'> {
  address?: string;
  lastServiceDate?: string | Date;
  poolType?: string | null;
  poolSize?: string | null;
  filterType?: string | null;
  heaterType?: string | null;
  chemicalSystem?: string | null;
  chlorineLevel?: number;
  phLevel?: number;
  alkalinity?: number;
  lastWaterTest?: string | Date;
  specialNotes?: string | null;
  upcomingService?: {
    date: string | Date;
    time: string;
    technician: string;
    type?: string;
  };
  maintenanceHistory?: Array<any>;
  serviceHistory?: Array<{
    id?: number;
    date: string | Date;
    type: string;
    category: 'maintenance' | 'repair' | 'construction';
    notes: string;
    technician: string;
    cost?: number;
    waterChemistry?: {
      ph?: number;
      chlorine?: number;
      alkalinity?: number;
    };
  }>;
  equipment?: Array<{
    id?: number;
    name: string;
    type: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    installDate?: string | Date;
    lastServiceDate?: string | Date;
    status?: string;
    notes?: string;
  }>;
  images?: Array<{
    id?: number;
    imageUrl: string;
    caption?: string;
    category?: string;
    uploadDate?: string | Date;
  }>;
}

export default function ClientPortal() {
  const { id } = useParams();
  const [_, setLocation] = useLocation();
  const [client, setClient] = useState<ExtendedClientPortalData | null>(null);
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
          <h1 className="text-2xl font-bold">{client.user.name}'s Pool Management</h1>
          <p className="text-gray-500">{client.address}</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button variant="outline" onClick={() => setLocation(`/clients/${id}/edit`)}>
            Edit Client
          </Button>
          <Button>Schedule Service</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList className="bg-white border">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="waterQuality">Water Quality</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="history">Service History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pool Information Card */}
            <Card className="bg-white">
              <CardHeader className="pb-2 flex justify-between items-center">
                <CardTitle className="flex items-center text-lg">
                  <DropletIcon className="mr-2 h-5 w-5 text-blue-500" />
                  Pool Information
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-primary hover:text-primary/80"
                  onClick={() => {
                    setActiveTab('equipment');
                    // Use setTimeout to ensure tab content is rendered before scrolling
                    setTimeout(() => {
                      const equipmentTab = document.querySelector('[value="equipment"]');
                      if (equipmentTab) {
                        equipmentTab.scrollIntoView({ behavior: 'smooth' });
                      }
                    }, 100);
                  }}
                >
                  View Details
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Last Service:</span>
                    <span className="font-medium">{client.lastServiceDate ? formatDate(client.lastServiceDate) : 'Never'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Pool Type:</span>
                    <span className="font-medium">{client.poolType || 'In-ground'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Size:</span>
                    <span className="font-medium">{client.poolSize || '15,000 gallons'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Filter Type:</span>
                    <span className="font-medium">{client.filterType || 'Sand'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Water Quality Card */}
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <BeakerIcon className="mr-2 h-5 w-5 text-green-500" />
                  Water Chemistry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Chlorine:</span>
                    <Badge variant={client.chlorineLevel && client.chlorineLevel > 1 ? "default" : "destructive"}>
                      {client.chlorineLevel || '2.5'} ppm
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">pH Level:</span>
                    <Badge variant={client.phLevel && client.phLevel > 7.2 && client.phLevel < 7.8 ? "default" : "secondary"}>
                      {client.phLevel || '7.4'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Alkalinity:</span>
                    <Badge variant="outline">
                      {client.alkalinity || '120'} ppm
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Last Tested:</span>
                    <span className="text-sm">{client.lastWaterTest ? formatDate(client.lastWaterTest) : '3 days ago'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Service Card */}
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <Calendar className="mr-2 h-5 w-5 text-indigo-500" />
                  Upcoming Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                {client.upcomingService ? (
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{formatDate(client.upcomingService.date)}</span>
                    </div>
                    <div className="flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{client.upcomingService.type || 'Regular Maintenance'}</span>
                    </div>
                    <div className="mt-4">
                      <Button className="w-full">Reschedule</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-500 mb-4">No upcoming service scheduled</p>
                    <Button variant="outline">Schedule Service</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Maintenance History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {client.maintenanceHistory && client.maintenanceHistory.length > 0 ? (
                  client.maintenanceHistory.map((record: any, index: number) => (
                    <div key={index} className="flex items-start p-3 border rounded-lg">
                      <div className="bg-blue-100 p-2 rounded-full mr-3">
                        <Clipboard className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h4 className="font-medium">{record.type}</h4>
                          <span className="text-sm text-gray-500">{formatDate(record.date)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{record.notes}</p>
                        <div className="flex items-center mt-2">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            Performed by: {record.technician}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-500">No maintenance records available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waterQuality">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Water Chemistry Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border rounded-lg bg-gray-50">
                  <p className="text-gray-500">Water chemistry graph will appear here</p>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-sm text-gray-500">pH</p>
                    <h3 className="text-xl font-bold">{client.phLevel || '7.4'}</h3>
                    <p className="text-xs text-green-600">Optimal</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-sm text-gray-500">Chlorine</p>
                    <h3 className="text-xl font-bold">{client.chlorineLevel || '2.5'}</h3>
                    <p className="text-xs text-green-600">Good</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-sm text-gray-500">Alkalinity</p>
                    <h3 className="text-xl font-bold">{client.alkalinity || '120'}</h3>
                    <p className="text-xs text-green-600">Optimal</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Treatment Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 border rounded-lg bg-blue-50">
                    <h4 className="font-medium text-blue-700">Weekly Shock Treatment</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Add 1lb of shock treatment to maintain proper sanitization levels.
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Alkalinity Adjustment</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      No adjustment needed. Current levels are within optimal range.
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">pH Balance</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      No adjustment needed. Current pH is ideal.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="equipment">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Pool Equipment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between">
                      <h4 className="font-medium">Pool Pump</h4>
                      <Badge variant="outline">Working</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Hayward Super Pump 1.5 HP</p>
                    <p className="text-sm text-gray-500">Installed: Jan 2022</p>
                    <p className="text-sm text-gray-500">Last Service: 2 months ago</p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between">
                      <h4 className="font-medium">Filter System</h4>
                      <Badge variant="outline">Working</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Pentair Sand Filter</p>
                    <p className="text-sm text-gray-500">Installed: Jan 2022</p>
                    <p className="text-sm text-gray-500">Last Backwash: 2 weeks ago</p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between">
                      <h4 className="font-medium">Heater</h4>
                      <Badge variant="secondary">Maintenance Needed</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Pentair MasterTemp 400</p>
                    <p className="text-sm text-gray-500">Installed: Jan 2022</p>
                    <p className="text-sm text-gray-500 text-amber-600">Issue: Ignition failure</p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between">
                      <h4 className="font-medium">Salt Chlorinator</h4>
                      <Badge variant="outline">Working</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Hayward AquaRite</p>
                    <p className="text-sm text-gray-500">Installed: Jan 2022</p>
                    <p className="text-sm text-gray-500">Salt Level: Optimal</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Button variant="outline">Request Equipment Service</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
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
                                {service.category === 'repair' ? (
                                  <Settings className={`h-5 w-5 text-amber-600`} />
                                ) : service.category === 'construction' ? (
                                  <Building2 className={`h-5 w-5 text-indigo-600`} />
                                ) : (
                                  <DropletIcon className={`h-5 w-5 text-blue-600`} />
                                )}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:justify-between">
                                <div>
                                  <h4 className="font-medium">{service.type}</h4>
                                  <Badge className="mt-1" variant={
                                    service.category === 'repair' ? 'destructive' : 
                                    service.category === 'construction' ? 'secondary' : 
                                    'default'
                                  }>
                                    {service.category}
                                  </Badge>
                                </div>
                                <span className="text-sm text-gray-500 mt-1 sm:mt-0">{formatDate(service.date)}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-2">{service.notes}</p>
                              <div className="flex items-center mt-2">
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                  Performed by: {service.technician}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-gray-500">No service records available</p>
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
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {client.serviceHistory && client.serviceHistory.filter(s => s.category === 'maintenance').length > 0 ? (
                        client.serviceHistory
                          .filter(s => s.category === 'maintenance')
                          .map((service, index) => (
                            <div key={index} className="flex items-start p-4 border rounded-lg">
                              <div className="mr-4">
                                <div className="bg-blue-100 p-3 rounded-full">
                                  <DropletIcon className="h-5 w-5 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:justify-between">
                                  <h4 className="font-medium">{service.type || 'Regular Maintenance'}</h4>
                                  <span className="text-sm text-gray-500 mt-1 sm:mt-0">{formatDate(service.date)}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{service.notes}</p>
                                {service.waterChemistry && (
                                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                                    <div className="text-xs bg-gray-100 p-2 rounded-md">
                                      <span className="text-gray-500">pH:</span> {service.waterChemistry.ph || 'N/A'}
                                    </div>
                                    <div className="text-xs bg-gray-100 p-2 rounded-md">
                                      <span className="text-gray-500">Chlorine:</span> {service.waterChemistry.chlorine || 'N/A'} ppm
                                    </div>
                                    <div className="text-xs bg-gray-100 p-2 rounded-md">
                                      <span className="text-gray-500">Alkalinity:</span> {service.waterChemistry.alkalinity || 'N/A'} ppm
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center mt-2">
                                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                    Performed by: {service.technician}
                                  </span>
                                </div>
                              </div>
                            </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No maintenance history available</p>
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
                                <div className="flex flex-col sm:flex-row sm:justify-between">
                                  <h4 className="font-medium">{service.type || 'Equipment Repair'}</h4>
                                  <span className="text-sm text-gray-500 mt-1 sm:mt-0">{formatDate(service.date)}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{service.notes}</p>
                                <div className="flex flex-col xs:flex-row gap-2 mt-3">
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Cost:</span> ${service.cost?.toFixed(2) || '0.00'}
                                  </div>
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Technician:</span> {service.technician}
                                  </div>
                                </div>
                              </div>
                            </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No repair history available</p>
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
                                <div className="flex flex-col sm:flex-row sm:justify-between">
                                  <h4 className="font-medium">{service.type || 'Construction'}</h4>
                                  <span className="text-sm text-gray-500 mt-1 sm:mt-0">{formatDate(service.date)}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{service.notes}</p>
                                <div className="flex flex-col xs:flex-row gap-2 mt-3">
                                  <div className="text-xs bg-gray-100 p-2 rounded-md">
                                    <span className="text-gray-500">Project Value:</span> ${service.cost?.toFixed(2) || '0.00'}
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
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}