import { Router } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { isAuthenticated } from "../auth";
import { type User, insertWorkOrderSchema, insertWorkOrderNoteSchema, clients } from "@shared/schema";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

async function deductFromVehicleInventory(
  technicianId: number | null | undefined,
  inventoryItemId: number,
  quantity: number
): Promise<void> {
  if (!technicianId) return;
  try {
    const vehicles = await storage.getTechnicianVehiclesByTechnicianId(technicianId);
    for (const vehicle of vehicles) {
      const vehicleItems = await storage.getVehicleInventoryByVehicleId(vehicle.id);
      const match = vehicleItems.find((vi: any) => vi.inventoryItemId === inventoryItemId);
      if (match) {
        const currentQty = parseFloat(String(match.quantity || "0"));
        const newQty = Math.max(0, currentQty - quantity);
        await storage.updateVehicleInventory(match.id, { quantity: String(newQty) });
        return;
      }
    }
  } catch (error) {
    console.error('Error deducting from vehicle inventory:', error);
  }
}

async function returnToVehicleInventory(
  technicianId: number | null | undefined,
  inventoryItemId: number,
  quantity: number
): Promise<void> {
  if (!technicianId) return;
  try {
    const vehicles = await storage.getTechnicianVehiclesByTechnicianId(technicianId);
    for (const vehicle of vehicles) {
      const vehicleItems = await storage.getVehicleInventoryByVehicleId(vehicle.id);
      const match = vehicleItems.find((vi: any) => vi.inventoryItemId === inventoryItemId);
      if (match) {
        const currentQty = parseFloat(String(match.quantity || "0"));
        await storage.updateVehicleInventory(match.id, { quantity: String(currentQty + quantity) });
        return;
      }
    }
  } catch (error) {
    console.error('Error returning to vehicle inventory:', error);
  }
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`);
    const data = await response.json();
    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      return data.results[0].geometry.location;
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

const router = Router();

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const { category, status, technicianId, projectId, repairId, includeClient } = req.query;
    
    console.log('[Work Orders API] User:', user?.id, 'OrgId:', user?.organizationId, 'Category:', category);
    
    let workOrders = await storage.getWorkOrders(user.organizationId);
    console.log('[Work Orders API] Found', workOrders.length, 'work orders for org', user.organizationId);
    
    if (category && typeof category === 'string') {
      const beforeFilter = workOrders.length;
      workOrders = workOrders.filter(wo => wo.category === category);
      console.log('[Work Orders API] After category filter:', beforeFilter, '->', workOrders.length);
    }
    if (status && typeof status === 'string') {
      workOrders = workOrders.filter(wo => wo.status === status);
    }
    if (technicianId) {
      workOrders = workOrders.filter(wo => wo.technicianId === parseInt(technicianId as string));
    }
    if (projectId) {
      workOrders = workOrders.filter(wo => wo.projectId === parseInt(projectId as string));
    }
    if (repairId) {
      workOrders = workOrders.filter(wo => wo.repairId === parseInt(repairId as string));
    }
    
    // Hydrate client and technician info for maintenance work orders or when explicitly requested
    if (includeClient === 'true' || category === 'maintenance') {
      const technicians = await storage.getTechnicians();
      
      const clientCoordsCache = new Map<number, { lat: number; lng: number } | null>();

      const hydratedWorkOrders = await Promise.all(workOrders.map(async (wo) => {
        const result: Record<string, unknown> = { ...wo };
        
        // Hydrate client info - work_orders.client_id references user.id directly
        if (wo.clientId) {
          const clientUser = await storage.getUser(wo.clientId);
          if (clientUser) {
            let latitude: number | null = null;
            let longitude: number | null = null;

            if (wo.addressLat && wo.addressLng) {
              const parsedLat = parseFloat(wo.addressLat);
              const parsedLng = parseFloat(wo.addressLng);
              if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
                latitude = parsedLat;
                longitude = parsedLng;
              }
            }
            
            if (latitude == null || longitude == null) {
              if (clientCoordsCache.has(clientUser.id)) {
                const cached = clientCoordsCache.get(clientUser.id)!;
                if (cached) {
                  latitude = cached.lat;
                  longitude = cached.lng;
                }
              } else {
                const clientRecords = await db.select().from(clients).where(eq(clients.userId, clientUser.id));
                const clientRecord = clientRecords[0] || null;

                if (clientRecord) {
                  latitude = clientRecord.latitude;
                  longitude = clientRecord.longitude;

                  if (latitude == null && longitude == null && clientUser.address) {
                    const coords = await geocodeAddress(clientUser.address);
                    if (coords) {
                      latitude = coords.lat;
                      longitude = coords.lng;
                      try {
                        await db.update(clients).set({ latitude, longitude }).where(eq(clients.id, clientRecord.id));
                      } catch (e) {
                        console.error('Failed to save geocoded coords:', e);
                      }
                    }
                  }
                } else if (clientUser.address) {
                  const coords = await geocodeAddress(clientUser.address);
                  if (coords) {
                    latitude = coords.lat;
                    longitude = coords.lng;
                  }
                }

                clientCoordsCache.set(clientUser.id, latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null);
              }
            }

            result.client = {
              id: clientUser.id,
              user: { 
                id: clientUser.id, 
                name: clientUser.name, 
                email: clientUser.email, 
                address: clientUser.address,
                phone: clientUser.phone
              },
              latitude,
              longitude
            };
          }
        }
        
        // Hydrate technician info
        if (wo.technicianId) {
          const technician = technicians.find(t => t.id === wo.technicianId);
          if (technician) {
            const techUser = await storage.getUser(technician.userId);
            result.technician = {
              id: technician.id,
              user: techUser ? { 
                id: techUser.id, 
                name: techUser.name, 
                email: techUser.email,
                phone: techUser.phone
              } : null
            };
          }
        }
        
        return result;
      }));
      return res.json(hydratedWorkOrders);
    }
    
    res.json(workOrders);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

router.get('/technician-hours/summary', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const { startDate, endDate, technicianId } = req.query;

    const workOrdersList = await storage.getWorkOrders(user.organizationId);
    
    const techHours: Record<number, {
      technicianId: number;
      totalMinutes: number;
      completedOrders: number;
      activeOrders: number;
      maintenanceVisits: number;
      workOrders: number;
      entries: any[];
    }> = {};

    for (const wo of workOrdersList) {
      if (technicianId && wo.technicianId !== parseInt(technicianId as string)) continue;
      if (!wo.technicianId) continue;

      if (startDate && wo.scheduledDate && wo.scheduledDate < (startDate as string)) continue;
      if (endDate && wo.scheduledDate && wo.scheduledDate > (endDate as string)) continue;

      if (!techHours[wo.technicianId]) {
        techHours[wo.technicianId] = {
          technicianId: wo.technicianId,
          totalMinutes: 0,
          completedOrders: 0,
          activeOrders: 0,
          maintenanceVisits: 0,
          workOrders: 0,
          entries: [],
        };
      }

      const summary = techHours[wo.technicianId];
      if (wo.status === 'completed') summary.completedOrders++;
      if (wo.status === 'in_progress') summary.activeOrders++;
      if (wo.maintenanceOrderId) summary.maintenanceVisits++;
      else summary.workOrders++;

      const timeEntries = await storage.getWorkOrderTimeEntries(wo.id);
      for (const entry of timeEntries) {
        if (entry.duration) {
          summary.totalMinutes += entry.duration;
        }
        summary.entries.push({
          workOrderId: wo.id,
          workOrderTitle: wo.title,
          date: wo.scheduledDate,
          duration: entry.duration,
          clockIn: entry.clockIn,
          clockOut: entry.clockOut,
        });
      }
    }

    res.json(Object.values(techHours));
  } catch (error) {
    console.error('Error fetching technician hours:', error);
    res.status(500).json({ error: 'Failed to fetch technician hours' });
  }
});

router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const workOrder = await storage.getWorkOrder(id);
    
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    const result: Record<string, unknown> = { ...workOrder };
    
    if (workOrder.technicianId) {
      const technicians = await storage.getTechnicians();
      const technician = technicians.find(t => t.id === workOrder.technicianId);
      if (technician) {
        const techUser = await storage.getUser(technician.userId);
        result.technician = {
          id: technician.id,
          user: techUser ? { id: techUser.id, name: techUser.name, email: techUser.email } : null
        };
      }
    }
    
    if (workOrder.projectId) {
      const project = await storage.getProject(workOrder.projectId);
      if (project) {
        result.project = { id: project.id, name: project.name };
      }
    }
    
    if (workOrder.projectPhaseId) {
      const phases = await storage.getProjectPhases(workOrder.projectId || 0);
      const phase = phases.find(p => p.id === workOrder.projectPhaseId);
      if (phase) {
        result.projectPhase = { id: phase.id, name: phase.name };
      }
    }
    
    // Hydrate work order request if linked
    if (workOrder.workOrderRequestId) {
      const request = await storage.getWorkOrderRequest(workOrder.workOrderRequestId);
      if (request) {
        result.workOrderRequest = { id: request.id, title: request.title };
      }
    }
    
    // Hydrate maintenance assignment if linked
    if (workOrder.maintenanceAssignmentId) {
      const assignment = await storage.getMaintenanceAssignment(workOrder.maintenanceAssignmentId);
      if (assignment) {
        result.maintenanceAssignment = { 
          id: assignment.id, 
          date: assignment.date,
          status: assignment.status
        };
      }
    }
    
    // Hydrate repair if linked
    if (workOrder.repairId) {
      const repair = await storage.getRepair(workOrder.repairId);
      if (repair) {
        result.repair = { id: repair.id, issue: repair.issue, description: repair.description };
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching work order:', error);
    res.status(500).json({ error: 'Failed to fetch work order' });
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const requestBody = { ...req.body };
    
    if (requestBody.checklist && Array.isArray(requestBody.checklist)) {
      requestBody.checklist = JSON.stringify(requestBody.checklist);
    }
    
    const validatedData = insertWorkOrderSchema.parse({
      ...requestBody,
      organizationId: user.organizationId,
      createdBy: user.id
    });
    
    const workOrder = await storage.createWorkOrder(validatedData);
    
    // Create initial audit log entry
    await storage.createWorkOrderAuditLog({
      workOrderId: workOrder.id,
      userId: user.id,
      action: 'created',
      fieldName: null,
      oldValue: null,
      newValue: null,
      description: `Work order "${workOrder.title}" created`,
    });
    
    res.status(201).json(workOrder);
  } catch (error) {
    console.error('Error creating work order:', error);
    if (error instanceof ZodError) {
      const humanError = fromZodError(error);
      return res.status(400).json({ error: humanError.message });
    }
    res.status(500).json({ error: 'Failed to create work order' });
  }
});

router.patch('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = req.user as User;
    const existingWorkOrder = await storage.getWorkOrder(id);
    
    if (!existingWorkOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    const requestBody = { ...req.body };
    if (requestBody.checklist && Array.isArray(requestBody.checklist)) {
      requestBody.checklist = JSON.stringify(requestBody.checklist);
    }
    
    const updatedWorkOrder = await storage.updateWorkOrder(id, requestBody);
    
    // Create audit log entries for changed fields
    const fieldsToTrack = ['title', 'description', 'category', 'status', 'priority', 'scheduledDate', 'technicianId', 'projectId', 'projectPhaseId', 'checklist', 'notes'];
    
    for (const field of fieldsToTrack) {
      if (requestBody[field] !== undefined) {
        const oldValue = existingWorkOrder[field as keyof typeof existingWorkOrder];
        const newValue = requestBody[field];
        
        // Compare values (handle null/undefined equivalence)
        const oldStr = oldValue === null || oldValue === undefined ? '' : String(oldValue);
        const newStr = newValue === null || newValue === undefined ? '' : String(newValue);
        
        if (oldStr !== newStr) {
          let action = 'updated';
          let description = `Changed ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
          
          if (field === 'status') {
            action = 'status_changed';
            description = `Status changed from "${oldValue || 'none'}" to "${newValue}"`;
          } else if (field === 'technicianId') {
            action = 'assigned';
            description = newValue ? 'Technician assigned' : 'Technician unassigned';
          } else if (field === 'checklist') {
            action = 'checklist_updated';
            description = 'Checklist updated';
          }
          
          await storage.createWorkOrderAuditLog({
            workOrderId: id,
            userId: user.id,
            action,
            fieldName: field,
            oldValue: oldStr || null,
            newValue: newStr || null,
            description,
          });
        }
      }
    }
    
    res.json(updatedWorkOrder);
  } catch (error) {
    console.error('Error updating work order:', error);
    if (error instanceof ZodError) {
      const humanError = fromZodError(error);
      return res.status(400).json({ error: humanError.message });
    }
    res.status(500).json({ error: 'Failed to update work order' });
  }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteWorkOrder(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting work order:', error);
    res.status(500).json({ error: 'Failed to delete work order' });
  }
});

