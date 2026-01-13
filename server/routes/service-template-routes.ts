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

// Helper to normalize and serialize checklist items
function serializeChecklistItems(items: unknown): string | null {
  if (!items) return null;
  
  // If already a string, check if it's valid JSON and return it
  if (typeof items === 'string') {
    try {
      JSON.parse(items);
      return items; // Already valid JSON string
    } catch {
      return null;
    }
  }
  
  // If it's an array, normalize and stringify
  if (Array.isArray(items)) {
    const normalized = items.map((item: unknown, index: number) => {
      if (typeof item === 'string') {
        return { id: `item-${index}`, text: item, required: true };
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        return {
          id: typeof obj.id === 'string' ? obj.id : `item-${index}`,
          text: typeof obj.text === 'string' ? obj.text : '',
          required: typeof obj.required === 'boolean' ? obj.required : true
        };
      }
      return { id: `item-${index}`, text: '', required: true };
    });
    return JSON.stringify(normalized);
  }
  
  return null;
}

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const requestBody = { ...req.body };
    
    // Normalize and serialize checklistItems
    requestBody.checklistItems = serializeChecklistItems(requestBody.checklistItems);
    
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
    if (requestBody.checklistItems !== undefined) {
      // Normalize and serialize checklistItems
      requestBody.checklistItems = serializeChecklistItems(requestBody.checklistItems);
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
