import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User } from "lucide-react";
import { MaintenanceWithDetails } from "@/lib/types";
import { formatTime, getStatusClasses } from "@/lib/types";

interface MaintenanceCalendarProps {
  maintenances: MaintenanceWithDetails[];
  month: Date;
}

export function MaintenanceCalendar({ maintenances, month }: MaintenanceCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  
  // Get days in month
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get weekday names
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  // Filter maintenances for selected day
  const selectedDayMaintenances = selectedDay
    ? maintenances.filter((m) => {
        const maintenanceDate = new Date(m.scheduleDate);
        return isSameDay(maintenanceDate, selectedDay);
      })
    : [];
  
  // Calculate which days have maintenance scheduled
  const maintenanceDays = maintenances.map((m) => new Date(m.scheduleDate));
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4">
        {/* Calendar grid */}
        <div className="bg-white rounded-lg border shadow-sm">
          {/* Calendar header */}
          <div className="p-4 border-b">
            <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium">
              {weekDays.map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>
          </div>
          
          {/* Calendar body */}
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: new Date(monthStart).getDay() }).map((_, i) => (
                <div key={`empty-start-${i}`} className="h-10 w-10 rounded-full mx-auto" />
              ))}
              
              {days.map((day) => {
                // Check if this day has maintenance
                const hasMaintenances = maintenanceDays.some((m) => isSameDay(m, day));
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                const isCurrentMonth = isSameMonth(day, month);
                
                return (
                  <Button
                    key={day.toISOString()}
                    variant="ghost"
                    className={`h-10 w-10 rounded-full p-0 mx-auto relative ${
                      isSelected
                        ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                        : isToday(day)
                        ? "bg-muted border border-primary"
                        : ""
                    } ${!isCurrentMonth ? "text-muted-foreground" : ""}`}
                    onClick={() => setSelectedDay(day)}
                  >
                    <time dateTime={format(day, "yyyy-MM-dd")}>{format(day, "d")}</time>
                    {hasMaintenances && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Scheduled maintenances for selected day */}
        <div>
          <h3 className="text-lg font-medium mb-2">
            {selectedDay
              ? `Scheduled Maintenance for ${format(selectedDay, "MMMM d, yyyy")}`
              : "Select a day to view scheduled maintenance"}
          </h3>
          
          {selectedDayMaintenances.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  No maintenance scheduled for this day.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {selectedDayMaintenances.map((maintenance) => (
                <Card key={maintenance.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between items-center">
                      <span>{maintenance.type}</span>
                      <Badge 
                        className={
                          getStatusClasses(maintenance.status).bg + " " + 
                          getStatusClasses(maintenance.status).text
                        }
                      >
                        {maintenance.status.charAt(0).toUpperCase() + maintenance.status.slice(1)}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{maintenance.notes || "No details available"}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{maintenance.notes ? maintenance.notes.split(' ')[0] : "Time not specified"}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{maintenance.client.user.name}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-3 flex justify-between">
                    <div className="text-sm text-muted-foreground">
                      {maintenance.technician ? (
                        <span>Assigned to: {maintenance.technician.user.name}</span>
                      ) : (
                        <span>Not assigned</span>
                      )}
                    </div>
                    <Button variant="outline" size="sm">View Details</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}