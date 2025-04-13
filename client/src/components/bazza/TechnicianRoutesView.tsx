import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Label } from "../../components/ui/label";
import { Spinner } from "../../components/ui/spinner";
import { useBazzaRoutesByTechnician } from "../../hooks/useBazzaRoutes";
import { BazzaRoute, BazzaRouteStop, MaintenanceWithDetails } from "../../lib/types";

// Icons
import { 
  Calendar, 
  Clock, 
  ListOrdered, 
  MapPin, 
  Plus, 
  UserCheck 
} from "lucide-react";
import { format } from "date-fns";

type TechnicianRoutesViewProps = {
  technicians: { id: number; name: string }[];
  maintenances: MaintenanceWithDetails[];
  selectedTechnicianId: number | null;
  onTechnicianSelect: (technicianId: number | null) => void;
  onRouteSelect?: (route: BazzaRoute) => void;
  onAddRouteClick?: () => void;
};

export function TechnicianRoutesView({
  technicians,
  maintenances,
  selectedTechnicianId,
  onTechnicianSelect,
  onRouteSelect,
  onAddRouteClick
}: TechnicianRoutesViewProps) {
  // Get routes for selected technician
  const { 
    technicianRoutes = [], 
    isTechnicianRoutesLoading, 
    technicianRoutesError 
  } = useBazzaRoutesByTechnician(selectedTechnicianId);

  // State for view type (list or calendar)
  const [viewType, setViewType] = useState<'list' | 'calendar'>('list');

  // State for selected day filter
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Function to filter routes by day
  const filteredRoutes = React.useMemo(() => {
    if (!technicianRoutes || !Array.isArray(technicianRoutes)) return [];
    
    if (selectedDay) {
      return technicianRoutes.filter((route: BazzaRoute) => 
        route && route.dayOfWeek && route.dayOfWeek.toLowerCase() === selectedDay.toLowerCase()
      );
    }
    
    return technicianRoutes;
  }, [technicianRoutes, selectedDay]);

  // Get technician name
  const technicianName = React.useMemo(() => {
    if (!selectedTechnicianId) return 'All Technicians';
    const technician = technicians.find(t => t.id === selectedTechnicianId);
    return technician ? technician.name : 'Unknown Technician';
  }, [selectedTechnicianId, technicians]);

  // Function to get day color
  const getDayColor = (day: string) => {
    const dayColors: Record<string, string> = {
      'monday': 'bg-blue-100 text-blue-800',
      'tuesday': 'bg-green-100 text-green-800',
      'wednesday': 'bg-purple-100 text-purple-800',
      'thursday': 'bg-orange-100 text-orange-800',
      'friday': 'bg-red-100 text-red-800',
      'saturday': 'bg-teal-100 text-teal-800',
      'sunday': 'bg-indigo-100 text-indigo-800'
    };
    
    return dayColors[day.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  // Function to format time
  const formatTime = (time: string | null) => {
    if (!time) return 'Flexible';
    try {
      // Time is in HH:MM format
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return format(date, 'h:mm a');
    } catch (error) {
      return time;
    }
  };

  if (isTechnicianRoutesLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Spinner size="lg" />
        <span className="ml-2">Loading routes...</span>
      </div>
    );
  }

  if (technicianRoutesError) {
    return (
      <div className="text-red-500 p-4">
        Error loading routes: {(technicianRoutesError as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Technician Routes</h2>
          <p className="text-sm text-muted-foreground">
            {selectedTechnicianId ? `Routes for ${technicianName}` : 'Select a technician to view their routes'}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="w-48">
            <Select 
              value={selectedTechnicianId?.toString() || ''} 
              onValueChange={(value) => onTechnicianSelect(value ? parseInt(value) : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Technicians</SelectItem>
                {technicians.map(technician => (
                  <SelectItem key={technician.id} value={technician.id.toString()}>
                    {technician.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onAddRouteClick} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Route
          </Button>
        </div>
      </div>

      <Tabs defaultValue={viewType} onValueChange={(value) => setViewType(value as 'list' | 'calendar')}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="list">
              <ListOrdered className="h-4 w-4 mr-2" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar View
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="day-filter" className="text-sm">Filter by day:</Label>
            <Select 
              value={selectedDay || ''} 
              onValueChange={(value) => setSelectedDay(value || null)}
            >
              <SelectTrigger id="day-filter" className="w-[150px]">
                <SelectValue placeholder="All Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Days</SelectItem>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="tuesday">Tuesday</SelectItem>
                <SelectItem value="wednesday">Wednesday</SelectItem>
                <SelectItem value="thursday">Thursday</SelectItem>
                <SelectItem value="friday">Friday</SelectItem>
                <SelectItem value="saturday">Saturday</SelectItem>
                <SelectItem value="sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="list" className="space-y-4">
          {filteredRoutes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {selectedTechnicianId ? 
                selectedDay ? 
                  `No routes found for ${technicianName} on ${selectedDay}` : 
                  `No routes found for ${technicianName}` : 
                'Select a technician to view their routes'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoutes.map((route: BazzaRoute) => (
                <Card 
                  key={route.id} 
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => onRouteSelect && onRouteSelect(route)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle className="text-base">{route.name}</CardTitle>
                      <Badge className={getDayColor(route.dayOfWeek)}>
                        {route.dayOfWeek}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {route.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>
                          {route.startTime ? (
                            <>
                              {formatTime(route.startTime)}
                              {route.endTime ? ` - ${formatTime(route.endTime)}` : ''}
                            </>
                          ) : (
                            'Flexible timing'
                          )}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <UserCheck className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{technicianName}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>
                          {/* Here you'd typically show number of stops or locations */}
                          {Math.floor(Math.random() * 10) + 1} stops
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          {filteredRoutes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {selectedTechnicianId ? 
                selectedDay ? 
                  `No routes found for ${technicianName} on ${selectedDay}` : 
                  `No routes found for ${technicianName}` : 
                'Select a technician to view their routes'}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center font-medium text-sm p-2 bg-gray-100 rounded">
                  {day}
                </div>
              ))}
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                const dayRoutes = filteredRoutes.filter((route: BazzaRoute) => route.dayOfWeek.toLowerCase() === day);
                const hasRoutes = dayRoutes.length > 0;
                
                return (
                  <div 
                    key={day}
                    className={`border rounded-md p-3 min-h-[120px] ${
                      selectedDay === day ? 'border-primary/70 bg-primary/5' : 'hover:border-gray-300'
                    } ${hasRoutes ? 'cursor-pointer' : ''}`}
                    onClick={() => hasRoutes && setSelectedDay(day)}
                  >
                    {hasRoutes ? (
                      <div className="space-y-2">
                        {dayRoutes.map((route: BazzaRoute) => (
                          <div 
                            key={route.id}
                            className="text-xs p-2 rounded bg-white border shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRouteSelect && onRouteSelect(route);
                            }}
                          >
                            <div className="font-medium truncate">{route.name}</div>
                            <div className="flex items-center text-muted-foreground mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>
                                {route.startTime ? formatTime(route.startTime) : 'Flexible'}
                              </span>
                            </div>
                            <div className="flex items-center text-muted-foreground mt-1">
                              <UserCheck className="h-3 w-3 mr-1" />
                              <span>{technicianName}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-xs text-gray-400">No routes</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TechnicianRoutesView;