router.get('/:id/notes', isAuthenticated, async (req, res) => {
  try {
    const workOrderId = parseInt(req.params.id);
    const notes = await storage.getWorkOrderNotes(workOrderId);
    res.json(notes);
  } catch (error) {
    console.error('Error fetching work order notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.post('/:id/notes', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const workOrderId = parseInt(req.params.id);
    
    const validatedData = insertWorkOrderNoteSchema.parse({
      ...req.body,
      workOrderId,
      userId: user.id
    });
    
    const note = await storage.createWorkOrderNote(validatedData);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating work order note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.get('/:id/audit-logs', isAuthenticated, async (req, res) => {
  try {
    const workOrderId = parseInt(req.params.id);
    const logs = await storage.getWorkOrderAuditLogs(workOrderId);
    
    // Enrich logs with user names
    const enrichedLogs = await Promise.all(logs.map(async (log) => {
      const user = await storage.getUser(log.userId);
      return {
        ...log,
        userName: user?.name || 'Unknown User',
      };
    }));
    
    res.json(enrichedLogs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Work Order Items (Parts & Labor) routes
router.get('/:id/items', isAuthenticated, async (req, res) => {
  try {
    const workOrderId = parseInt(req.params.id);
    const items = await storage.getWorkOrderItems(workOrderId);
    res.json(items);
  } catch (error) {
    console.error('Error fetching work order items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

router.post('/:id/items', isAuthenticated, async (req, res) => {
  try {
    const workOrderId = parseInt(req.params.id);
    
    const item = await storage.createWorkOrderItem({
      ...req.body,
      workOrderId
    });
    
    if (item.inventoryItemId && item.itemType === 'part') {
      const invItem = await storage.getInventoryItem(item.inventoryItemId);
      if (invItem) {
        const currentQty = parseFloat(String(invItem.quantity || "0"));
        const usedQty = parseFloat(String(item.quantity || "1"));
        const newQty = Math.max(0, currentQty - usedQty);
        await storage.updateInventoryItem(invItem.id, {
          quantity: String(newQty),
          updatedAt: new Date(),
        });
      }
    }
    
    if (item.inventoryItemId && item.itemType === 'part') {
      const wo = await storage.getWorkOrder(workOrderId);
      await deductFromVehicleInventory(wo?.technicianId, item.inventoryItemId, parseFloat(String(item.quantity || "1")));
    }
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating work order item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

router.patch('/:id/items/:itemId', isAuthenticated, async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    
    const existingItem = await storage.getWorkOrderItem(itemId);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const item = await storage.updateWorkOrderItem(itemId, req.body);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    if (existingItem.itemType === 'part' || item.itemType === 'part') {
      const oldInvId = existingItem.inventoryItemId;
      const newInvId = item.inventoryItemId;
      const oldQty = parseFloat(String(existingItem.quantity || "0"));
      const newQty = parseFloat(String(item.quantity || "0"));
      
      if (oldInvId && oldInvId === newInvId) {
        const delta = newQty - oldQty;
        if (delta !== 0 && !isNaN(delta)) {
          const invItem = await storage.getInventoryItem(oldInvId);
          if (invItem) {
            const currentStock = parseFloat(String(invItem.quantity || "0"));
            await storage.updateInventoryItem(invItem.id, {
              quantity: String(Math.max(0, currentStock - delta)),
              updatedAt: new Date(),
            });
          }
        }
      } else {
        if (oldInvId) {
          const oldInv = await storage.getInventoryItem(oldInvId);
          if (oldInv) {
            const stock = parseFloat(String(oldInv.quantity || "0"));
            if (!isNaN(oldQty)) {
              await storage.updateInventoryItem(oldInv.id, {
                quantity: String(stock + oldQty),
                updatedAt: new Date(),
              });
            }
          }
        }
        if (newInvId) {
          const newInv = await storage.getInventoryItem(newInvId);
          if (newInv) {
            const stock = parseFloat(String(newInv.quantity || "0"));
            if (!isNaN(newQty)) {
              await storage.updateInventoryItem(newInv.id, {
                quantity: String(Math.max(0, stock - newQty)),
                updatedAt: new Date(),
              });
            }
          }
        }
      }
    }
    
    if (existingItem.itemType === 'part' || item.itemType === 'part') {
      const wo = await storage.getWorkOrder(parseInt(req.params.id));
      const oldInvIdVeh = existingItem.inventoryItemId;
      const newInvIdVeh = item.inventoryItemId;
      const oldQtyVeh = parseFloat(String(existingItem.quantity || "0"));
      const newQtyVeh = parseFloat(String(item.quantity || "0"));
      
      if (oldInvIdVeh && oldInvIdVeh === newInvIdVeh) {
        const delta = newQtyVeh - oldQtyVeh;
        if (delta > 0) {
          await deductFromVehicleInventory(wo?.technicianId, oldInvIdVeh, delta);
        } else if (delta < 0) {
          await returnToVehicleInventory(wo?.technicianId, oldInvIdVeh, Math.abs(delta));
        }
      } else {
        if (oldInvIdVeh) {
          await returnToVehicleInventory(wo?.technicianId, oldInvIdVeh, oldQtyVeh);
        }
        if (newInvIdVeh) {
          await deductFromVehicleInventory(wo?.technicianId, newInvIdVeh, newQtyVeh);
        }
      }
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error updating work order item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.delete('/:id/items/:itemId', isAuthenticated, async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    
    const existingItem = await storage.getWorkOrderItem(itemId);
    
    const deleted = await storage.deleteWorkOrderItem(itemId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    if (existingItem?.inventoryItemId && existingItem.itemType === 'part') {
      const invItem = await storage.getInventoryItem(existingItem.inventoryItemId);
      if (invItem) {
        const currentQty = parseFloat(String(invItem.quantity || "0"));
        const returnedQty = parseFloat(String(existingItem.quantity || "1"));
        await storage.updateInventoryItem(invItem.id, {
          quantity: String(currentQty + returnedQty),
          updatedAt: new Date(),
        });
      }
    }
    
    if (existingItem?.inventoryItemId && existingItem.itemType === 'part') {
      const wo = await storage.getWorkOrder(parseInt(req.params.id));
      await returnToVehicleInventory(wo?.technicianId, existingItem.inventoryItemId, parseFloat(String(existingItem.quantity || "1")));
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting work order item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Work Order Time Entries routes
router.get('/:id/time-entries', isAuthenticated, async (req, res) => {
  try {
    const workOrderId = parseInt(req.params.id);
    const entries = await storage.getWorkOrderTimeEntries(workOrderId);
    
    // Enrich with user names
    const enrichedEntries = await Promise.all(entries.map(async (entry) => {
      const user = await storage.getUser(entry.userId);
      return {
        ...entry,
        userName: user?.name || 'Unknown User',
      };
    }));
    
    res.json(enrichedEntries);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

router.post('/:id/time-entries', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const workOrderId = parseInt(req.params.id);
    
    const entry = await storage.createWorkOrderTimeEntry({
      ...req.body,
      workOrderId,
      userId: req.body.userId || user.id,
      clockIn: new Date(req.body.clockIn || new Date())
    });
    
    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating time entry:', error);
    res.status(500).json({ error: 'Failed to create time entry' });
  }
});

router.patch('/:id/time-entries/:entryId', isAuthenticated, async (req, res) => {
  try {
    const entryId = parseInt(req.params.entryId);
    const updateData: Record<string, unknown> = { ...req.body };
    
    // Convert string dates to Date objects if present
    if (updateData.clockIn && typeof updateData.clockIn === 'string') {
      updateData.clockIn = new Date(updateData.clockIn);
    }
    if (updateData.clockOut && typeof updateData.clockOut === 'string') {
      updateData.clockOut = new Date(updateData.clockOut);
    }
    
    // Calculate duration if clockOut is set
    if (updateData.clockOut) {
      const existingEntry = await storage.getWorkOrderTimeEntries(parseInt(req.params.id));
      const entry = existingEntry.find(e => e.id === entryId);
      if (entry) {
        const clockIn = entry.clockIn;
        const clockOut = updateData.clockOut as Date;
        const breakMins = (updateData.breakMinutes as number) || entry.breakMinutes || 0;
        const durationMs = clockOut.getTime() - new Date(clockIn).getTime();
        updateData.duration = Math.round(durationMs / 60000) - breakMins;
      }
    }
    
    const entry = await storage.updateWorkOrderTimeEntry(entryId, updateData);
    
    if (!entry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    console.error('Error updating time entry:', error);
    res.status(500).json({ error: 'Failed to update time entry' });
  }
});

router.delete('/:id/time-entries/:entryId', isAuthenticated, async (req, res) => {
  try {
    const entryId = parseInt(req.params.entryId);
    const deleted = await storage.deleteWorkOrderTimeEntry(entryId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting time entry:', error);
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
});

// Work Order Team Members routes
router.get('/:id/team', isAuthenticated, async (req, res) => {
  try {
    const workOrderId = parseInt(req.params.id);
    const members = await storage.getWorkOrderTeamMembers(workOrderId);
    
    // Enrich with user details
    const enrichedMembers = await Promise.all(members.map(async (member) => {
      const user = await storage.getUser(member.userId);
      return {
        ...member,
        userName: user?.name || 'Unknown User',
        userEmail: user?.email,
        userRole: user?.role,
      };
    }));
    
    res.json(enrichedMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

router.post('/:id/team', isAuthenticated, async (req, res) => {
  try {
    const workOrderId = parseInt(req.params.id);
    
    const member = await storage.createWorkOrderTeamMember({
      ...req.body,
      workOrderId
    });
    
    res.status(201).json(member);
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

router.patch('/:id/team/:memberId', isAuthenticated, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const member = await storage.updateWorkOrderTeamMember(memberId, req.body);
    
    if (!member) {
      return res.status(404).json({ error: 'Team member not found' });
    }
    
    res.json(member);
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

router.delete('/:id/team/:memberId', isAuthenticated, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const deleted = await storage.deleteWorkOrderTeamMember(memberId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Team member not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

// Clock in/out convenience endpoints
router.post('/:id/clock-in', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const workOrderId = parseInt(req.params.id);
    
    const entry = await storage.createWorkOrderTimeEntry({
      workOrderId,
      userId: user.id,
      clockIn: new Date(),
      notes: req.body.notes
    });
    
    res.status(201).json(entry);
  } catch (error) {
    console.error('Error clocking in:', error);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

router.post('/:id/clock-out', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const workOrderId = parseInt(req.params.id);
    
    // Find the open time entry for this user on this work order
    const entries = await storage.getWorkOrderTimeEntries(workOrderId);
    const openEntry = entries.find(e => e.userId === user.id && !e.clockOut);
    
    if (!openEntry) {
      return res.status(400).json({ error: 'No open time entry found. Please clock in first.' });
    }
    
    const clockOut = new Date();
    const clockIn = new Date(openEntry.clockIn);
    const breakMins = req.body.breakMinutes || 0;
    const durationMs = clockOut.getTime() - clockIn.getTime();
    const duration = Math.round(durationMs / 60000) - breakMins;
    
    const updatedEntry = await storage.updateWorkOrderTimeEntry(openEntry.id, {
      clockOut,
      breakMinutes: breakMins,
      duration,
      notes: req.body.notes || openEntry.notes
    });
    
    res.json(updatedEntry);
  } catch (error) {
    console.error('Error clocking out:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

export default router;
