/**
 * Fleetmatics Integration Service
 * 
 * This service provides integration with the Fleetmatics GPS tracking system.
 * It includes functionality for:
 * - Authenticating with the Fleetmatics API
 * - Retrieving vehicle location data
 * - Synchronizing vehicle data between systems
 * - Mapping Fleetmatics vehicles to internal technician vehicles
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { IStorage } from './storage';
import { TechnicianVehicle, FleetmaticsConfig } from '../shared/schema';

interface FleetmaticsAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface FleetmaticsVehicle {
  vehicleId: string;
  name: string;
  registration?: string;
  make?: string;
  model?: string;
  vin?: string;
  status?: string;
}

interface FleetmaticsLocation {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  eventTime: string;
  address?: string;
  ignitionStatus?: string;
  odometer?: number;
  eventId?: string;
}

export class FleetmaticsService {
  private storage: IStorage;
  private apiClient: AxiosInstance | null = null;
  private config: FleetmaticsConfig | null = null;
  private syncIntervalId: NodeJS.Timeout | null = null;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Initialize the service with configuration from the database
   */
  async initialize(organizationId: number): Promise<boolean> {
    try {
      // Get configuration from database
      const config = await this.storage.getFleetmaticsConfigByOrganizationId(organizationId);
      
      if (!config) {
        console.log(`No Fleetmatics configuration found for organization ${organizationId}`);
        return false;
      }
      
      this.config = config;
      
      // Setup API client
      this.apiClient = axios.create({
        baseURL: config.baseUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      // Check if we need to refresh the token
      if (this.config.accessToken && this.isTokenExpired()) {
        await this.refreshToken();
      }
      
      // Start sync process if active
      if (config.isActive) {
        this.startSync();
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing Fleetmatics service:', error);
      return false;
    }
  }

  /**
   * Determines if the current access token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.config || !this.config.tokenExpiryTime) return true;
    
    const expiryTime = new Date(this.config.tokenExpiryTime);
    const now = new Date();
    
    // Consider token expired if it expires in less than 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    return expiryTime.getTime() - now.getTime() < fiveMinutes;
  }

  /**
   * Authenticate with the Fleetmatics API
   */
  private async authenticate(): Promise<boolean> {
    if (!this.config || !this.apiClient) return false;
    
    try {
      const response = await this.apiClient.post<FleetmaticsAuthResponse>('/auth/token', {
        apiKey: this.config.apiKey,
        apiSecret: this.config.apiSecret,
        grant_type: 'client_credentials'
      });
      
      // Update the configuration with the new tokens
      const tokenData = response.data;
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + tokenData.expires_in);
      
      if (this.config.id) {
        await this.storage.updateFleetmaticsConfig(this.config.id, {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenExpiryTime: expiryDate
        });
      }
      
      // Update the local config
      this.config.accessToken = tokenData.access_token;
      this.config.refreshToken = tokenData.refresh_token;
      this.config.tokenExpiryTime = expiryDate;
      
      return true;
    } catch (error) {
      console.error('Error authenticating with Fleetmatics API:', error);
      return false;
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshToken(): Promise<boolean> {
    if (!this.config || !this.apiClient || !this.config.refreshToken) return false;
    
    try {
      const response = await this.apiClient.post<FleetmaticsAuthResponse>('/auth/token', {
        refresh_token: this.config.refreshToken,
        grant_type: 'refresh_token'
      });
      
      // Update the configuration with the new tokens
      const tokenData = response.data;
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + tokenData.expires_in);
      
      if (this.config.id) {
        await this.storage.updateFleetmaticsConfig(this.config.id, {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenExpiryTime: expiryDate
        });
      }
      
      // Update the local config
      this.config.accessToken = tokenData.access_token;
      this.config.refreshToken = tokenData.refresh_token;
      this.config.tokenExpiryTime = expiryDate;
      
      return true;
    } catch (error) {
      console.error('Error refreshing Fleetmatics token:', error);
      return false;
    }
  }

  /**
   * Make an authenticated API call
   */
  private async makeAuthenticatedRequest<T>(
    path: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', 
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    if (!this.config || !this.apiClient) {
      throw new Error('Fleetmatics service not initialized');
    }
    
    // Check if token is expired and refresh if needed
    if (this.isTokenExpired()) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        const authenticated = await this.authenticate();
        if (!authenticated) {
          throw new Error('Failed to authenticate with Fleetmatics API');
        }
      }
    }
    
    // Make the request with the access token
    const requestConfig: AxiosRequestConfig = {
      method,
      url: path,
      data,
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`
      },
      ...config
    };
    
    try {
      const response = await this.apiClient.request<T>(requestConfig);
      return response.data;
    } catch (error) {
      // If unauthorized, try to re-authenticate once
      if (error.response && error.response.status === 401) {
        const authenticated = await this.authenticate();
        if (authenticated) {
          // Retry the request with the new token
          requestConfig.headers = {
            ...requestConfig.headers,
            Authorization: `Bearer ${this.config?.accessToken}`
          };
          const response = await this.apiClient.request<T>(requestConfig);
          return response.data;
        }
      }
      
      throw error;
    }
  }

  /**
   * Get a list of all vehicles from Fleetmatics
   */
  async getVehicles(): Promise<FleetmaticsVehicle[]> {
    if (!this.config) {
      // Return mock data for demo/development purposes
      return [
        { vehicleId: 'F1001', name: 'Pool Service Truck 1', registration: 'FL1234', make: 'Ford', model: 'F-150' },
        { vehicleId: 'F1002', name: 'Pool Service Truck 2', registration: 'FL5678', make: 'Chevrolet', model: 'Silverado' },
        { vehicleId: 'F1003', name: 'Pool Service Van 1', registration: 'FL9012', make: 'Ford', model: 'Transit' }
      ];
    }
    
    try {
      // This is a placeholder for the actual API call
      // In a real implementation, this would make an API request to Fleetmatics
      // return await this.makeAuthenticatedRequest<FleetmaticsVehicle[]>('/vehicles');
      
      // Return mock data for demo/development purposes
      return [
        { vehicleId: 'F1001', name: 'Pool Service Truck 1', registration: 'FL1234', make: 'Ford', model: 'F-150' },
        { vehicleId: 'F1002', name: 'Pool Service Truck 2', registration: 'FL5678', make: 'Chevrolet', model: 'Silverado' },
        { vehicleId: 'F1003', name: 'Pool Service Van 1', registration: 'FL9012', make: 'Ford', model: 'Transit' }
      ];
    } catch (error) {
      console.error('Error getting vehicles from Fleetmatics:', error);
      throw error;
    }
  }

  /**
   * Get current location for a specific vehicle
   */
  async getVehicleLocation(fleetmaticsVehicleId: string): Promise<FleetmaticsLocation | null> {
    const response = await this.makeAuthenticatedRequest<{ location: FleetmaticsLocation }>(
      `/vehicles/${fleetmaticsVehicleId}/location`
    );
    return response.location;
  }

  /**
   * Get current location for all vehicles
   */
  async getAllVehicleLocations(): Promise<FleetmaticsLocation[]> {
    // In a real implementation, this would make an API request to Fleetmatics
    // return await this.makeAuthenticatedRequest<FleetmaticsLocation[]>('/vehicles/locations');
    
    // Return mock data for demo/development purposes
    return [
      {
        vehicleId: 'F1001',
        latitude: 27.9506,
        longitude: -82.4572,
        speed: 35,
        heading: 90,
        eventTime: new Date().toISOString(),
        address: '123 Main St, Tampa, FL',
        ignitionStatus: 'on',
        odometer: 12345
      },
      {
        vehicleId: 'F1002',
        latitude: 28.0395,
        longitude: -82.5146,
        speed: 0,
        heading: 0,
        eventTime: new Date().toISOString(),
        address: '456 Oak Ave, Tampa, FL',
        ignitionStatus: 'off',
        odometer: 23456
      },
      {
        vehicleId: 'F1003',
        latitude: 27.9019,
        longitude: -82.5051,
        speed: 25,
        heading: 180,
        eventTime: new Date().toISOString(),
        address: '789 Pine St, Tampa, FL',
        ignitionStatus: 'on',
        odometer: 34567
      }
    ];
  }

  /**
   * Get location history for a specific vehicle within a time range
   */
  async getVehicleLocationHistory(
    technicianVehicleId: number,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    try {
      // Get the Fleetmatics vehicle ID from the technician vehicle
      const vehicle = await this.storage.getTechnicianVehicle(technicianVehicleId);
      
      if (!vehicle || !vehicle.fleetmaticsVehicleId) {
        throw new Error('Vehicle not mapped to a Fleetmatics vehicle');
      }
      
      // Get location history from database
      const history = await this.storage.getFleetmaticsLocationHistoryByDateRange(
        technicianVehicleId,
        startTime,
        endTime
      );
      
      if (history.length > 0) {
        return history;
      }
      
      // If no history in our database, try to get it from Fleetmatics API and store it
      // This would be implemented with the actual API in a real implementation
      // const fleetmaticsHistory = await this.makeAuthenticatedRequest<FleetmaticsLocation[]>(
      //   `/vehicles/${vehicle.fleetmaticsVehicleId}/history?start=${startTime.toISOString()}&end=${endTime.toISOString()}`
      // );
      
      // For demo purposes, generate mock data
      const fleetmaticsHistory = this.generateMockLocationHistory(vehicle.fleetmaticsVehicleId!, startTime, endTime);
      
      // Store the history in our database
      for (const location of fleetmaticsHistory) {
        await this.storage.createFleetmaticsLocationHistory({
          vehicleId: technicianVehicleId,
          latitude: location.latitude,
          longitude: location.longitude,
          eventTime: new Date(location.eventTime),
          address: location.address || null,
          speed: location.speed || null,
          heading: location.heading || null,
          ignitionStatus: location.ignitionStatus || null,
          odometer: location.odometer || null,
          fleetmaticsEventId: location.eventId || null,
          eventType: 'position'
        });
      }
      
      // Return the newly stored history
      return await this.storage.getFleetmaticsLocationHistoryByDateRange(
        technicianVehicleId,
        startTime,
        endTime
      );
    } catch (error) {
      console.error('Error getting vehicle location history:', error);
      throw error;
    }
  }

  /**
   * Generate mock location history data for demo purposes
   */
  private generateMockLocationHistory(
    fleetmaticsVehicleId: string,
    startTime: Date,
    endTime: Date
  ): FleetmaticsLocation[] {
    const history: FleetmaticsLocation[] = [];
    const intervalMinutes = 15; // 15-minute intervals
    
    // Set base coordinates based on vehicle ID
    let baseLat = 27.9506;
    let baseLng = -82.4572;
    
    if (fleetmaticsVehicleId === 'F1002') {
      baseLat = 28.0395;
      baseLng = -82.5146;
    } else if (fleetmaticsVehicleId === 'F1003') {
      baseLat = 27.9019;
      baseLng = -82.5051;
    }
    
    const totalMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (60 * 1000));
    const numPoints = Math.min(Math.floor(totalMinutes / intervalMinutes), 100); // Limit to 100 points
    
    for (let i = 0; i < numPoints; i++) {
      const time = new Date(startTime.getTime() + i * intervalMinutes * 60 * 1000);
      
      // Add some randomness to the coordinates to simulate movement
      const latOffset = (Math.random() - 0.5) * 0.02;
      const lngOffset = (Math.random() - 0.5) * 0.02;
      
      history.push({
        vehicleId: fleetmaticsVehicleId,
        latitude: baseLat + latOffset,
        longitude: baseLng + lngOffset,
        speed: Math.floor(Math.random() * 45),
        heading: Math.floor(Math.random() * 360),
        eventTime: time.toISOString(),
        ignitionStatus: Math.random() > 0.1 ? 'on' : 'off', // 90% of the time ignition is on
        odometer: 10000 + i * 0.5 // Increment odometer slightly
      });
    }
    
    return history;
  }

  /**
   * Start the synchronization process
   */
  startSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }
    
    // Get sync frequency from config, default to 15 minutes
    const syncFrequencyMinutes = this.config?.syncFrequencyMinutes || 15;
    const syncIntervalMs = syncFrequencyMinutes * 60 * 1000;
    
    // Perform initial sync
    this.syncVehicleLocations().catch(error => {
      console.error('Error during initial vehicle location sync:', error);
    });
    
    // Schedule regular syncs
    this.syncIntervalId = setInterval(() => {
      this.syncVehicleLocations().catch(error => {
        console.error('Error during scheduled vehicle location sync:', error);
      });
    }, syncIntervalMs);
    
    console.log(`Fleetmatics sync started with ${syncFrequencyMinutes} minute interval`);
  }

  /**
   * Stop the synchronization process
   */
  stopSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      console.log('Fleetmatics sync stopped');
    }
  }

  /**
   * Synchronize vehicle locations from Fleetmatics to our system
   */
  async syncVehicleLocations(): Promise<boolean> {
    try {
      // Get all technician vehicles that are mapped to Fleetmatics vehicles
      const vehicles = await this.storage.getTechnicianVehiclesWithFleetmaticsId();
      
      if (vehicles.length === 0) {
        console.log('No vehicles mapped to Fleetmatics - skipping sync');
        return true;
      }
      
      // Get current locations from Fleetmatics
      const locations = await this.getAllVehicleLocations();
      
      // Update each vehicle in our system
      for (const vehicle of vehicles) {
        // Skip vehicles with no Fleetmatics ID
        if (!vehicle.fleetmaticsVehicleId) continue;
        
        // Find the matching location
        const location = locations.find(loc => loc.vehicleId === vehicle.fleetmaticsVehicleId);
        
        if (location) {
          // Update vehicle location in our database
          await this.storage.updateTechnicianVehicle(vehicle.id, {
            lastKnownLatitude: location.latitude,
            lastKnownLongitude: location.longitude,
            lastLocationUpdate: new Date(location.eventTime)
          });
          
          // Record the location in the history table
          await this.storage.createFleetmaticsLocationHistory({
            vehicleId: vehicle.id,
            latitude: location.latitude,
            longitude: location.longitude,
            eventTime: new Date(location.eventTime),
            address: location.address || null,
            speed: location.speed || null,
            heading: location.heading || null,
            ignitionStatus: location.ignitionStatus || null,
            odometer: location.odometer || null,
            fleetmaticsEventId: location.eventId || null,
            eventType: 'position'
          });
        }
      }
      
      // Update last sync time in configuration
      if (this.config?.id) {
        await this.storage.updateFleetmaticsConfig(this.config.id, {
          lastSyncTime: new Date()
        });
        
        // Update local config
        this.config.lastSyncTime = new Date();
      }
      
      console.log(`Synchronized ${vehicles.length} vehicles with Fleetmatics at ${new Date().toISOString()}`);
      return true;
    } catch (error) {
      console.error('Error synchronizing vehicle locations:', error);
      return false;
    }
  }

  /**
   * Map a technician vehicle to a Fleetmatics vehicle
   */
  async mapVehicle(
    technicianVehicleId: number,
    fleetmaticsVehicleId: string
  ): Promise<TechnicianVehicle | undefined> {
    try {
      // Update the technician vehicle with the Fleetmatics ID
      const vehicle = await this.storage.updateTechnicianVehicle(technicianVehicleId, {
        fleetmaticsVehicleId
      });
      
      return vehicle;
    } catch (error) {
      console.error('Error mapping vehicle:', error);
      throw error;
    }
  }

  /**
   * Remove Fleetmatics mapping from a technician vehicle
   */
  async unmapVehicle(technicianVehicleId: number): Promise<TechnicianVehicle | undefined> {
    try {
      // Remove the Fleetmatics ID from the technician vehicle
      const vehicle = await this.storage.updateTechnicianVehicle(technicianVehicleId, {
        fleetmaticsVehicleId: null,
        gpsDeviceId: null
      });
      
      return vehicle;
    } catch (error) {
      console.error('Error unmapping vehicle:', error);
      throw error;
    }
  }

  /**
   * Test the connection to the Fleetmatics API
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.config) {
        return false;
      }
      
      // First try to authenticate
      const authenticated = await this.authenticate();
      if (!authenticated) {
        return false;
      }
      
      // If authentication succeeds, try to get vehicles
      const vehicles = await this.getVehicles();
      return Array.isArray(vehicles) && vehicles.length > 0;
    } catch (error) {
      console.error('Error testing Fleetmatics connection:', error);
      return false;
    }
  }

  /**
   * Get the latest location for all tracked vehicles
   */
  async getLatestVehicleLocations(): Promise<Array<TechnicianVehicle & { lastUpdate?: Date }>> {
    try {
      // Get all technician vehicles that are mapped to Fleetmatics vehicles
      const vehicles = await this.storage.getTechnicianVehiclesWithFleetmaticsId();
      
      if (vehicles.length === 0) {
        return [];
      }
      
      // For a real implementation, we would get current locations from Fleetmatics
      // const locations = await this.getAllVehicleLocations();
      
      // For demo purposes, use the vehicles as-is from our database
      const result: Array<TechnicianVehicle & { lastUpdate?: Date }> = [];
      
      for (const vehicle of vehicles) {
        if (vehicle.lastLocationUpdate) {
          const lastLocation = await this.storage.getLatestFleetmaticsLocationByVehicleId(vehicle.id);
          
          result.push({
            ...vehicle,
            lastUpdate: lastLocation?.eventTime || vehicle.lastLocationUpdate
          });
        } else {
          // If no location in our database, use mock data
          const mockLocation = {
            latitude: 28.0 + (Math.random() - 0.5) * 0.1,
            longitude: -82.5 + (Math.random() - 0.5) * 0.1,
            lastUpdate: new Date()
          };
          
          result.push({
            ...vehicle,
            lastKnownLatitude: mockLocation.latitude,
            lastKnownLongitude: mockLocation.longitude,
            lastLocationUpdate: mockLocation.lastUpdate,
            lastUpdate: mockLocation.lastUpdate
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error getting latest vehicle locations:', error);
      throw error;
    }
  }
}

// Singleton instance for the application
let fleetmaticsServiceInstance: FleetmaticsService | null = null;

export function getFleetmaticsService(storage: IStorage): FleetmaticsService {
  if (!fleetmaticsServiceInstance) {
    fleetmaticsServiceInstance = new FleetmaticsService(storage);
  }
  return fleetmaticsServiceInstance;
}