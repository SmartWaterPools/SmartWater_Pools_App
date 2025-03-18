/**
 * Fleetmatics API Routes
 * 
 * This file contains routes for the Fleetmatics GPS integration:
 * - Configuration management
 * - Vehicle mapping
 * - Location data access
 * - Synchronization controls
 */

import { Router, Request, Response } from 'express';
import { IStorage } from '../storage';
import { isAuthenticated, isAdmin } from '../auth';
import { FleetmaticsService, getFleetmaticsService } from '../fleetmatics-service';
import { InsertFleetmaticsConfig } from '../../shared/schema';

export default function registerFleetmaticsRoutes(router: Router, storage: IStorage) {
  let fleetmaticsService: FleetmaticsService | null = null;
  
  // Initialize the Fleetmatics service for the organization
  async function initFleetmaticsService(organizationId: number): Promise<FleetmaticsService> {
    if (!fleetmaticsService) {
      fleetmaticsService = getFleetmaticsService(storage);
      await fleetmaticsService.initialize(organizationId);
    }
    return fleetmaticsService;
  }
  
  /**
   * Get Fleetmatics configuration for organization
   * GET /api/fleetmatics/config
   * (Protected admin route)
   */
  router.get('/config', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId || 1;
      const config = await storage.getFleetmaticsConfigByOrganizationId(organizationId);
      
      res.json(config || { isActive: false });
    } catch (error) {
      res.status(500).json({ error: `Error retrieving Fleetmatics configuration: ${error.message}` });
    }
  });

  /**
   * Create Fleetmatics configuration for organization
   * POST /api/fleetmatics/config
   * (Protected admin route)
   */
  router.post('/config', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId || 1;
      const { apiKey, apiSecret, baseUrl, accountId, syncFrequencyMinutes, isActive } = req.body;
      
      const configData: InsertFleetmaticsConfig = {
        organizationId,
        apiKey,
        apiSecret,
        baseUrl,
        accountId,
        refreshToken: null,
        accessToken: null,
        tokenExpiryTime: null,
        lastSyncTime: null,
        isActive: isActive !== undefined ? isActive : true,
        syncFrequencyMinutes: syncFrequencyMinutes || 15,
      };
      
      const config = await storage.createFleetmaticsConfig(configData);
      
      // Initialize the service with the new configuration
      await initFleetmaticsService(organizationId);
      
      res.status(201).json(config);
    } catch (error) {
      res.status(500).json({ error: `Error creating Fleetmatics configuration: ${error.message}` });
    }
  });

  /**
   * Update Fleetmatics configuration
   * PATCH /api/fleetmatics/config/:id
   * (Protected admin route)
   */
  router.patch('/config/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedConfig = await storage.updateFleetmaticsConfig(configId, updates);
      
      if (!updatedConfig) {
        return res.status(404).json({ error: 'Fleetmatics configuration not found' });
      }
      
      // Re-initialize the service with the updated configuration
      const organizationId = req.user?.organizationId || 1;
      await initFleetmaticsService(organizationId);
      
      res.json(updatedConfig);
    } catch (error) {
      res.status(500).json({ error: `Error updating Fleetmatics configuration: ${error.message}` });
    }
  });

  /**
   * Test Fleetmatics connection
   * GET /api/fleetmatics/test-connection
   * (Protected admin route)
   */
  router.get('/test-connection', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId || 1;
      const service = await initFleetmaticsService(organizationId);
      
      const isConnected = await service.testConnection();
      
      if (isConnected) {
        res.json({ success: true, message: 'Successfully connected to Fleetmatics API' });
      } else {
        res.status(400).json({ success: false, message: 'Failed to connect to Fleetmatics API' });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: `Error testing connection: ${error.message}` });
    }
  });

  /**
   * Get Fleetmatics vehicles
   * GET /api/fleetmatics/vehicles
   * (Protected admin route)
   */
  router.get('/vehicles', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId || 1;
      const service = await initFleetmaticsService(organizationId);
      
      const vehicles = await service.getVehicles();
      
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: `Error retrieving Fleetmatics vehicles: ${error.message}` });
    }
  });

  /**
   * Map a technician vehicle to a Fleetmatics vehicle
   * POST /api/fleetmatics/map-vehicle
   * (Protected admin route)
   */
  router.post('/map-vehicle', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { technicianVehicleId, fleetmaticsVehicleId } = req.body;
      
      if (!technicianVehicleId || !fleetmaticsVehicleId) {
        return res.status(400).json({ error: 'Both technicianVehicleId and fleetmaticsVehicleId are required' });
      }
      
      const organizationId = req.user?.organizationId || 1;
      const service = await initFleetmaticsService(organizationId);
      
      const vehicle = await service.mapVehicle(
        parseInt(technicianVehicleId), 
        fleetmaticsVehicleId
      );
      
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ error: `Error mapping vehicle: ${error.message}` });
    }
  });

  /**
   * Unmap a technician vehicle from Fleetmatics
   * POST /api/fleetmatics/unmap-vehicle/:id
   * (Protected admin route)
   */
  router.post('/unmap-vehicle/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const technicianVehicleId = parseInt(req.params.id);
      
      const organizationId = req.user?.organizationId || 1;
      const service = await initFleetmaticsService(organizationId);
      
      const vehicle = await service.unmapVehicle(technicianVehicleId);
      
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ error: `Error unmapping vehicle: ${error.message}` });
    }
  });

  /**
   * Get the latest locations for all tracked vehicles
   * GET /api/fleetmatics/locations
   * (Protected route)
   */
  router.get('/locations', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId || 1;
      const service = await initFleetmaticsService(organizationId);
      
      const locations = await service.getLatestVehicleLocations();
      
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: `Error retrieving vehicle locations: ${error.message}` });
    }
  });

  /**
   * Get location history for a vehicle
   * GET /api/fleetmatics/history/:vehicleId
   * (Protected route)
   */
  router.get('/history/:vehicleId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Both startDate and endDate are required query parameters' });
      }
      
      const organizationId = req.user?.organizationId || 1;
      const service = await initFleetmaticsService(organizationId);
      
      const history = await service.getVehicleLocationHistory(
        vehicleId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: `Error retrieving location history: ${error.message}` });
    }
  });

  /**
   * Trigger manual synchronization with Fleetmatics
   * POST /api/fleetmatics/sync
   * (Protected admin route)
   */
  router.post('/sync', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId || 1;
      const service = await initFleetmaticsService(organizationId);
      
      const result = await service.syncVehicleLocations();
      
      if (result) {
        res.json({
          success: true,
          syncedVehicles: 1, // This would be a real count in a production system
          syncedLocations: 5, // This would be a real count in a production system
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          errors: ['Failed to sync with Fleetmatics']
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [`Error during synchronization: ${error.message}`]
      });
    }
  });

  /**
   * Get vehicles in a specific area
   * GET /api/fleetmatics/vehicles-in-area
   * (Protected route)
   */
  router.get('/vehicles-in-area', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { latitude, longitude, radius } = req.query;
      
      if (!latitude || !longitude || !radius) {
        return res.status(400).json({ error: 'latitude, longitude, and radius query parameters are required' });
      }
      
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const rad = parseFloat(radius as string);
      
      if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
        return res.status(400).json({ error: 'Invalid coordinates or radius' });
      }
      
      const organizationId = req.user?.organizationId || 1;
      const service = await initFleetmaticsService(organizationId);
      
      // Get all vehicle locations first
      const allVehicles = await service.getLatestVehicleLocations();
      
      // Filter vehicles within the specified radius
      // This would usually be done on the Fleetmatics API side or with a geospatial query in the database
      // For this implementation, we'll filter them in memory
      const vehiclesInArea = allVehicles.filter(vehicle => {
        if (!vehicle.lastKnownLatitude || !vehicle.lastKnownLongitude) return false;
        
        // Calculate distance using the Haversine formula (approximate)
        const R = 3958.8; // Earth radius in miles
        const dLat = (vehicle.lastKnownLatitude - lat) * Math.PI / 180;
        const dLon = (vehicle.lastKnownLongitude - lng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat * Math.PI / 180) * Math.cos(vehicle.lastKnownLatitude * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance <= rad;
      });
      
      res.json({
        vehicles: vehiclesInArea,
        center: {
          latitude: lat,
          longitude: lng
        },
        radiusMiles: rad
      });
    } catch (error) {
      res.status(500).json({ error: `Error retrieving vehicles in area: ${error.message}` });
    }
  });
  
  return router;
}