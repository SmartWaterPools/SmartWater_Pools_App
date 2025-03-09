import { useQuery } from "@tanstack/react-query";
import { WaterReading } from "@shared/schema";
import { formatDate } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface WaterReadingsHistoryProps {
  maintenanceId: number;
  clientId: number;
}

// Define target ranges for each parameter
const targetRanges = {
  ph: { min: 7.2, max: 7.8, unit: "" },
  chlorine: { min: 1, max: 3, unit: "ppm" },
  alkalinity: { min: 80, max: 120, unit: "ppm" },
  cyanuricAcid: { min: 30, max: 50, unit: "ppm" },
  calcium: { min: 200, max: 400, unit: "ppm" },
  phosphate: { min: 0, max: 100, unit: "ppb" },
  salinity: { min: 2500, max: 3500, unit: "ppm" },
  tds: { min: 0, max: 1500, unit: "ppm" },
  temperature: { min: 78, max: 82, unit: "°F" },
};

// Helper function to determine status of a reading
function getReadingStatus(param: string, value: number | undefined | null): "ideal" | "warning" | "critical" | undefined {
  if (value === undefined || value === null) return undefined;
  
  const range = targetRanges[param as keyof typeof targetRanges];
  if (!range) return undefined;
  
  if (value >= range.min && value <= range.max) {
    return "ideal";
  } else if (
    (value >= range.min * 0.9 && value < range.min) || 
    (value > range.max && value <= range.max * 1.1)
  ) {
    return "warning";
  } else {
    return "critical";
  }
}

// Helper function to get badge variant based on status
function getBadgeVariant(status: "ideal" | "warning" | "critical" | undefined): "default" | "secondary" | "destructive" {
  switch (status) {
    case "ideal":
      return "default";
    case "warning":
      return "secondary";
    case "critical":
      return "destructive";
    default:
      return "secondary";
  }
}

export function WaterReadingsHistory({ maintenanceId, clientId }: WaterReadingsHistoryProps) {
  // Fetch the current maintenance water readings
  const { data: currentReadings, isLoading: isLoadingCurrent, error: errorCurrent } = useQuery({
    queryKey: [`/api/water-readings/maintenance/${maintenanceId}`],
    queryFn: async () => {
      return apiRequest<WaterReading[]>(`/api/water-readings/maintenance/${maintenanceId}`);
    },
    enabled: !!maintenanceId,
  });
  
  // Fetch the client's history of water readings for trend analysis
  const { data: clientHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: [`/api/water-readings/client-history/${clientId}`],
    queryFn: async () => {
      // For now, let's simulate historical data since this endpoint doesn't exist yet
      // In a real implementation, this would call an API endpoint
      return Promise.resolve([]) as Promise<WaterReading[]>;
    },
    enabled: !!clientId,
  });
  
  // Loading state
  if (isLoadingCurrent || isLoadingHistory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Water Chemistry</CardTitle>
          <CardDescription>Loading water test data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Error state
  if (errorCurrent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Water Chemistry</CardTitle>
          <CardDescription className="text-red-500">
            Error loading water test data: {errorCurrent instanceof Error ? errorCurrent.message : String(errorCurrent)}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Empty state - no readings for this maintenance visit
  if (!currentReadings || currentReadings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Water Chemistry</CardTitle>
          <CardDescription>No water test data recorded for this maintenance visit.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Get the most recent reading
  const latestReading = currentReadings[0];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Water Chemistry Results</CardTitle>
        <CardDescription>
          Last tested: {formatDate(latestReading.createdAt || new Date())}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Readings */}
          <div className="grid grid-cols-3 gap-4">
            {/* pH Value */}
            {latestReading.ph !== null && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">pH</span>
                  <Badge 
                    variant={getBadgeVariant(getReadingStatus("ph", latestReading.ph))}
                  >
                    {latestReading.ph}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  Target: {targetRanges.ph.min}-{targetRanges.ph.max}
                </div>
              </div>
            )}
            
            {/* Chlorine Value */}
            {latestReading.chlorine !== null && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Free Chlorine</span>
                  <Badge 
                    variant={getBadgeVariant(getReadingStatus("chlorine", latestReading.chlorine))}
                  >
                    {latestReading.chlorine} ppm
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  Target: {targetRanges.chlorine.min}-{targetRanges.chlorine.max} ppm
                </div>
              </div>
            )}
            
            {/* Alkalinity Value */}
            {latestReading.alkalinity !== null && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Alkalinity</span>
                  <Badge 
                    variant={getBadgeVariant(getReadingStatus("alkalinity", latestReading.alkalinity))}
                  >
                    {latestReading.alkalinity} ppm
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  Target: {targetRanges.alkalinity.min}-{targetRanges.alkalinity.max} ppm
                </div>
              </div>
            )}
            
            {/* Cyanuric Acid Value */}
            {latestReading.cyanuricAcid !== null && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Cyanuric Acid</span>
                  <Badge 
                    variant={getBadgeVariant(getReadingStatus("cyanuricAcid", latestReading.cyanuricAcid))}
                  >
                    {latestReading.cyanuricAcid} ppm
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  Target: {targetRanges.cyanuricAcid.min}-{targetRanges.cyanuricAcid.max} ppm
                </div>
              </div>
            )}
            
            {/* Calcium Value */}
            {latestReading.calcium !== null && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Calcium Hardness</span>
                  <Badge 
                    variant={getBadgeVariant(getReadingStatus("calcium", latestReading.calcium))}
                  >
                    {latestReading.calcium} ppm
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  Target: {targetRanges.calcium.min}-{targetRanges.calcium.max} ppm
                </div>
              </div>
            )}
            
            {/* TDS Value */}
            {latestReading.tds !== null && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">TDS</span>
                  <Badge 
                    variant={getBadgeVariant(getReadingStatus("tds", latestReading.tds))}
                  >
                    {latestReading.tds} ppm
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  Target: Below {targetRanges.tds.max} ppm
                </div>
              </div>
            )}
          </div>
          
          {/* Historical Trend Charts - only show if we have history */}
          {clientHistory && clientHistory.length > 0 && (
            <div>
              <h3 className="text-base font-medium mb-2">Water Chemistry Trends</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={clientHistory.map(reading => ({
                      date: formatDate(reading.createdAt || new Date()),
                      ph: reading.ph,
                      chlorine: reading.chlorine,
                      alkalinity: reading.alkalinity,
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="ph"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="chlorine" 
                      stroke="#82ca9d" 
                    />
                    <Line
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="alkalinity" 
                      stroke="#ffc658" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {/* Notes Section */}
          {latestReading.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium mb-1">Notes</h4>
              <p className="text-sm text-gray-600">{latestReading.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}