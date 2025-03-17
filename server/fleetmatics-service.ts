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
import { FleetmaticsConfig, TechnicianVehicle, InsertFleetmaticsLocationHistory } from '@shared/schema';

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
      this.config = await this.storage.getFleetmaticsConfigByOrganizationId(organizationId);
      
      if (!this.config || !this.config.apiKey || !this.config.apiSecret) {
        console.log('No valid Fleetmatics configuration found for organization:', organizationId);
        return false;
      }

      // Create the API client
      this.apiClient = axios.create({
        baseURL: this.config.baseUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      // If we have tokens that are still valid, add them to the client
      if (this.config.accessToken && !this.isTokenExpired()) {
        this.apiClient.defaults.headers.common['Authorization'] = 
          `${this.config.tokenType || 'Bearer'} ${this.config.accessToken}`;
      } else if (this.config.refreshToken) {
        // Try to refresh the token
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          // If refresh fails, try to authenticate
          const authenticated = await this.authenticate();
          if (!authenticated) {
            console.log('Failed to authenticate with Fleetmatics API');
            return false;
          }
        }
      } else {
        // No tokens, authenticate from scratch
        const authenticated = await this.authenticate();
        if (!authenticated) {
          console.log('Failed to authenticate with Fleetmatics API');
          return false;
        }
      }

      // Start automatic sync if configuration is active
      if (this.config.isActive) {
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
    if (!this.config || !this.config.tokenExpiresAt) {
      return true;
    }

    // Check if token expiration time is past (with a 5-minute buffer)
    const expiresAtDate = new Date(this.config.tokenExpiresAt);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    return expiresAtDate < fiveMinutesFromNow;
  }

  /**
   * Authenticate with the Fleetmatics API
   */
  private async authenticate(): Promise<boolean> {
    if (!this.config || !this.apiClient) {
      return false;
    }

    try {
      const response = await this.apiClient.post<FleetmaticsAuthResponse>('/auth/token', {
        grant_type: 'client_credentials',
        client_id: this.config.apiKey,
        client_secret: this.config.apiSecret,
        account_id: this.config.accountId
      });

      if (response.data && response.data.access_token) {
        // Calculate token expiration time
        const expiresInMs = (response.data.expires_in || 3600) * 1000;
        const expiresAt = new Date(Date.now() + expiresInMs);
        
        // Update configuration with new token details
        await this.storage.updateFleetmaticsConfig(this.config.id, {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          tokenType: response.data.token_type,
          tokenExpiresAt: expiresAt,
          updatedAt: new Date()
        });

        // Update the API client with the new token
        this.apiClient.defaults.headers.common['Authorization'] = 
          `${response.data.token_type} ${response.data.access_token}`;
        
        // Update our local configuration
        this.config = await this.storage.getFleetmaticsConfig(this.config.id);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error authenticating with Fleetmatics API:', error);
      return false;
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshToken(): Promise<boolean> {
    if (!this.config || !this.apiClient || !this.config.refreshToken) {
      return false;
    }

    try {
      const response = await this.apiClient.post<FleetmaticsAuthResponse>('/auth/token', {
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken,
        client_id: this.config.apiKey,
        client_secret: this.config.apiSecret
      });

      if (response.data && response.data.access_token) {
        // Calculate token expiration time
        const expiresInMs = (response.data.expires_in || 3600) * 1000;
        const expiresAt = new Date(Date.now() + expiresInMs);
        
        // Update configuration with new token details
        await this.storage.updateFleetmaticsConfig(this.config.id, {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          tokenType: response.data.token_type,
          tokenExpiresAt: expiresAt,
          updatedAt: new Date()
        });

        // Update the API client with the new token
        this.apiClient.defaults.headers.common['Authorization'] = 
          `${response.data.token_type} ${response.data.access_token}`;
        
        // Update our local configuration
        this.config = await this.storage.getFleetmaticsConfig(this.config.id);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error refreshing Fleetmatics token:', error);
      return false;
    }
  }

  /**
   * Make an authenticated API call
   */
  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    method: 'get' | 'post' | 'put' | 'delete' = 'get',
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T | null> {
    if (!this.apiClient) {
      console.error('API client not initialized');
      return null;
    }

    // Check if token is expired and refresh if needed
    if (this.isTokenExpired()) {
      const tokenRefreshed = await this.refreshToken();
      if (!tokenRefreshed) {
        const authenticated = await this.authenticate();
        if (!authenticated) {
          console.error('Failed to refresh authentication');
          return null;
        }
      }
    }

    try {
      const requestConfig: AxiosRequestConfig = {
        ...config,
        method,
        url: endpoint,
        data
      };

      const response = await this.apiClient.request<T>(requestConfig);
      return response.data;
    } catch (error) {
      console.error(`Error making ${method.toUpperCase()} request to ${endpoint}:`, error);
      return null;
    }
  }

  /**
   * Get a list of all vehicles from Fleetmatics
   */
  async getVehicles(): Promise<FleetmaticsVehicle[]> {
    const vehicles = await this.makeAuthenticatedRequest<{ vehicles: FleetmaticsVehicle[] }>('/fleet/vehicles');
    return vehicles?.vehicles || [];
  }

  /**
   * Get current location for a specific vehicle
   */
  async getVehicleLocation(fleetmaticsVehicleId: string): Promise<FleetmaticsLocation | null> {
    const response = await this.makeAuthenticatedRequest<{ location: FleetmaticsLocation }>(
      `/fleet/vehicles/${fleetmaticsVehicleId}/location`
    );
    
    return response?.location || null;
  }

  /**
   * Get current location for all vehicles
   */
  async getAllVehicleLocations(): Promise<FleetmaticsLocation[]> {
    const response = await this.makeAuthenticatedRequest<{ locations: FleetmaticsLocation[] }>(
      '/fleet/vehicles/locations'
    );
    
    return response?.locations || [];
  }

  /**
   * Get location history for a specific vehicle within a time range
   */
  async getVehicleLocationHistory(
    fleetmaticsVehicleId: string,
    startTime: Date,
    endTime: Date
  ): Promise<FleetmaticsLocation[]> {
    // Format dates in ISO format with timezone
    const startTimeStr = startTime.toISOString();
    const endTimeStr = endTime.toISOString();
    
    const response = await this.makeAuthenticatedRequest<{ locations: FleetmaticsLocation[] }>(
      `/fleet/vehicles/${fleetmaticsVehicleId}/history`,
      'get',
      null,
      {
        params: {
          start_time: startTimeStr,
          end_time: endTimeStr
        }
      }
    );
    
    return response?.locations || [];
  }

  /**
   * Start the synchronization process
   */
  startSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    if (!this.config) {
      console.error('No configuration available for synchronization');
      return;
    }

    const intervalMinutes = this.config.syncFrequencyMinutes || 15;
    const intervalMs = intervalMinutes * 60 * 1000;
    
    console.log(`Starting Fleetmatics sync every ${intervalMinutes} minutes`);
    
    // Do an initial sync
    this.syncVehicleLocations().catch(err => {
      console.error('Error during initial vehicle location sync:', err);
    });
    
    // Set up the interval
    this.syncIntervalId = setInterval(() => {
      this.syncVehicleLocations().catch(err => {
        console.error('Error during scheduled vehicle location sync:', err);
      });
    }, intervalMs);
  }

  /**
   * Stop the synchronization process
   */
  stopSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      console.log('Stopped Fleetmatics synchronization');
    }
  }

  /**
   * Synchronize vehicle locations from Fleetmatics to our system
   */
  async syncVehicleLocations(): Promise<boolean> {
    try {
      if (!this.config) {
        return false;
      }

      // Get all technician vehicles mapped to Fleetmatics
      const allVehicles = await this.storage.getAllTechnicianVehicles();
      const mappedVehicles = allVehicles.filter(v => v.fleetmaticsVehicleId !== null);
      
      if (mappedVehicles.length === 0) {
        console.log('No mapped vehicles found for synchronization');
        return false;
      }

      // Get all current locations from Fleetmatics
      const locations = await this.getAllVehicleLocations();
      
      if (!locations || locations.length === 0) {
        console.log('No location data returned from Fleetmatics API');
        return false;
      }

      // Create a lookup map for quick access
      const fleetmaticsVehicleMap = new Map<string, FleetmaticsLocation>();
      locations.forEach(loc => {
        fleetmaticsVehicleMap.set(loc.vehicleId, loc);
      });

      // Create update promises
      const updatePromises: Promise<any>[] = [];
      const locationHistoryPromises: Promise<any>[] = [];

      // Update each mapped vehicle with its current location
      for (const vehicle of mappedVehicles) {
        const fleetmaticsId = vehicle.fleetmaticsVehicleId;
        if (!fleetmaticsId) continue;
        
        const location = fleetmaticsVehicleMap.get(fleetmaticsId);
        if (!location) continue;

        // Update the technician vehicle location
        updatePromises.push(
          this.storage.updateTechnicianVehicle(vehicle.id, {
            lastKnownLatitude: location.latitude,
            lastKnownLongitude: location.longitude,
            lastLocationUpdate: new Date(),
          })
        );

        // Store location history
        locationHistoryPromises.push(
          this.storage.createFleetmaticsLocationHistory({
            vehicleId: vehicle.id,
            latitude: location.latitude,
            longitude: location.longitude,
            speed: location.speed || null,
            heading: location.heading || null,
            eventTime: new Date(location.eventTime),
            address: location.address || null,
            ignitionStatus: location.ignitionStatus || null,
            odometer: location.odometer || null,
            fleetmaticsEventId: location.eventId || null,
          })
        );
      }

      // Wait for all updates to complete
      await Promise.all([...updatePromises, ...locationHistoryPromises]);
      
      console.log(`Synchronized ${updatePromises.length} vehicle locations and stored ${locationHistoryPromises.length} history records`);
      return true;
    } catch (error) {
      console.error('Error during vehicle location synchronization:', error);
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
      // Verify the Fleetmatics vehicle exists
      const fleetmaticsVehicles = await this.getVehicles();
      const targetVehicle = fleetmaticsVehicles.find(v => v.vehicleId === fleetmaticsVehicleId);
      
      if (!targetVehicle) {
        console.error('Fleetmatics vehicle not found:', fleetmaticsVehicleId);
        return undefined;
      }

      // Update the technician vehicle with the Fleetmatics ID
      const updatedVehicle = await this.storage.updateTechnicianVehicle(
        technicianVehicleId,
        {
          fleetmaticsVehicleId,
          updatedAt: new Date()
        }
      );

      if (updatedVehicle) {
        // Get initial location data
        const location = await this.getVehicleLocation(fleetmaticsVehicleId);
        
        if (location) {
          // Update the vehicle with the current location
          return await this.storage.updateTechnicianVehicle(
            technicianVehicleId,
            {
              lastKnownLatitude: location.latitude,
              lastKnownLongitude: location.longitude,
              lastLocationUpdate: new Date(),
            }
          );
        }
      }

      return updatedVehicle;
    } catch (error) {
      console.error('Error mapping technician vehicle to Fleetmatics vehicle:', error);
      return undefined;
    }
  }

  /**
   * Remove Fleetmatics mapping from a technician vehicle
   */
  async unmapVehicle(technicianVehicleId: number): Promise<TechnicianVehicle | undefined> {
    try {
      const updatedVehicle = await this.storage.updateTechnicianVehicle(
        technicianVehicleId,
        {
          fleetmaticsVehicleId: null,
          updatedAt: new Date()
        }
      );

      return updatedVehicle;
    } catch (error) {
      console.error('Error unmapping technician vehicle from Fleetmatics:', error);
      return undefined;
    }
  }

  /**
   * Test the connection to the Fleetmatics API
   */
  async testConnection(): Promise<boolean> {
    try {
      // A simple test to verify API connectivity
      const vehicles = await this.getVehicles();
      return Array.isArray(vehicles);
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
      // Get all technician vehicles mapped to Fleetmatics
      const allVehicles = await this.storage.getAllTechnicianVehicles();
      const mappedVehicles = allVehicles.filter(v => v.fleetmaticsVehicleId !== null);
      
      if (mappedVehicles.length === 0) {
        return [];
      }

      // Get latest location data
      const result: Array<TechnicianVehicle & { lastUpdate?: Date }> = [];
      
      for (const vehicle of mappedVehicles) {
        // Get the latest location history record for this vehicle
        const history = await this.storage.getLatestFleetmaticsLocationByVehicleId(vehicle.id);
        
        if (history) {
          result.push({
            ...vehicle,
            lastUpdate: history.eventTime
          });
        } else {
          result.push(vehicle);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error getting latest vehicle locations:', error);
      return [];
    }
  }
}

// Singleton instance
let fleetmaticsService: FleetmaticsService | null = null;

export function getFleetmaticsService(storage: IStorage): FleetmaticsService {
  if (!fleetmaticsService) {
    fleetmaticsService = new FleetmaticsService(storage);
  }
  return fleetmaticsService;
}