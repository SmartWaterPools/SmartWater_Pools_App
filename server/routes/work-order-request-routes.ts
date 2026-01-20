import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { type User, insertWorkOrderRequestSchema, WORK_ORDER_REQUEST_STATUSES, REQUESTER_TYPES } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

const router = Router();

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const { status, clientId } = req.query;
    
    let requests = await storage.getWorkOrderRequests(user.organizationId);
    
    if (status && typeof status === 'string') {
      requests = requests.filter(r => r.status === status);
    }
    if (clientId) {
      requests = requests.filter(r => r.clientId === parseInt(clientId as string));
    }
    
    res.json(requests);
  } catch (error) {
    console.error('Error fetching work order requests:', error);
    res.status(500).json({ error: 'Failed to fetch work order requests' });
  }
});

router.get('/statuses', isAuthenticated, (req, res) => {
  res.json(WORK_ORDER_REQUEST_STATUSES);
});

router.get('/requester-types', isAuthenticated, (req, res) => {
  res.json(REQUESTER_TYPES);
});

router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const request = await storage.getWorkOrderRequest(id);
    
    if (!request) {
      return res.status(404).json({ error: 'Work order request not found' });
    }
    
    const result: Record<string, unknown> = { ...request };
    
    if (request.clientId) {
      const clients = await storage.getClients();
      const client = clients.find(c => c.id === request.clientId);
      if (client) {
        const clientUser = await storage.getUser(client.userId);
        result.client = {
          id: client.id,
          user: clientUser ? { id: clientUser.id, name: clientUser.name, email: clientUser.email, address: clientUser.address } : null
        };
      }
    }
    
    if (request.requestedBy) {
      const requester = await storage.getUser(request.requestedBy);
      if (requester) {
        result.requester = { id: requester.id, name: requester.name, role: requester.role };
      }
    }
    
    const linkedWorkOrders = await storage.getWorkOrdersByRequest(id);
    result.workOrders = linkedWorkOrders;
    result.workOrderCount = linkedWorkOrders.length;
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching work order request:', error);
    res.status(500).json({ error: 'Failed to fetch work order request' });
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    
    const validatedData = insertWorkOrderRequestSchema.parse({
      ...req.body,
      organizationId: user.organizationId,
      requestedBy: user.id,
      requesterType: req.body.requesterType || (user.role === 'client' ? 'client' : user.role === 'technician' ? 'tech' : 'office')
    });
    
    const request = await storage.createWorkOrderRequest(validatedData);
    
    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating work order request:', error);
    if (error instanceof ZodError) {
      const humanError = fromZodError(error);
      return res.status(400).json({ error: humanError.message });
    }
    res.status(500).json({ error: 'Failed to create work order request' });
  }
});

router.patch('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existingRequest = await storage.getWorkOrderRequest(id);
    
    if (!existingRequest) {
      return res.status(404).json({ error: 'Work order request not found' });
    }
    
    const updatedRequest = await storage.updateWorkOrderRequest(id, req.body);
    
    res.json(updatedRequest);
  } catch (error) {
    console.error('Error updating work order request:', error);
    res.status(500).json({ error: 'Failed to update work order request' });
  }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existingRequest = await storage.getWorkOrderRequest(id);
    
    if (!existingRequest) {
      return res.status(404).json({ error: 'Work order request not found' });
    }
    
    const linkedWorkOrders = await storage.getWorkOrdersByRequest(id);
    if (linkedWorkOrders.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete request with linked work orders',
        workOrderCount: linkedWorkOrders.length
      });
    }
    
    await storage.deleteWorkOrderRequest(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting work order request:', error);
    res.status(500).json({ error: 'Failed to delete work order request' });
  }
});

router.get('/:id/work-orders', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const workOrders = await storage.getWorkOrdersByRequest(id);
    res.json(workOrders);
  } catch (error) {
    console.error('Error fetching work orders for request:', error);
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

export default router;
