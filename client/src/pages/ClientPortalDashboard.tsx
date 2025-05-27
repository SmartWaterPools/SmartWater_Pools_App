import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { ClientPortalLayout } from '../components/layout/ClientPortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Clock, 
  Clipboard, 
  Activity, 
  DropletIcon, 
  BeakerIcon, 
  FileText,
  LifeBuoy,
  AlertTriangle
} from 'lucide-react';
import { PermissionGate } from '../components/PermissionGate';
import { Link } from 'wouter';

/**
 * Client Portal Dashboard component
 * This is the main view for client users who log in to check their pool status
 */
export default function ClientPortalDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Get client data for the logged-in user
  const { data: client, isLoading, error } = useQuery({
    queryKey: ['/api/client-portal/dashboard'],
    enabled: !!user?.id,
  });
  
  if (isLoading) {
    return (
      <ClientPortalLayout>
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-10 w-20" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </ClientPortalLayout>
    );
  }
  
  if (error) {
    return (
      <ClientPortalLayout>
        <div className="flex flex-col items-center justify-center space-y-4 p-8">
          <AlertTriangle className="h-12 w-12 text-yellow-500" />
          <h2 className="text-xl font-bold">Unable to load your pool information</h2>
          <p className="text-gray-500">There was an error accessing your pool data. Please try again later.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </ClientPortalLayout>
    );
  }
  
  // If we can't find client data, show an empty state with options to contact support
  if (!client) {
    return (
      <ClientPortalLayout>
        <div className="flex flex-col items-center justify-center space-y-4 p-8">
          <DropletIcon className="h-12 w-12 text-blue-500" />
          <h2 className="text-xl font-bold">Welcome to Smart Water Pools</h2>
          <p className="text-gray-500 text-center max-w-md">
            We're still setting up your pool profile. Please check back soon or contact our team if you need immediate assistance.
          </p>
          <div className="flex space-x-4">
            <Button variant="outline">Contact Support</Button>
            <Button>Request Service</Button>
          </div>
        </div>
      </ClientPortalLayout>
    );
  }
  
  // Mock data for display purposes
  // In a real application, this would come from the API response
  const mockClient = {
    id: user?.id || 1,
    address: '123 Pool Ave, Poolside, FL 33710',
    poolType: 'In-ground',
    poolSize: '15,000 gallons',
    filterType: 'Sand',
    chlorineLevel: 2.5,
    phLevel: 7.4,
    alkalinity: 120,
    lastServiceDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    lastWaterTest: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    upcomingService: {
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      time: '10:00 AM',
      technician: 'John Smith',
      type: 'Regular Maintenance'
    },
    serviceHistory: [
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        type: 'Regular Maintenance',
        category: 'maintenance',
        notes: 'Cleaned filters, balanced chemicals, skimmed debris.',
        technician: 'John Smith'
      },
      {
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        type: 'Regular Maintenance',
        category: 'maintenance',
        notes: 'Cleaned filters, balanced chemicals, skimmed debris.',
        technician: 'Jane Doe'
      }
    ]
  };
  
  // Use either the real client data or our mock data
  const clientData = client || mockClient;
  
  // Format date with helper function
  const formatDate = (date: Date | string) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <ClientPortalLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold">My Pool Dashboard</h1>
            <p className="text-gray-500">{clientData.address}</p>
          </div>
          
          <PermissionGate resource="repairs" action="create">
            <Link href="/client-portal/service-requests/new">
              <Button className="mt-2 md:mt-0">Request Service</Button>
            </Link>
          </PermissionGate>
        </div>
        
        <Tabs defaultValue="overview" className="space-y-6" onValueChange={setActiveTab}>
          <TabsList className="bg-white border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="maintenance">Service History</TabsTrigger>
            <TabsTrigger value="waterQuality">Water Quality</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pool Status Card */}
              <Card className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <DropletIcon className="mr-2 h-5 w-5 text-blue-500" />
                    Pool Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Last Service:</span>
                      <span className="font-medium">{formatDate(clientData.lastServiceDate)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Pool Type:</span>
                      <span className="font-medium">{clientData.poolType}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Size:</span>
                      <span className="font-medium">{clientData.poolSize}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Filter Type:</span>
                      <span className="font-medium">{clientData.filterType}</span>
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
                      <Badge variant={clientData.chlorineLevel > 1 ? "default" : "destructive"}>
                        {clientData.chlorineLevel} ppm
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">pH Level:</span>
                      <Badge variant={clientData.phLevel > 7.2 && clientData.phLevel < 7.8 ? "default" : "secondary"}>
                        {clientData.phLevel}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Alkalinity:</span>
                      <Badge variant="outline">
                        {clientData.alkalinity} ppm
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Last Tested:</span>
                      <span className="text-sm">{formatDate(clientData.lastWaterTest)}</span>
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
                  {clientData.upcomingService ? (
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{formatDate(clientData.upcomingService.date)}</span>
                      </div>
                      <div className="flex items-center">
                        <Activity className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{clientData.upcomingService.type}</span>
                      </div>
                      <PermissionGate resource="maintenance" action="edit">
                        <div className="mt-4">
                          <Link href="/client-portal/schedule">
                            <Button className="w-full" variant="outline">View Schedule</Button>
                          </Link>
                        </div>
                      </PermissionGate>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-500 mb-4">No upcoming service scheduled</p>
                      <Button variant="outline">Contact Us</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="maintenance">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Service History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientData.serviceHistory && clientData.serviceHistory.length > 0 ? (
                    clientData.serviceHistory.map((record, index) => (
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
                      <p className="text-gray-500">No service records available</p>
                    </div>
                  )}
                  
                  <PermissionGate resource="reports" action="view">
                    <div className="text-center mt-6">
                      <Link href="/client-portal/reports">
                        <Button variant="outline">View All Reports</Button>
                      </Link>
                    </div>
                  </PermissionGate>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="waterQuality">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Water Quality History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border rounded-lg bg-gray-50">
                  <p className="text-gray-500">Water quality history will be available soon</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-sm text-gray-500">pH</p>
                    <h3 className="text-xl font-bold">{clientData.phLevel}</h3>
                    <p className="text-xs text-green-600">Optimal</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-sm text-gray-500">Chlorine</p>
                    <h3 className="text-xl font-bold">{clientData.chlorineLevel}</h3>
                    <p className="text-xs text-green-600">Good</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <p className="text-sm text-gray-500">Alkalinity</p>
                    <h3 className="text-xl font-bold">{clientData.alkalinity}</h3>
                    <p className="text-xs text-green-600">Optimal</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Quick Actions */}
        <div className="mt-6">
          <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <PermissionGate resource="repairs" action="create">
              <Link href="/client-portal/service-requests/new">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                  <LifeBuoy className="h-6 w-6 mb-1" />
                  <span>Request Service</span>
                </Button>
              </Link>
            </PermissionGate>
            
            <PermissionGate resource="reports" action="view">
              <Link href="/client-portal/reports">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                  <FileText className="h-6 w-6 mb-1" />
                  <span>View Reports</span>
                </Button>
              </Link>
            </PermissionGate>
            
            <PermissionGate resource="invoices" action="view">
              <Link href="/client-portal/invoices">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                  <FileText className="h-6 w-6 mb-1" />
                  <span>View Invoices</span>
                </Button>
              </Link>
            </PermissionGate>
            
            <PermissionGate resource="communications" action="create">
              <Link href="/client-portal/messages">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                  <LifeBuoy className="h-6 w-6 mb-1" />
                  <span>Contact Us</span>
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>
      </div>
    </ClientPortalLayout>
  );
}