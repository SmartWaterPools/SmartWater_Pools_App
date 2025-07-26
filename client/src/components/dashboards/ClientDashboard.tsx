import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Droplets, 
  Calendar, 
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Camera,
  MessageSquare,
  FileText,
  Home
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "../../contexts/AuthContext";

/**
 * Client Dashboard Component
 * 
 * Customer-focused dashboard showing pool service status,
 * upcoming maintenance, service history, and billing information.
 */
export const ClientDashboard: React.FC = () => {
  const { user } = useAuth();

  // Fetch client-specific dashboard data
  const { data: clientData, isLoading } = useQuery({
    queryKey: ['/api/client/dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/client/dashboard');
      if (!response.ok) throw new Error('Failed to fetch client dashboard');
      return response.json();
    }
  });

  const { data: serviceHistory } = useQuery({
    queryKey: ['/api/client/recent-services'],
    queryFn: async () => {
      const response = await fetch('/api/client/recent-services');
      if (!response.ok) throw new Error('Failed to fetch service history');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const data = clientData || {
    nextService: null,
    lastService: null,
    waterQuality: { ph: 7.2, chlorine: 2.5, status: 'Good' },
    pendingRequests: 0,
    unreadMessages: 0,
    outstandingBalance: 0,
    poolHealth: 85
  };

  const history = serviceHistory || [];
  const nextServiceDate = data.nextService ? new Date(data.nextService.scheduledDate) : null;
  const daysUntilService = nextServiceDate ? Math.ceil((nextServiceDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your pool service
          </p>
        </div>
        <div className="flex space-x-3">
          <Link href="/client/requests/new">
            <Button>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Request Service
            </Button>
          </Link>
          <Link href="/client/messages/new">
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Team
            </Button>
          </Link>
        </div>
      </div>

      {/* Service Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pool Health Score</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.poolHealth}%</div>
            <Progress value={data.poolHealth} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Excellent condition
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Service</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {daysUntilService !== null ? (
                daysUntilService === 0 ? 'Today' :
                daysUntilService === 1 ? 'Tomorrow' :
                `${daysUntilService} days`
              ) : 'Not scheduled'}
            </div>
            <p className="text-xs text-muted-foreground">
              {nextServiceDate ? nextServiceDate.toLocaleDateString() : 'Contact us to schedule'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.outstandingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              ${Math.abs(data.outstandingBalance).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.outstandingBalance > 0 ? 'Amount due' : 'Account current'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      {(data.pendingRequests > 0 || data.unreadMessages > 0 || data.outstandingBalance > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.pendingRequests > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-800">
                  <Clock className="h-5 w-5 mr-2" />
                  Pending Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-orange-700 mb-3">
                  You have {data.pendingRequests} service request{data.pendingRequests !== 1 ? 's' : ''} in progress
                </p>
                <Link href="/client/requests">
                  <Button variant="outline" size="sm">
                    View Requests
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {data.unreadMessages > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-800">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  New Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-700 mb-3">
                  {data.unreadMessages} new message{data.unreadMessages !== 1 ? 's' : ''} from your service team
                </p>
                <Link href="/client/messages">
                  <Button variant="outline" size="sm">
                    Read Messages
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {data.outstandingBalance > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center text-red-800">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Payment Due
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700 mb-3">
                  Outstanding balance: ${data.outstandingBalance.toFixed(2)}
                </p>
                <Link href="/client/billing">
                  <Button variant="outline" size="sm">
                    Pay Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Water Quality Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Droplets className="h-5 w-5 mr-2" />
            Current Water Quality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800">pH Level</h3>
              <p className="text-2xl font-bold text-blue-600">{data.waterQuality.ph}</p>
              <p className="text-sm text-blue-700">Optimal: 7.2-7.6</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-800">Chlorine</h3>
              <p className="text-2xl font-bold text-green-600">{data.waterQuality.chlorine} ppm</p>
              <p className="text-sm text-green-700">Optimal: 1.0-3.0 ppm</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800">Overall Status</h3>
              <Badge 
                variant={data.waterQuality.status === 'Good' ? 'default' : 'destructive'}
                className="text-lg px-4 py-1"
              >
                {data.waterQuality.status}
              </Badge>
              <p className="text-sm text-gray-700 mt-1">
                Last tested: {data.lastService ? new Date(data.lastService.date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Service History & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Recent Service History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.length > 0 ? (
                history.slice(0, 5).map((service: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{service.type}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(service.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{service.technician}</Badge>
                      {service.photos && (
                        <p className="text-xs text-gray-500 mt-1">
                          {service.photos} photos
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No service history available</p>
              )}
            </div>
            <div className="mt-4">
              <Link href="/client/history">
                <Button variant="outline" className="w-full">
                  View Full History
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/client/schedule">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <Calendar className="h-6 w-6 mb-2" />
                  <span className="text-sm">View Schedule</span>
                </Button>
              </Link>
              <Link href="/client/photos">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <Camera className="h-6 w-6 mb-2" />
                  <span className="text-sm">Service Photos</span>
                </Button>
              </Link>
              <Link href="/client/billing">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <DollarSign className="h-6 w-6 mb-2" />
                  <span className="text-sm">Pay Invoice</span>
                </Button>
              </Link>
              <Link href="/client/settings">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <Home className="h-6 w-6 mb-2" />
                  <span className="text-sm">Pool Settings</span>
                </Button>
              </Link>
            </div>
            
            {/* Emergency Contact */}
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-2">Need Emergency Service?</h4>
              <p className="text-sm text-red-700 mb-3">
                For urgent pool issues outside business hours
              </p>
              <Button variant="destructive" size="sm" className="w-full">
                Call Emergency Line: (555) 123-4567
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;