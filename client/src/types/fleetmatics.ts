// Fleetmatics configuration type
export interface FleetmaticsConfig {
  id: number;
  organizationId: number;
  apiKey: string;
  apiSecret: string | null;
  baseUrl: string;
  accountId: string | null;
  refreshToken: string | null;
  accessToken: string | null;
  tokenExpiryTime: Date | string | null;
  lastSyncTime: Date | string | null;
  isActive: boolean;
  syncFrequencyMinutes: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Fleetmatics location history type
export interface FleetmaticsLocationHistory {
  id: number;
  vehicleId: number;
  latitude: number;
  longitude: number;
  eventTime: Date | string;
  address: string | null;
  speed: number | null;
  heading: number | null;
  ignitionStatus: string | null;
  odometer: number | null;
  fleetmaticsEventId: string | null;
  eventType: string | null;
  createdAt: Date | string;
}

// Vehicle with location type (combines TechnicianVehicle with location data)
export interface TechnicianWithLocation {
  id: number;
  name: string;
  technicianId: number;
  type: string;
  status: string;
  make: string | null;
  model: string | null;
  year: number | null;
  licensePlate: string | null;
  vin: string | null;
  notes: string | null;
  fleetmaticsVehicleId: string | null;
  gpsDeviceId: string | null;
  lastKnownLatitude: number | null;
  lastKnownLongitude: number | null;
  lastLocationUpdate: Date | string | null;
  address?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// API response for vehicles in area
export interface VehiclesInAreaResponse {
  vehicles: TechnicianWithLocation[];
  center: {
    latitude: number;
    longitude: number;
  };
  radiusMiles: number;
}

// API response for a sync request
export interface SyncResponse {
  success: boolean;
  syncedVehicles: number;
  syncedLocations: number;
  timestamp: string;
  errors?: string[];
}