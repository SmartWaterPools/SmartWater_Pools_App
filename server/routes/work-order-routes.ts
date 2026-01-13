import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { type User, insertWorkOrderSchema, insertWorkOrderNoteSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

const router = Router();

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const { category, status, technicianId, projectId } = req.query;
    
    let workOrders = await storage.getWorkOrders(user.organizationId);
    
    if (category && typeof category === 'string') {
      workOrders = workOrders.filter(wo => wo.category === category);
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
    
    res.json(workOrders);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const workOrder = await storage.getWorkOrder(id);
    
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    res.json(workOrder);
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
    const existingWorkOrder = await storage.getWorkOrder(id);
    
    if (!existingWorkOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    const requestBody = { ...req.body };
    if (requestBody.checklist && Array.isArray(requestBody.checklist)) {
      requestBody.checklist = JSON.stringify(requestBody.checklist);
    }
    
    const updatedWorkOrder = await storage.updateWorkOrder(id, requestBody);
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

export default router;
