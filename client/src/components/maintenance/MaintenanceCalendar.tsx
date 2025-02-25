import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, isSameDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { MaintenanceWithDetails, formatTime } from "@/lib/types";
import { Clock, User } from "lucide-react";

interface MaintenanceCalendarProps {
  maintenances: MaintenanceWithDetails[];
  month: Date;
}

export function MaintenanceCalendar({ maintenances, month }: MaintenanceCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  
  // Get days of month to display
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  
  // Calculate days from previous month to fill the first row
  const dayOfWeek = getDay(start);
  
  // Get maintenances for the selected day
  const selectedDayEvents = selectedDay
    ? maintenances.filter(maintenance => 
        isSameDay(new Date(maintenance.scheduledDate), selectedDay)
      )
    : [];
  
  // Group maintenances by day
  const maintenancesByDay: Record<string, MaintenanceWithDetails[]> = {};
  maintenances.forEach(maintenance => {
    const dateKey = maintenance.scheduledDate.toString();
    if (!maintenancesByDay[dateKey]) {
      maintenancesByDay[dateKey] = [];
    }
    maintenancesByDay[dateKey].push(maintenance);
  });
  
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="w-full lg:w-8/12">
        <div className="grid grid-cols-7 gap-px">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="h-8 flex justify-center items-center font-medium text-sm">
              {day}
            </div>
          ))}
          
          {/* Empty cells for days of previous month */}
          {Array.from({ length: dayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-24 sm:h-28 md:h-32 p-1 border border-gray-100 bg-gray-50" />
          ))}
          
          {/* Days of current month */}
          {days.map(day => {
            const dateKey = day.toISOString().split('T')[0];
            const hasMaintenance = maintenancesByDay[dateKey] && maintenancesByDay[dateKey].length > 0;
            const dayMaintenances = maintenancesByDay[dateKey] || [];
            
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            
            return (
              <div 
                key={day.toString()}
                className={`h-24 sm:h-28 md:h-32 p-1 border border-gray-100 overflow-hidden ${isToday(day) ? 'bg-blue-50' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                <div className="flex justify-between items-start">
                  <div 
                    className={`flex justify-center items-center h-6 w-6 rounded-full text-sm ${
                      isToday(day) ? 'bg-primary text-white' : 'text-gray-700'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                  {hasMaintenance && (
                    <Badge className="bg-primary hover:bg-primary">
                      {dayMaintenances.length}
                    </Badge>
                  )}
                </div>
                <div className="mt-1 space-y-1 max-h-[calc(100%-1.5rem)] overflow-hidden">
                  {dayMaintenances.slice(0, 2).map((maintenance, idx) => (
                    <div 
                      key={`${maintenance.id}-${idx}`}
                      className="text-xs truncate rounded px-1 py-0.5 bg-blue-100 text-primary"
                      title={`${maintenance.client.user.name} - ${maintenance.type}`}
                    >
                      {formatTime(maintenance.scheduledTime)} {maintenance.client.user.name.split(' ')[0]}
                    </div>
                  ))}
                  {dayMaintenances.length > 2 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{dayMaintenances.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="w-full lg:w-4/12 bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-3">
          {selectedDay 
            ? `Maintenance for ${format(selectedDay, 'MMMM d, yyyy')}` 
            : 'Select a day to view maintenance'
          }
        </h3>
        
        {selectedDay && selectedDayEvents.length > 0 ? (
          <div className="space-y-3">
            {selectedDayEvents.map(maintenance => (
              <div 
                key={maintenance.id}
                className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm">{maintenance.client.user.name}</h4>
                  <Badge variant="outline">{maintenance.status}</Badge>
                </div>
                <p className="text-xs text-gray-500 mb-2">{maintenance.type}</p>
                <div className="flex items-center text-xs text-gray-600 gap-3">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(maintenance.scheduledTime)}
                  </div>
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {maintenance.technician ? maintenance.technician.user.name : 'Unassigned'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : selectedDay ? (
          <p className="text-sm text-gray-500">No maintenance scheduled for this day.</p>
        ) : (
          <p className="text-sm text-gray-500">Click on a day to view scheduled maintenance.</p>
        )}
      </div>
    </div>
  );
}
