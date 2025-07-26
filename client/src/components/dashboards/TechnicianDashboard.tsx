import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MapPin, 
  Calendar, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Wrench,
  Navigation,
  Camera,
  Package,
  Users
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "../../contexts/AuthContext";

/**
 * Technician Dashboard Component
 * 
 * Field-focused dashboard for technicians with today's route,
 * task progress, and quick action tools.
 */
export const TechnicianDashboard: React.FC = () => {
  const { user } = useAuth();

  // Fetch technician-specific dashboard data
  const { data: technicianData, isLoading } = useQuery({
    queryKey: ['/api/technician/dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/technician/dashboard');
      if (!response.ok) throw new Error('Failed to fetch technician dashboard');
      return response.json();
    }
  });

  const { data: todaysRoute } = useQuery({
    queryKey: ['/api/technician/todays-route'],
    queryFn: async () => {
      const response = await fetch('/api/technician/todays-route');
      if (!response.ok) throw new Error('Failed to fetch today\'s route');
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

  const data = technicianData || {
    todaysTasks: 0,
    completedTasks: 0,
    urgentTasks: 0,
    routeProgress: 0,
    nextClient: null,
    estimatedCompletion: null
  };

  const route = todaysRoute || { stops: [], totalDistance: 0, estimatedTime: 0 };
  const progressPercent = data.todaysTasks > 0 ? (data.completedTasks / data.todaysTasks) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header with greeting */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Good Morning, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-600 mt-1">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex space-x-3">
          <Link href="/technician/routes/start">
            <Button>
              <Navigation className="h-4 w-4 mr-2" />
              Start Route
            </Button>
          </Link>
          <Link href="/repairs/new">
            <Button variant="outline">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report Issue
            </Button>
          </Link>
        </div>
      </div>

      {/* Today's Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Progress</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.completedTasks} / {data.todaysTasks}
            </div>
            <Progress value={progressPercent} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round(progressPercent)}% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{data.urgentTasks}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Completion</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.estimatedCompletion || '4:30 PM'}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on current progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Client Info */}
      {data.nextClient && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <MapPin className="h-5 w-5 mr-2" />
              Next Stop
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-blue-900">{data.nextClient.name}</h3>
                <p className="text-blue-700">{data.nextClient.address}</p>
                <p className="text-sm text-blue-600 mt-1">
                  Service Type: {data.nextClient.serviceType}
                </p>
                {data.nextClient.notes && (
                  <p className="text-sm text-blue-600 mt-1">
                    Notes: {data.nextClient.notes}
                  </p>
                )}
              </div>
              <div className="text-right">
                <Badge variant="outline" className="mb-2">
                  {data.nextClient.estimatedTime} min
                </Badge>
                <div className="space-x-2">
                  <Link href={`/clients/${data.nextClient.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                  <Button size="sm">
                    Navigate
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Route Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {route.stops?.length > 0 ? (
                route.stops.map((stop: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        stop.completed 
                          ? 'bg-green-100 text-green-800' 
                          : stop.current 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {stop.completed ? <CheckCircle className="h-4 w-4" /> : index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{stop.clientName}</p>
                        <p className="text-sm text-gray-600">{stop.address}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{stop.scheduledTime}</p>
                      <Badge variant={stop.serviceType === 'maintenance' ? 'default' : 'secondary'}>
                        {stop.serviceType}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No scheduled stops today</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Tools */}
        <Card>
          <CardHeader>
            <CardTitle>Field Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/maintenance/new">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <Wrench className="h-6 w-6 mb-2" />
                  <span className="text-sm">Log Maintenance</span>
                </Button>
              </Link>
              <Link href="/technician/photos">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <Camera className="h-6 w-6 mb-2" />
                  <span className="text-sm">Take Photos</span>
                </Button>
              </Link>
              <Link href="/inventory/update">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <Package className="h-6 w-6 mb-2" />
                  <span className="text-sm">Update Inventory</span>
                </Button>
              </Link>
              <Link href="/clients">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <Users className="h-6 w-6 mb-2" />
                  <span className="text-sm">Client Info</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Completed maintenance at Johnson Pool</p>
                <p className="text-sm text-gray-600">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-2">
              <Camera className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">Uploaded before/after photos</p>
                <p className="text-sm text-gray-600">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium">Reported equipment issue at Smith Pool</p>
                <p className="text-sm text-gray-600">Yesterday</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicianDashboard;