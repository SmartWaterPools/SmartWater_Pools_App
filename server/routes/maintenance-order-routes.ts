import { Router } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { isAuthenticated, requirePermission } from "../auth";
import { type User, insertMaintenanceOrderSchema, maintenanceOrderAuditLogs, users, workOrders } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

const updateMaintenanceOrderSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  serviceTemplateId: z.number().nullable().optional(),
  clientId: z.number().optional(),
  technicianId: z.number().nullable().optional(),
  frequency: z.string().optional(),
  dayOfWeek: z.string().optional(),
  preferredTime: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  pricePerVisit: z.number().nullable().optional(),
  estimatedDuration: z.number().nullable().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
}).strict();

const router = Router();

router.get('/', isAuthenticated, requirePermission('maintenance', 'view'), async (req, res) => {
  try {
    const user = req.user as User;
    const { status, clientId, technicianId } = req.query;

    let orders = await storage.getMaintenanceOrders(user.organizationId);

    if (status && typeof status === 'string') {
      orders = orders.filter(o => o.status === status);
    }
    if (clientId) {
      orders = orders.filter(o => o.clientId === parseInt(clientId as string));
    }
    if (technicianId) {
      orders = orders.filter(o => o.technicianId === parseInt(technicianId as string));
    }

    res.json(orders);
  } catch (error) {
    console.error('Error fetching maintenance orders:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance orders' });
  }
});

router.get('/:id', isAuthenticated, requirePermission('maintenance', 'view'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const order = await storage.getMaintenanceOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Maintenance order not found' });
    }
    const user = req.user as User;
    if (order.organizationId && order.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error fetching maintenance order:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance order' });
  }
});

