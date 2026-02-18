/**
 * Inventory Management API Routes
 * 
 * This file contains routes for managing inventory items, warehouses,
 * technician vehicles, and inventory transfers.
 */
import { Router, Request, Response } from 'express';
import { isAuthenticated, isAdmin, checkOrganizationAccess, requirePermission } from '../auth';
import { IStorage } from '../storage';
import * as z from 'zod';

export default function registerInventoryRoutes(router: Router, storage: IStorage) {
  /**
   * Get inventory summary statistics
   * GET /api/inventory/summary
   */
  router.get('/summary', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      const organizationId = req.user.organizationId;
      
      const items = await storage.getInventoryItemsByOrganizationId(organizationId);
      const warehouses = await storage.getWarehousesByOrganizationId(organizationId);
      const vehicles = await storage.getTechnicianVehiclesByOrganizationId(organizationId);
      
      const lowStockItems = items.filter((item: any) => {
        const qty = parseFloat(String(item.quantity || "0"));
        const minStock = item.minimumStock || 0;
        const reorderPoint = item.reorderPoint || 0;
        const threshold = Math.max(minStock, reorderPoint);
        return threshold > 0 && qty <= threshold;
      });
      
      const transfers = await storage.getInventoryTransfersByStatusAndOrganization('pending', organizationId);
      
      const summary = {
        totalItems: items.length,
        totalWarehouses: warehouses.length,
        totalVehicles: vehicles.length,
        lowStockItems: lowStockItems.length,
        pendingTransfers: transfers.length
      };
      
      res.json(summary);
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
      res.status(500).json({ error: 'Failed to fetch inventory summary' });
    }
  });
  /**
   * Get all inventory items
   * GET /api/inventory/items
   */
  router.get('/items', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      // Only return items for the user's organization
      const organizationId = req.user.organizationId;
      const items = await storage.getInventoryItemsByOrganizationId(organizationId);
      res.json(items);
    } catch (error: any) {
      console.error('Error fetching inventory items:', error);
      res.status(500).json({ error: 'Failed to fetch inventory items' });
    }
  });

  /**
   * Get inventory item by ID
   * GET /api/inventory/items/:id
   */
  router.get('/items/:id', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const item = await storage.getInventoryItem(id);
      if (!item) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      res.json(item);
    } catch (error: any) {
      console.error('Error fetching inventory item:', error);
      res.status(500).json({ error: 'Failed to fetch inventory item' });
    }
  });

  /**
   * Create a new inventory item
   * POST /api/inventory/items
   */
  router.post('/items', isAuthenticated, isAdmin, requirePermission('inventory', 'create'), async (req: Request, res: Response) => {
    try {
      // Validate request body
      const item = {
        ...req.body,
        organizationId: req.user.organizationId
      };
      
      // Create the inventory item
      const newItem = await storage.createInventoryItem(item);
      res.status(201).json(newItem);
    } catch (error: any) {
      console.error('Error creating inventory item:', error);
      res.status(500).json({ error: 'Failed to create inventory item' });
    }
  });

  /**
   * Update an inventory item
   * PATCH /api/inventory/items/:id
   */
  router.patch('/items/:id', isAuthenticated, isAdmin, requirePermission('inventory', 'edit'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const item = await storage.getInventoryItem(id);
      if (!item) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      // Update the inventory item
      const updatedItem = await storage.updateInventoryItem(id, req.body);
      res.json(updatedItem);
    } catch (error: any) {
      console.error('Error updating inventory item:', error);
      res.status(500).json({ error: 'Failed to update inventory item' });
    }
  });

  /**
   * Delete an inventory item
   * DELETE /api/inventory/items/:id
   */
  router.delete('/items/:id', isAuthenticated, isAdmin, requirePermission('inventory', 'delete'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const item = await storage.getInventoryItem(id);
      if (!item) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      // Delete the inventory item
      const success = await storage.deleteInventoryItem(id);
      if (!success) {
        return res.status(500).json({ error: 'Failed to delete inventory item' });
      }

      res.status(204).end();
    } catch (error: any) {
      console.error('Error deleting inventory item:', error);
      res.status(500).json({ error: 'Failed to delete inventory item' });
    }
  });

  /**
   * Get inventory items by category
   * GET /api/inventory/items/category/:category
   */
  router.get('/items/category/:category', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      const category = req.params.category;
      const items = await storage.getInventoryItemsByCategory(category);
      res.json(items);
    } catch (error: any) {
      console.error('Error fetching inventory items by category:', error);
      res.status(500).json({ error: 'Failed to fetch inventory items by category' });
    }
  });

  /**
   * Get low stock inventory items
   * GET /api/inventory/items/low-stock
   */
  router.get('/items/low-stock', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      const organizationId = req.user.organizationId;
      const allItems = await storage.getInventoryItemsByOrganizationId(organizationId);
      const items = allItems.filter((item: any) => {
        const qty = parseFloat(String(item.quantity || "0"));
        const minStock = item.minimumStock || 0;
        const reorderPoint = item.reorderPoint || 0;
        const threshold = Math.max(minStock, reorderPoint);
        return threshold > 0 && qty <= threshold;
      });
      res.json(items);
    } catch (error: any) {
      console.error('Error fetching low stock items:', error);
      res.status(500).json({ error: 'Failed to fetch low stock items' });
    }
  });

  /**
   * Get all warehouses
   * GET /api/inventory/warehouses
   */
  router.get('/warehouses', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      // Only return warehouses for the user's organization
      const organizationId = req.user.organizationId;
      const warehouses = await storage.getWarehousesByOrganizationId(organizationId);
      res.json(warehouses);
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
      res.status(500).json({ error: 'Failed to fetch warehouses' });
    }
  });

  /**
   * Get warehouse by ID
   * GET /api/inventory/warehouses/:id
   */
  router.get('/warehouses/:id', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const warehouse = await storage.getWarehouse(id);
      if (!warehouse) {
        return res.status(404).json({ error: 'Warehouse not found' });
      }

      res.json(warehouse);
    } catch (error: any) {
      console.error('Error fetching warehouse:', error);
      res.status(500).json({ error: 'Failed to fetch warehouse' });
    }
  });

  /**
   * Create a new warehouse
   * POST /api/inventory/warehouses
   */
  router.post('/warehouses', isAuthenticated, isAdmin, requirePermission('inventory', 'create'), async (req: Request, res: Response) => {
    try {
      // Validate request body
      const warehouse = {
        ...req.body,
        organizationId: req.user.organizationId
      };
      
      // Create the warehouse
      const newWarehouse = await storage.createWarehouse(warehouse);
      res.status(201).json(newWarehouse);
    } catch (error: any) {
      console.error('Error creating warehouse:', error);
      res.status(500).json({ error: 'Failed to create warehouse' });
    }
  });

  /**
   * Update a warehouse
   * PATCH /api/inventory/warehouses/:id
   */
  router.patch('/warehouses/:id', isAuthenticated, isAdmin, requirePermission('inventory', 'edit'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const warehouse = await storage.getWarehouse(id);
      if (!warehouse) {
        return res.status(404).json({ error: 'Warehouse not found' });
      }

      // Update the warehouse
      const updatedWarehouse = await storage.updateWarehouse(id, req.body);
      res.json(updatedWarehouse);
    } catch (error: any) {
      console.error('Error updating warehouse:', error);
      res.status(500).json({ error: 'Failed to update warehouse' });
    }
  });

  /**
   * Delete a warehouse
   * DELETE /api/inventory/warehouses/:id
   */
  router.delete('/warehouses/:id', isAuthenticated, isAdmin, requirePermission('inventory', 'delete'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const warehouse = await storage.getWarehouse(id);
      if (!warehouse) {
        return res.status(404).json({ error: 'Warehouse not found' });
      }

      // Delete the warehouse
      const success = await storage.deleteWarehouse(id);
      if (!success) {
        return res.status(500).json({ error: 'Failed to delete warehouse' });
      }

      res.status(204).end();
    } catch (error: any) {
      console.error('Error deleting warehouse:', error);
      res.status(500).json({ error: 'Failed to delete warehouse' });
    }
  });

  /**
   * Get all technician vehicles
   * GET /api/inventory/technician-vehicles
   */
  router.get('/technician-vehicles', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      // Only return vehicles for the user's organization
      const organizationId = req.user.organizationId;
      const vehicles = await storage.getTechnicianVehiclesByOrganizationId(organizationId);
      res.json(vehicles);
    } catch (error: any) {
      console.error('Error fetching technician vehicles:', error);
      res.status(500).json({ error: 'Failed to fetch technician vehicles' });
    }
  });

  /**
   * Get technician vehicle by ID
   * GET /api/inventory/technician-vehicles/:id
   */
  router.get('/technician-vehicles/:id', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const vehicle = await storage.getTechnicianVehicle(id);
      if (!vehicle) {
        return res.status(404).json({ error: 'Technician vehicle not found' });
      }

      res.json(vehicle);
    } catch (error: any) {
      console.error('Error fetching technician vehicle:', error);
      res.status(500).json({ error: 'Failed to fetch technician vehicle' });
    }
  });

  /**
   * Get technician vehicles by technician ID
   * GET /api/inventory/technician-vehicles/technician/:id
   */
  router.get('/technician-vehicles/technician/:id', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      const technicianId = parseInt(req.params.id);
      if (isNaN(technicianId)) {
        return res.status(400).json({ error: 'Invalid technician ID format' });
      }

      const vehicles = await storage.getTechnicianVehiclesByTechnicianId(technicianId);
      res.json(vehicles);
    } catch (error: any) {
      console.error('Error fetching technician vehicles:', error);
      res.status(500).json({ error: 'Failed to fetch technician vehicles' });
    }
  });

  /**
   * Create a new technician vehicle
   * POST /api/inventory/technician-vehicles
   */
  router.post('/technician-vehicles', isAuthenticated, isAdmin, requirePermission('inventory', 'create'), async (req: Request, res: Response) => {
    try {
      // Add organization ID to the vehicle data
      const vehicle = {
        ...req.body,
        organizationId: req.user.organizationId
      };
      
      // Create the technician vehicle
      const newVehicle = await storage.createTechnicianVehicle(vehicle);
      res.status(201).json(newVehicle);
    } catch (error: any) {
      console.error('Error creating technician vehicle:', error);
      res.status(500).json({ error: 'Failed to create technician vehicle' });
    }
  });

  /**
   * Update a technician vehicle
   * PATCH /api/inventory/technician-vehicles/:id
   */
  router.patch('/technician-vehicles/:id', isAuthenticated, isAdmin, requirePermission('inventory', 'edit'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const vehicle = await storage.getTechnicianVehicle(id);
      if (!vehicle) {
        return res.status(404).json({ error: 'Technician vehicle not found' });
      }

      // Update the technician vehicle
      const updatedVehicle = await storage.updateTechnicianVehicle(id, req.body);
      res.json(updatedVehicle);
    } catch (error: any) {
      console.error('Error updating technician vehicle:', error);
      res.status(500).json({ error: 'Failed to update technician vehicle' });
    }
  });

  /**
   * Delete a technician vehicle
   * DELETE /api/inventory/technician-vehicles/:id
   */
  router.delete('/technician-vehicles/:id', isAuthenticated, isAdmin, requirePermission('inventory', 'delete'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const vehicle = await storage.getTechnicianVehicle(id);
      if (!vehicle) {
        return res.status(404).json({ error: 'Technician vehicle not found' });
      }

      // Delete the technician vehicle
      const success = await storage.deleteTechnicianVehicle(id);
      if (!success) {
        return res.status(500).json({ error: 'Failed to delete technician vehicle' });
      }

      res.status(204).end();
    } catch (error: any) {
      console.error('Error deleting technician vehicle:', error);
      res.status(500).json({ error: 'Failed to delete technician vehicle' });
    }
  });

  /**
   * Get warehouse inventory
   * GET /api/inventory/warehouse-inventory/:warehouseId
   */
  router.get('/warehouse-inventory/:warehouseId', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      const warehouseId = parseInt(req.params.warehouseId);
      if (isNaN(warehouseId)) {
        return res.status(400).json({ error: 'Invalid warehouse ID format' });
      }

      const inventory = await storage.getWarehouseInventoryByWarehouseId(warehouseId);
      res.json(inventory);
    } catch (error: any) {
      console.error('Error fetching warehouse inventory:', error);
      res.status(500).json({ error: 'Failed to fetch warehouse inventory' });
    }
  });

  /**
   * Create warehouse inventory
   * POST /api/inventory/warehouse-inventory
   */
  router.post('/warehouse-inventory', isAuthenticated, isAdmin, requirePermission('inventory', 'create'), async (req: Request, res: Response) => {
    try {
      // Add organization ID to the inventory data
      const inventory = {
        ...req.body,
        organizationId: req.user.organizationId
      };
      
      const newInventory = await storage.createWarehouseInventory(inventory);
      res.status(201).json(newInventory);
    } catch (error: any) {
      console.error('Error creating warehouse inventory:', error);
      res.status(500).json({ error: 'Failed to create warehouse inventory' });
    }
  });

  /**
   * Update warehouse inventory
   * PATCH /api/inventory/warehouse-inventory/:id
   */
  router.patch('/warehouse-inventory/:id', isAuthenticated, isAdmin, requirePermission('inventory', 'edit'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const inventory = await storage.getWarehouseInventory(id);
      if (!inventory) {
        return res.status(404).json({ error: 'Warehouse inventory not found' });
      }

      const updatedInventory = await storage.updateWarehouseInventory(id, req.body);
      res.json(updatedInventory);
    } catch (error: any) {
      console.error('Error updating warehouse inventory:', error);
      res.status(500).json({ error: 'Failed to update warehouse inventory' });
    }
  });

  /**
   * Get vehicle inventory
   * GET /api/inventory/vehicle-inventory/:vehicleId
   */
  router.get('/vehicle-inventory/:vehicleId', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);
      if (isNaN(vehicleId)) {
        return res.status(400).json({ error: 'Invalid vehicle ID format' });
      }

      const inventory = await storage.getVehicleInventoryByVehicleId(vehicleId);
      res.json(inventory);
    } catch (error: any) {
      console.error('Error fetching vehicle inventory:', error);
      res.status(500).json({ error: 'Failed to fetch vehicle inventory' });
    }
  });

  /**
   * Create vehicle inventory
   * POST /api/inventory/vehicle-inventory
   */
  router.post('/vehicle-inventory', isAuthenticated, isAdmin, requirePermission('inventory', 'create'), async (req: Request, res: Response) => {
    try {
      // Add organization ID to the inventory data
      const inventory = {
        ...req.body,
        organizationId: req.user.organizationId
      };
      
      const newInventory = await storage.createVehicleInventory(inventory);
      res.status(201).json(newInventory);
    } catch (error: any) {
      console.error('Error creating vehicle inventory:', error);
      res.status(500).json({ error: 'Failed to create vehicle inventory' });
    }
  });

  /**
   * Update vehicle inventory
   * PATCH /api/inventory/vehicle-inventory/:id
   */
  router.patch('/vehicle-inventory/:id', isAuthenticated, isAdmin, requirePermission('inventory', 'edit'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const inventory = await storage.getVehicleInventory(id);
      if (!inventory) {
        return res.status(404).json({ error: 'Vehicle inventory not found' });
      }

      const updatedInventory = await storage.updateVehicleInventory(id, req.body);
      res.json(updatedInventory);
    } catch (error: any) {
      console.error('Error updating vehicle inventory:', error);
      res.status(500).json({ error: 'Failed to update vehicle inventory' });
    }
  });

  /**
   * Get all inventory transfers
   * GET /api/inventory/transfers
   */
  router.get('/transfers', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      // Only return transfers for the user's organization
      const organizationId = req.user.organizationId;
      const transfers = await storage.getInventoryTransfersByOrganizationId(organizationId);
      res.json(transfers);
    } catch (error: any) {
      console.error('Error fetching inventory transfers:', error);
      res.status(500).json({ error: 'Failed to fetch inventory transfers' });
    }
  });

  /**
   * Get inventory transfer by ID
   * GET /api/inventory/transfers/:id
   */
  router.get('/transfers/:id', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const transfer = await storage.getInventoryTransfer(id);
      if (!transfer) {
        return res.status(404).json({ error: 'Inventory transfer not found' });
      }

      res.json(transfer);
    } catch (error: any) {
      console.error('Error fetching inventory transfer:', error);
      res.status(500).json({ error: 'Failed to fetch inventory transfer' });
    }
  });

  /**
   * Create a new inventory transfer
   * POST /api/inventory/transfers
   */
  router.post('/transfers', isAuthenticated, requirePermission('inventory', 'create'), async (req: Request, res: Response) => {
    try {
      // Get user ID from session
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Prepare transfer data
      const transferData = {
        ...req.body,
        requestedByUserId: userId,
        status: 'pending',
        organizationId: req.user.organizationId,
        requestDate: new Date()
      };
      
      // Create the transfer
      const newTransfer = await storage.createInventoryTransfer(transferData);
      res.status(201).json(newTransfer);
    } catch (error: any) {
      console.error('Error creating inventory transfer:', error);
      res.status(500).json({ error: 'Failed to create inventory transfer' });
    }
  });

  /**
   * Update inventory transfer status
   * PATCH /api/inventory/transfers/:id/status
   */
  router.patch('/transfers/:id/status', isAuthenticated, requirePermission('inventory', 'edit'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const { status } = req.body;
      if (!status || !['pending', 'in_transit', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const transfer = await storage.getInventoryTransfer(id);
      if (!transfer) {
        return res.status(404).json({ error: 'Inventory transfer not found' });
      }

      // Update transfer data
      const updateData: any = { 
        status,
        updatedAt: new Date()
      };

      // If completing the transfer, set completion date and completedByUserId
      if (status === 'completed') {
        updateData.completionDate = new Date();
        updateData.completedByUserId = (req.user as any)?.id;
        
        // Process the transfer (update inventory quantities)
        await storage.completeInventoryTransfer(id, (req.user as any)?.id);
      }

      // Update the transfer
      const updatedTransfer = await storage.updateInventoryTransfer(id, updateData);
      res.json(updatedTransfer);
    } catch (error: any) {
      console.error('Error updating inventory transfer status:', error);
      res.status(500).json({ error: 'Failed to update inventory transfer status' });
    }
  });

  /**
   * Get inventory transfers by status
   * GET /api/inventory/transfers/status/:status
   */
  router.get('/transfers/status/:status', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      const status = req.params.status;
      if (!['pending', 'in_transit', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Include organization ID filter
      const organizationId = req.user.organizationId;
      const transfers = await storage.getInventoryTransfersByStatusAndOrganization(
        status as any,
        organizationId
      );
      res.json(transfers);
    } catch (error: any) {
      console.error('Error fetching inventory transfers by status:', error);
      res.status(500).json({ error: 'Failed to fetch inventory transfers by status' });
    }
  });

  /**
   * Get inventory transfers by date range
   * GET /api/inventory/transfers/date-range
   */
  router.get('/transfers/date-range', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start and end dates are required' });
      }

      // Include organization ID filter
      const organizationId = req.user.organizationId;
      const transfers = await storage.getInventoryTransfersByDateAndOrganization(
        new Date(startDate as string),
        new Date(endDate as string),
        organizationId
      );
      res.json(transfers);
    } catch (error: any) {
      console.error('Error fetching inventory transfers by date range:', error);
      res.status(500).json({ error: 'Failed to fetch inventory transfers by date range' });
    }
  });

  /**
   * Create inventory transfer items
   * POST /api/inventory/transfer-items
   */
  router.post('/transfer-items', isAuthenticated, requirePermission('inventory', 'create'), async (req: Request, res: Response) => {
    try {
      const { transferId, items } = req.body;
      
      if (!transferId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Transfer ID and items array are required' });
      }

      const transfer = await storage.getInventoryTransfer(transferId);
      if (!transfer) {
        return res.status(404).json({ error: 'Inventory transfer not found' });
      }

      // Verify transfer belongs to user's organization
      if (transfer.organizationId !== req.user.organizationId) {
        return res.status(403).json({ 
          error: 'You do not have permission to add items to this transfer' 
        });
      }
      
      // Create transfer items
      const createdItems = [];
      for (const item of items) {
        const newItem = await storage.createInventoryTransferItem({
          ...item,
          transferId
        });
        createdItems.push(newItem);
      }

      res.status(201).json(createdItems);
    } catch (error: any) {
      console.error('Error creating inventory transfer items:', error);
      res.status(500).json({ error: 'Failed to create inventory transfer items' });
    }
  });

  /**
   * Get inventory transfer items by transfer ID
   * GET /api/inventory/transfer-items/:transferId
   */
  router.get('/transfer-items/:transferId', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      const transferId = parseInt(req.params.transferId);
      if (isNaN(transferId)) {
        return res.status(400).json({ error: 'Invalid transfer ID format' });
      }

      // First verify transfer belongs to user's organization
      const transfer = await storage.getInventoryTransfer(transferId);
      if (!transfer) {
        return res.status(404).json({ error: 'Inventory transfer not found' });
      }

      // Verify transfer belongs to user's organization
      if (transfer.organizationId !== req.user.organizationId) {
        return res.status(403).json({ 
          error: 'You do not have permission to view items for this transfer' 
        });
      }

      const items = await storage.getInventoryTransferItemsByTransferId(transferId);
      res.json(items);
    } catch (error: any) {
      console.error('Error fetching inventory transfer items:', error);
      res.status(500).json({ error: 'Failed to fetch inventory transfer items' });
    }
  });

  /**
   * Create inventory adjustment
   * POST /api/inventory/adjustments
   */
  router.post('/adjustments', isAuthenticated, isAdmin, requirePermission('inventory', 'create'), async (req: Request, res: Response) => {
    try {
      // Get user ID from session
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Prepare adjustment data
      const adjustmentData = {
        ...req.body,
        performedByUserId: userId,
        organizationId: req.user.organizationId,
        adjustmentDate: new Date()
      };
      
      // Create the adjustment
      const newAdjustment = await storage.createInventoryAdjustment(adjustmentData);
      res.status(201).json(newAdjustment);
    } catch (error: any) {
      console.error('Error creating inventory adjustment:', error);
      res.status(500).json({ error: 'Failed to create inventory adjustment' });
    }
  });

  /**
   * Get all inventory adjustments
   * GET /api/inventory/adjustments
   */
  router.get('/adjustments', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      // Only return adjustments for the user's organization
      const organizationId = req.user.organizationId;
      const adjustments = await storage.getInventoryAdjustmentsByOrganizationId(organizationId);
      res.json(adjustments);
    } catch (error: any) {
      console.error('Error fetching inventory adjustments:', error);
      res.status(500).json({ error: 'Failed to fetch inventory adjustments' });
    }
  });

  /**
   * Get inventory adjustments by date range
   * GET /api/inventory/adjustments/date-range
   */
  router.get('/adjustments/date-range', isAuthenticated, requirePermission('inventory', 'view'), async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start and end dates are required' });
      }

      // Include organization ID filter
      const organizationId = req.user.organizationId;
      const adjustments = await storage.getInventoryAdjustmentsByDateAndOrganization(
        new Date(startDate as string),
        new Date(endDate as string),
        organizationId
      );
      res.json(adjustments);
    } catch (error: any) {
      console.error('Error fetching inventory adjustments by date range:', error);
      res.status(500).json({ error: 'Failed to fetch inventory adjustments by date range' });
    }
  });

  return router;
}