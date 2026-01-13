import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { type User, insertServiceTemplateSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

const router = Router();

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const templates = await storage.getServiceTemplates(user.organizationId);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching service templates:', error);
    res.status(500).json({ error: 'Failed to fetch service templates' });
  }
});

router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const template = await storage.getServiceTemplate(id);
    
    if (!template) {
      return res.status(404).json({ error: 'Service template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching service template:', error);
    res.status(500).json({ error: 'Failed to fetch service template' });
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const requestBody = { ...req.body };
    
    if (requestBody.checklistItems && Array.isArray(requestBody.checklistItems)) {
      requestBody.checklistItems = JSON.stringify(requestBody.checklistItems);
    }
    
    const validatedData = insertServiceTemplateSchema.parse({
      ...requestBody,
      organizationId: user.organizationId,
    });
    
    const template = await storage.createServiceTemplate(validatedData);
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating service template:', error);
    if (error instanceof ZodError) {
      const humanError = fromZodError(error);
      return res.status(400).json({ error: humanError.message });
    }
    res.status(500).json({ error: 'Failed to create service template' });
  }
});

router.patch('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existingTemplate = await storage.getServiceTemplate(id);
    
    if (!existingTemplate) {
      return res.status(404).json({ error: 'Service template not found' });
    }
    
    const requestBody = { ...req.body };
    if (requestBody.checklistItems && Array.isArray(requestBody.checklistItems)) {
      requestBody.checklistItems = JSON.stringify(requestBody.checklistItems);
    }
    
    const updatedTemplate = await storage.updateServiceTemplate(id, requestBody);
    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating service template:', error);
    if (error instanceof ZodError) {
      const humanError = fromZodError(error);
      return res.status(400).json({ error: humanError.message });
    }
    res.status(500).json({ error: 'Failed to update service template' });
  }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteServiceTemplate(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Service template not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service template:', error);
    res.status(500).json({ error: 'Failed to delete service template' });
  }
});

export default router;
