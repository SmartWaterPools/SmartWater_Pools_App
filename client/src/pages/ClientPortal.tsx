
import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Activity, Clipboard, FileText, DropletIcon, ThermometerIcon, BeakerIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate, ClientWithUser } from '@/lib/types';

// Create an extended type for the client portal that includes all the properties used
interface ExtendedClientPortalData extends ClientWithUser {
  address?: string;
  lastServiceDate?: string | Date;
  poolType?: string;
  poolSize?: string;
  filterType?: string;
  chlorineLevel?: number;
  phLevel?: number;
  alkalinity?: number;
  lastWaterTest?: string | Date;
  upcomingService?: {
    date: string | Date;
    time: string;
    technician: string;
    type?: string;
  };
  maintenanceHistory?: Array<any>;
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
            {/* Pool Status Card */}
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <DropletIcon className="mr-2 h-5 w-5 text-blue-500" />
                  Pool Status
                </CardTitle>
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
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Service History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {([1, 2, 3].length > 0) ? (
                  [1, 2, 3].map((_, index) => (
                    <div key={index} className="flex p-4 border rounded-lg">
                      <div className="mr-4">
                        <div className="bg-gray-100 w-12 h-12 rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6 text-gray-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h4 className="font-medium">Regular Maintenance</h4>
                          <span className="text-sm text-gray-500">{index === 0 ? '2 weeks ago' : index === 1 ? '1 month ago' : '2 months ago'}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {index === 0 ? 'Regular pool cleaning and chemical balancing.' : 
                           index === 1 ? 'Filter cleaning and equipment inspection.' : 
                           'Deep cleaning and algae treatment.'}
                        </p>
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            Technician: {index === 0 ? 'Mike Johnson' : index === 1 ? 'Sarah Williams' : 'David Miller'}
                          </span>
                          <Button variant="ghost" size="sm" className="h-8">View Report</Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-500">No service history available</p>
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