router.get('/:id/audit-logs', isAuthenticated, requirePermission('maintenance', 'view'), async (req, res) => {
  try {
    const user = req.user as User;
    const id = parseInt(req.params.id);
    
    const order = await storage.getMaintenanceOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Maintenance order not found' });
    }
    
    if (!req.isCrossOrgAdmin && order.organizationId && order.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const logs = await db.select({
      id: maintenanceOrderAuditLogs.id,
      maintenanceOrderId: maintenanceOrderAuditLogs.maintenanceOrderId,
      userId: maintenanceOrderAuditLogs.userId,
      action: maintenanceOrderAuditLogs.action,
      fieldName: maintenanceOrderAuditLogs.fieldName,
      oldValue: maintenanceOrderAuditLogs.oldValue,
      newValue: maintenanceOrderAuditLogs.newValue,
      description: maintenanceOrderAuditLogs.description,
      createdAt: maintenanceOrderAuditLogs.createdAt,
      userName: users.name,
    })
      .from(maintenanceOrderAuditLogs)
      .leftJoin(users, eq(maintenanceOrderAuditLogs.userId, users.id))
      .where(eq(maintenanceOrderAuditLogs.maintenanceOrderId, id))
      .orderBy(desc(maintenanceOrderAuditLogs.createdAt));

    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

router.post('/', isAuthenticated, requirePermission('maintenance', 'create'), async (req, res) => {
  try {
    const user = req.user as User;
    const data = insertMaintenanceOrderSchema.parse({
      ...req.body,
      organizationId: user.organizationId,
      createdBy: user.id,
    });

    const order = await storage.createMaintenanceOrder(data);

    try {
      await db.insert(maintenanceOrderAuditLogs).values({
        maintenanceOrderId: order.id,
        userId: user.id,
        action: 'created',
        description: 'Maintenance order created',
      });
    } catch (logErr) {
      console.error('Failed to create audit log:', logErr);
    }

    res.status(201).json(order);
  } catch (error: any) {
    console.error('Error creating maintenance order:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create maintenance order' });
  }
});

router.patch('/:id', isAuthenticated, requirePermission('maintenance', 'edit'), async (req, res) => {
  try {
    const user = req.user as User;
    const id = parseInt(req.params.id);
    const order = await storage.getMaintenanceOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Maintenance order not found' });
    }
    if (order.organizationId && order.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const validatedData = updateMaintenanceOrderSchema.parse(req.body);
    const updatedOrder = await storage.updateMaintenanceOrder(id, validatedData);

    try {
      if (validatedData.status && validatedData.status !== order.status) {
        await db.insert(maintenanceOrderAuditLogs).values({
          maintenanceOrderId: id,
          userId: user.id,
          action: 'status_changed',
          fieldName: 'status',
          oldValue: order.status,
          newValue: validatedData.status,
          description: `Status changed from ${order.status} to ${validatedData.status}`,
        });
      }

      const fieldsToTrack = ['title', 'description', 'frequency', 'dayOfWeek', 'clientId', 'technicianId', 'pricePerVisit', 'estimatedDuration', 'address', 'startDate', 'endDate'] as const;
      for (const field of fieldsToTrack) {
        if (field in validatedData && field !== 'status') {
          const oldVal = String(order[field] ?? '');
          const newVal = String((validatedData as any)[field] ?? '');
          if (oldVal !== newVal) {
            await db.insert(maintenanceOrderAuditLogs).values({
              maintenanceOrderId: id,
              userId: user.id,
              action: 'updated',
              fieldName: field,
              oldValue: oldVal || null,
              newValue: newVal || null,
              description: `Updated ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
            });
          }
        }
      }
    } catch (logErr) {
      console.error('Failed to create audit log:', logErr);
    }

    res.json(updatedOrder);
  } catch (error: any) {
    console.error('Error updating maintenance order:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update maintenance order' });
  }
});

router.delete('/:id', isAuthenticated, requirePermission('maintenance', 'delete'), async (req, res) => {
  try {
    const user = req.user as User;
    const id = parseInt(req.params.id);
    const order = await storage.getMaintenanceOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Maintenance order not found' });
    }
    if (order.organizationId && order.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      await db.insert(maintenanceOrderAuditLogs).values({
        maintenanceOrderId: id,
        userId: user.id,
        action: 'deleted',
        description: `Maintenance order "${order.title}" deleted`,
      });
    } catch (logErr) {
      console.error('Failed to create audit log:', logErr);
    }

    const deleted = await storage.deleteMaintenanceOrder(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Maintenance order not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting maintenance order:', error);
    res.status(500).json({ error: 'Failed to delete maintenance order' });
  }
});

router.get('/:id/work-orders', isAuthenticated, requirePermission('maintenance', 'view'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const visits = await storage.getWorkOrdersByMaintenanceOrder(id);
    res.json(visits);
  } catch (error) {
    console.error('Error fetching maintenance visits for maintenance order:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance visits' });
  }
});

router.post('/:id/generate-visits', isAuthenticated, requirePermission('maintenance', 'create'), async (req, res) => {
  try {
    const user = req.user as User;
    const id = parseInt(req.params.id);
    const { fromDate, toDate } = req.body;

    const order = await storage.getMaintenanceOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Maintenance order not found' });
    }

    if (order.organizationId && order.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (order.status !== 'active') {
      return res.status(400).json({ error: 'Can only generate visits for active maintenance orders' });
    }

    const startDate = new Date(fromDate || order.startDate);
    const endDate = new Date(toDate || order.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    const existingVisits = await storage.getWorkOrdersByMaintenanceOrder(id);
    const existingDates = new Set(existingVisits.map(v => v.scheduledDate));

    const visitDates = generateRecurringDates(
      startDate,
      endDate,
      order.frequency || 'weekly',
      order.dayOfWeek || undefined
    );

    const newVisits = [];
    for (const date of visitDates) {
      const dateStr = date.toISOString().split('T')[0];
      if (existingDates.has(dateStr)) continue;

      try {
        const workOrder = await storage.createWorkOrder({
          organizationId: user.organizationId,
          title: order.title || 'Maintenance Service',
          description: order.description || null,
          category: 'maintenance',
          status: 'pending',
          priority: 'medium',
          scheduledDate: dateStr,
          technicianId: order.technicianId || null,
          clientId: order.clientId,
          maintenanceOrderId: order.id,
          serviceTemplateId: order.serviceTemplateId || null,
          location: order.address || null,
          estimatedDuration: order.estimatedDuration || null,
        });
        newVisits.push(workOrder);
      } catch (visitError) {
        console.error(`[Generate Visits] Failed to create visit for date ${dateStr}:`, visitError);
      }
    }

    try {
      await db.insert(maintenanceOrderAuditLogs).values({
        maintenanceOrderId: id,
        userId: user.id,
        action: 'visits_generated',
        description: `Generated ${newVisits.length} visit(s)`,
      });
    } catch (logErr) {
      console.error('Failed to create audit log:', logErr);
    }

    res.status(201).json({ generated: newVisits.length, visits: newVisits });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error generating visits:', errorMessage, error);
    res.status(500).json({ error: 'Failed to generate visits', details: errorMessage });
  }
});

router.delete('/:orderId/work-orders/:workOrderId', isAuthenticated, requirePermission('maintenance', 'edit'), async (req, res) => {
  try {
    const user = req.user as User;
    const orderId = parseInt(req.params.orderId);
    const workOrderId = parseInt(req.params.workOrderId);
    
    const workOrder = await db.select().from(workOrders).where(and(eq(workOrders.id, workOrderId), eq(workOrders.maintenanceOrderId, orderId))).limit(1);
    if (!workOrder.length) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    if (!req.isCrossOrgAdmin && workOrder[0].organizationId && workOrder[0].organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await db.delete(workOrders).where(eq(workOrders.id, workOrderId));
    
    try {
      await db.insert(maintenanceOrderAuditLogs).values({
        maintenanceOrderId: orderId,
        userId: user.id,
        action: 'visit_deleted',
        description: `Deleted visit scheduled for ${workOrder[0].scheduledDate || 'unscheduled'}`,
      });
    } catch (logErr) {
      console.error('Failed to create audit log:', logErr);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting visit:', error);
    res.status(500).json({ error: 'Failed to delete visit' });
  }
});

router.patch('/:orderId/work-orders/:workOrderId/reschedule', isAuthenticated, requirePermission('maintenance', 'edit'), async (req, res) => {
  try {
    const user = req.user as User;
    const orderId = parseInt(req.params.orderId);
    const workOrderId = parseInt(req.params.workOrderId);
    const { newDate } = req.body;
    
    if (!newDate) {
      return res.status(400).json({ error: 'New date is required' });
    }
    
    const workOrder = await db.select().from(workOrders).where(and(eq(workOrders.id, workOrderId), eq(workOrders.maintenanceOrderId, orderId))).limit(1);
    if (!workOrder.length) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    if (!req.isCrossOrgAdmin && workOrder[0].organizationId && workOrder[0].organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const oldDate = workOrder[0].scheduledDate || 'unscheduled';
    
    await db.update(workOrders).set({ scheduledDate: newDate }).where(eq(workOrders.id, workOrderId));
    
    try {
      await db.insert(maintenanceOrderAuditLogs).values({
        maintenanceOrderId: orderId,
        userId: user.id,
        action: 'visit_rescheduled',
        fieldName: 'scheduledDate',
        oldValue: oldDate,
        newValue: newDate,
        description: `Rescheduled visit from ${oldDate} to ${newDate}`,
      });
    } catch (logErr) {
      console.error('Failed to create audit log:', logErr);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error rescheduling visit:', error);
    res.status(500).json({ error: 'Failed to reschedule visit' });
  }
});

function generateRecurringDates(
  startDate: Date,
  endDate: Date,
  frequency: string,
  dayOfWeek?: string
): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  const dayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  if (dayOfWeek && dayMap[dayOfWeek.toLowerCase()] !== undefined) {
    const targetDay = dayMap[dayOfWeek.toLowerCase()];
    while (current.getDay() !== targetDay) {
      current.setDate(current.getDate() + 1);
    }
  }

  const dayIntervals: Record<string, number> = {
    weekly: 7,
    bi_weekly: 14,
  };

  const monthIntervals: Record<string, number> = {
    monthly: 1,
    bi_monthly: 2,
    quarterly: 3,
  };

  if (dayIntervals[frequency]) {
    const interval = dayIntervals[frequency];
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + interval);
    }
  } else if (monthIntervals[frequency]) {
    const months = monthIntervals[frequency];
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setMonth(current.getMonth() + months);
    }
  } else {
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
  }

  return dates;
}

export default router;
