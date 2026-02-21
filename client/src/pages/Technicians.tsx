import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  PlusCircle, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  Star,
  MoreHorizontal,
  Calendar,
  CalendarCheck,
  BadgeCheck,
  Clock,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TechnicianList } from "@/components/technicians/TechnicianList";
import { TechnicianForm } from "@/components/technicians/TechnicianForm";
import { TechnicianWithUser } from "@/lib/types";

interface TechHoursSummary {
  technicianId: number;
  totalMinutes: number;
  completedOrders: number;
  activeOrders: number;
  maintenanceVisits: number;
  workOrders: number;
  entries: any[];
}

type DateFilter = "week" | "month" | "all";

function getDateRange(filter: DateFilter): { startDate?: string; endDate?: string } {
  if (filter === "all") return {};
  
  const now = new Date();
  const endDate = now.toISOString().split("T")[0];
  
  if (filter === "week") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    return { startDate: monday.toISOString().split("T")[0], endDate };
  }
  
  if (filter === "month") {
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: firstOfMonth.toISOString().split("T")[0], endDate };
  }
  
  return {};
}

export default function Technicians() {
  const [open, setOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianWithUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const { data: technicians, isLoading, error } = useQuery<TechnicianWithUser[]>({
    queryKey: ["/api/technicians-with-users"],
  });

  const dateRange = useMemo(() => getDateRange(dateFilter), [dateFilter]);

  const hoursQueryKey = useMemo(() => {
    const params = new URLSearchParams();
    if (dateRange.startDate) params.set("startDate", dateRange.startDate);
    if (dateRange.endDate) params.set("endDate", dateRange.endDate);
    const qs = params.toString();
    return `/api/work-orders/technician-hours/summary${qs ? `?${qs}` : ""}`;
  }, [dateRange]);

  const { data: hoursSummary, isLoading: hoursLoading } = useQuery<TechHoursSummary[]>({
    queryKey: ["/api/work-orders/technician-hours/summary", dateRange],
    queryFn: async () => {
      const res = await fetch(hoursQueryKey);
      if (!res.ok) throw new Error("Failed to fetch technician hours");
      return res.json();
    },
  });

  if (error) {
    console.error("Error loading technicians:", error);
  }

  const filteredTechnicians = technicians?.filter(technician => {
    if (
      searchTerm &&
      !technician.user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !(technician.specialization || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
      !technician.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  if (error) {
    return (
      <div className="w-full max-w-full overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground font-heading mb-3 md:mb-0">Technicians</h1>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error loading technicians: </strong>
          <span className="block sm:inline">{error instanceof Error ? error.message : 'Unknown error occurred'}</span>
        </div>
      </div>
    );
  }

  const maxMinutes = hoursSummary?.reduce((max, s) => Math.max(max, s.totalMinutes), 0) || 1;

  function getTechName(techId: number): string {
    const tech = technicians?.find(t => t.id === techId);
    return tech?.user?.name || `Technician #${techId}`;
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground font-heading mb-3 md:mb-0">Technicians</h1>
      </div>

      <Tabs defaultValue="team" className="w-full">
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="time-tracking">
            <Clock className="h-4 w-4 mr-1" />
            Time Tracking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mb-6">
            <div className="relative flex-1 sm:flex-initial">
              <Input 
                type="text" 
                placeholder="Search technicians..." 
                className="pl-10 pr-4 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white font-medium whitespace-nowrap">
                  <PlusCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span>Add Technician</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Add New Technician</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <TechnicianForm onSuccess={() => setOpen(false)} />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mb-6">
            <TechnicianList 
              technicians={filteredTechnicians || []} 
              isLoading={isLoading} 
              onTechnicianSelect={setSelectedTechnician}
            />
          </div>
        </TabsContent>

        <TabsContent value="time-tracking">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              variant={dateFilter === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("week")}
            >
              This Week
            </Button>
            <Button
              variant={dateFilter === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("month")}
            >
              This Month
            </Button>
            <Button
              variant={dateFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("all")}
            >
              All Time
            </Button>
          </div>

          {hoursLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-6 w-32 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !hoursSummary || hoursSummary.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-lg font-medium">No time tracking data</p>
                  <p className="text-sm mt-1">No hours have been logged for the selected period.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hoursSummary.map((summary) => {
                const totalHours = (summary.totalMinutes / 60).toFixed(1);
                const barWidth = Math.max((summary.totalMinutes / maxMinutes) * 100, 2);

                return (
                  <Card key={summary.technicianId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="truncate">{getTechName(summary.technicianId)}</span>
                        <span className="text-lg font-bold text-primary ml-2 flex-shrink-0">{totalHours}h</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {summary.completedOrders} completed
                        </Badge>
                        <Badge variant="outline">
                          {summary.activeOrders} active
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Maintenance Visits</span>
                          <span className="font-medium">{summary.maintenanceVisits}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Work Orders</span>
                          <span className="font-medium">{summary.workOrders}</span>
                        </div>
                      </div>

                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className="bg-primary h-2.5 rounded-full transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedTechnician && (
        <Dialog open={!!selectedTechnician} onOpenChange={() => setSelectedTechnician(null)}>
          <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Technician Details</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center">
                      <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-primary text-white flex items-center justify-center text-2xl sm:text-3xl mb-4">
                        {selectedTechnician.user.name.charAt(0)}
                      </div>
                      <h3 className="text-lg font-semibold text-center">{selectedTechnician.user.name}</h3>
                      <p className="text-sm text-gray-500 text-center">{selectedTechnician.specialization}</p>
                      <div className="mt-2 flex items-center">
                        <div className="flex items-center flex-shrink-0">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <Star
                              key={rating}
                              className="h-4 w-4 text-yellow-400 fill-yellow-400"
                            />
                          ))}
                        </div>
                        <span className="ml-1 text-xs text-gray-500">(32 reviews)</span>
                      </div>
                    </div>
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                        <span className="truncate">{selectedTechnician.user.email}</span>
                      </div>
                      {selectedTechnician.user.phone && (
                        <div className="flex items-center text-sm">
                          <Phone className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                          <span className="truncate">{selectedTechnician.user.phone}</span>
                        </div>
                      )}
                      {selectedTechnician.user.address && (
                        <div className="flex items-start text-sm">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="truncate">{selectedTechnician.user.address}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="md:col-span-2 space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-4">
                      <BadgeCheck className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                      <h3 className="text-lg font-semibold truncate">Certifications</h3>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedTechnician.certifications ? (
                        (Array.isArray(selectedTechnician.certifications) 
                          ? selectedTechnician.certifications 
                          : String(selectedTechnician.certifications).split(',')
                        ).map((cert, index) => (
                          <div key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-primary mb-2">
                            {String(cert).trim()}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No certifications listed.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-4">
                      <Calendar className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                      <h3 className="text-lg font-semibold truncate">Current Assignments</h3>
                    </div>
                    {isLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <h4 className="font-medium text-sm truncate">Mediterranean Luxury Pool</h4>
                          <p className="text-xs text-gray-500 mb-2">Construction - Morrison Family</p>
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <span className="text-xs text-blue-600">In Progress (68%)</span>
                            <span className="text-xs text-gray-500">Role: Lead</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-4">
                      <CalendarCheck className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
                      <h3 className="text-lg font-semibold truncate">Upcoming Schedule</h3>
                    </div>
                    {isLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="border border-gray-100 rounded-lg p-3">
                          <div className="flex items-start">
                            <div className="flex flex-col items-center justify-center bg-blue-100 rounded-lg p-2 mr-3 flex-shrink-0 w-12 h-12 text-center">
                              <span className="text-primary text-sm font-semibold">27</span>
                              <span className="text-primary text-xs">Oct</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate">Jensen Family</h4>
                              <p className="text-xs text-gray-500 truncate">Weekly Pool Cleaning</p>
                              <div className="flex items-center mt-1">
                                <span className="text-xs bg-blue-100 text-primary px-2 py-0.5 rounded-full">10:00 AM</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-4">
                      <BadgeCheck className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" />
                      <h3 className="text-lg font-semibold truncate">Account Information</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Role</span>
                        <Badge variant="outline">{selectedTechnician.user.role?.charAt(0).toUpperCase() + selectedTechnician.user.role?.slice(1)}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Status</span>
                        <Badge className={(selectedTechnician.user as any).active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {(selectedTechnician.user as any).active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Login Method</span>
                        <span className="text-sm">{(selectedTechnician.user as any).authProvider === 'google' ? 'Google' : 'Email/Password'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Username</span>
                        <span className="text-sm font-mono">{(selectedTechnician.user as any).username || selectedTechnician.user.email}</span>
                      </div>
                      {(selectedTechnician.user as any).createdAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Account Created</span>
                          <span className="text-sm">{new Date((selectedTechnician.user as any).createdAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
