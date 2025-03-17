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
import { isAuthenticated, isAdmin } from '../auth';
import { getFleetmaticsService } from '../fleetmatics-service';
import { IStorage } from '../storage';
import { InsertFleetmaticsConfig } from '@shared/schema';

export default function registerFleetmaticsRoutes(router: Router, storage: IStorage) {
  const fleetmaticsService = getFleetmaticsService(storage);

  /**
   * Get Fleetmatics configuration for organization
   * GET /api/fleetmatics/config
   * (Protected admin route)
   */
  router.get('/config', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      const config = await storage.getFleetmaticsConfigByOrganizationId(organizationId);
      if (!config) {
        return res.status(404).json({ error: 'Fleetmatics configuration not found' });
      }

      // Mask sensitive data for security
      const safeConfig = {
        ...config,
        apiKey: config.apiKey ? '********' : null,
        apiSecret: config.apiSecret ? '********' : null,
        accessToken: config.accessToken ? '********' : null,
        refreshToken: config.refreshToken ? '********' : null
      };

      return res.status(200).json(safeConfig);
    } catch (error) {
      console.error('Error fetching Fleetmatics config:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Create Fleetmatics configuration for organization
   * POST /api/fleetmatics/config
   * (Protected admin route)
   */
  router.post('/config', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      // Check if config already exists
      const existingConfig = await storage.getFleetmaticsConfigByOrganizationId(organizationId);
      if (existingConfig) {
        return res.status(400).json({ error: 'Configuration already exists for this organization' });
      }

      const configData: InsertFleetmaticsConfig = {
        organizationId,
        apiKey: req.body.apiKey,
        apiSecret: req.body.apiSecret,
        accountId: req.body.accountId,
        baseUrl: req.body.baseUrl || 'https://api.fleetmatics.com/v1',
        isActive: req.body.isActive !== undefined ? req.body.isActive : false,
        syncFrequencyMinutes: req.body.syncFrequencyMinutes || 15,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const config = await storage.createFleetmaticsConfig(configData);
      
      // Initialize the service with the new configuration
      await fleetmaticsService.initialize(organizationId);

      return res.status(201).json({
        ...config,
        apiKey: '********',
        apiSecret: '********',
        accessToken: '********',
        refreshToken: '********'
      });
    } catch (error) {
      console.error('Error creating Fleetmatics config:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Update Fleetmatics configuration
   * PATCH /api/fleetmatics/config
   * (Protected admin route)
   */
  router.patch('/config/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.id);
      if (isNaN(configId)) {
        return res.status(400).json({ error: 'Invalid configuration ID' });
      }

      const organizationId = req.user?.organizationId;
      
      // Verify the config belongs to this organization
      const existingConfig = await storage.getFleetmaticsConfig(configId);
      if (!existingConfig || existingConfig.organizationId !== organizationId) {
        return res.status(404).json({ error: 'Configuration not found or access denied' });
      }

      // Update only allowed fields
      const updates: Partial<InsertFleetmaticsConfig> = {
        updatedAt: new Date()
      };

      if (req.body.apiKey !== undefined) updates.apiKey = req.body.apiKey;
      if (req.body.apiSecret !== undefined) updates.apiSecret = req.body.apiSecret;
      if (req.body.accountId !== undefined) updates.accountId = req.body.accountId;
      if (req.body.baseUrl !== undefined) updates.baseUrl = req.body.baseUrl;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
      if (req.body.syncFrequencyMinutes !== undefined) updates.syncFrequencyMinutes = req.body.syncFrequencyMinutes;

      const updatedConfig = await storage.updateFleetmaticsConfig(configId, updates);
      
      // Re-initialize the service with updated configuration
      await fleetmaticsService.initialize(organizationId);

      return res.status(200).json({
        ...updatedConfig,
        apiKey: '********',
        apiSecret: '********',
        accessToken: '********',
        refreshToken: '********'
      });
    } catch (error) {
      console.error('Error updating Fleetmatics config:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Test Fleetmatics connection
   * GET /api/fleetmatics/test-connection
   * (Protected admin route)
   */
  router.get('/test-connection', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      // Initialize with current organization config
      const initialized = await fleetmaticsService.initialize(organizationId);
      if (!initialized) {
        return res.status(400).json({ 
          success: false, 
          message: 'Failed to initialize Fleetmatics service. Check configuration.' 
        });
      }

      const connectionSuccess = await fleetmaticsService.testConnection();
      
      return res.status(200).json({ 
        success: connectionSuccess,
        message: connectionSuccess 
          ? 'Successfully connected to Fleetmatics API' 
          : 'Failed to connect to Fleetmatics API. Check your credentials and try again.'
      });
    } catch (error) {
      console.error('Error testing Fleetmatics connection:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  });

  /**
   * Get Fleetmatics vehicles
   * GET /api/fleetmatics/vehicles
   * (Protected admin route)
   */
  router.get('/vehicles', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      // Initialize with current organization config
      const initialized = await fleetmaticsService.initialize(organizationId);
      if (!initialized) {
        return res.status(400).json({ error: 'Failed to initialize Fleetmatics service' });
      }

      const vehicles = await fleetmaticsService.getVehicles();
      return res.status(200).json(vehicles);
    } catch (error) {
      console.error('Error fetching Fleetmatics vehicles:', error);
      return res.status(500).json({ error: 'Internal server error' });
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
        return res.status(400).json({ 
          error: 'Both technicianVehicleId and fleetmaticsVehicleId are required' 
        });
      }

      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      // Initialize with current organization config
      const initialized = await fleetmaticsService.initialize(organizationId);
      if (!initialized) {
        return res.status(400).json({ error: 'Failed to initialize Fleetmatics service' });
      }

      // Verify the vehicle exists and belongs to this organization
      const vehicle = await storage.getTechnicianVehicle(technicianVehicleId);
      if (!vehicle) {
        return res.status(404).json({ error: 'Technician vehicle not found' });
      }

      // Map the vehicle
      const updatedVehicle = await fleetmaticsService.mapVehicle(
        technicianVehicleId,
        fleetmaticsVehicleId
      );

      if (!updatedVehicle) {
        return res.status(500).json({ error: 'Failed to map vehicle' });
      }

      return res.status(200).json(updatedVehicle);
    } catch (error) {
      console.error('Error mapping vehicle:', error);
      return res.status(500).json({ error: 'Internal server error' });
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
      if (isNaN(technicianVehicleId)) {
        return res.status(400).json({ error: 'Invalid vehicle ID' });
      }

      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      // Initialize with current organization config
      const initialized = await fleetmaticsService.initialize(organizationId);
      if (!initialized) {
        return res.status(400).json({ error: 'Failed to initialize Fleetmatics service' });
      }

      // Verify the vehicle exists and belongs to this organization
      const vehicle = await storage.getTechnicianVehicle(technicianVehicleId);
      if (!vehicle) {
        return res.status(404).json({ error: 'Technician vehicle not found' });
      }

      // Unmap the vehicle
      const updatedVehicle = await fleetmaticsService.unmapVehicle(technicianVehicleId);

      if (!updatedVehicle) {
        return res.status(500).json({ error: 'Failed to unmap vehicle' });
      }

      return res.status(200).json(updatedVehicle);
    } catch (error) {
      console.error('Error unmapping vehicle:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Get the latest locations for all tracked vehicles
   * GET /api/fleetmatics/locations
   * (Protected route)
   */
  router.get('/locations', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      // Initialize with current organization config
      const initialized = await fleetmaticsService.initialize(organizationId);
      if (!initialized) {
        return res.status(400).json({ error: 'Failed to initialize Fleetmatics service' });
      }

      const vehicles = await fleetmaticsService.getLatestVehicleLocations();
      return res.status(200).json(vehicles);
    } catch (error) {
      console.error('Error fetching vehicle locations:', error);
      return res.status(500).json({ error: 'Internal server error' });
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
      if (isNaN(vehicleId)) {
        return res.status(400).json({ error: 'Invalid vehicle ID' });
      }

      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      // Initialize with current organization config
      const initialized = await fleetmaticsService.initialize(organizationId);
      if (!initialized) {
        return res.status(400).json({ error: 'Failed to initialize Fleetmatics service' });
      }

      // Get start and end dates from query parameters, defaulting to last 24 hours
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string) 
        : new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string) 
        : new Date();

      // Get the vehicle to check permissions and get the Fleetmatics ID
      const vehicle = await storage.getTechnicianVehicle(vehicleId);
      if (!vehicle || !vehicle.fleetmaticsVehicleId) {
        return res.status(404).json({ error: 'Vehicle not found or not mapped to Fleetmatics' });
      }

      // Get the location history from the database
      const history = await storage.getFleetmaticsLocationHistoryByVehicleIdAndTimeRange(
        vehicleId, 
        startDate, 
        endDate
      );

      return res.status(200).json(history);
    } catch (error) {
      console.error('Error fetching vehicle location history:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Trigger manual synchronization with Fleetmatics
   * POST /api/fleetmatics/sync
   * (Protected admin route)
   */
  router.post('/sync', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      // Initialize with current organization config
      const initialized = await fleetmaticsService.initialize(organizationId);
      if (!initialized) {
        return res.status(400).json({ error: 'Failed to initialize Fleetmatics service' });
      }

      const syncResult = await fleetmaticsService.syncVehicleLocations();
      
      return res.status(200).json({
        success: syncResult,
        message: syncResult 
          ? 'Synchronization completed successfully' 
          : 'Synchronization failed or no vehicles to sync'
      });
    } catch (error) {
      console.error('Error syncing with Fleetmatics:', error);
      return res.status(500).json({ error: 'Internal server error' });
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
        return res.status(400).json({ 
          error: 'Latitude, longitude, and radius are required query parameters' 
        });
      }

      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusMiles = parseFloat(radius as string);

      if (isNaN(lat) || isNaN(lng) || isNaN(radiusMiles) || radiusMiles <= 0) {
        return res.status(400).json({ error: 'Invalid coordinates or radius' });
      }

      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      // Get vehicles within radius
      const vehicles = await storage.getVehiclesInArea(lat, lng, radiusMiles);
      
      return res.status(200).json(vehicles);
    } catch (error) {
      console.error('Error finding vehicles in area:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}