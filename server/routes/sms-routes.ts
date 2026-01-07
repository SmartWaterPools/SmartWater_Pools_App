import express, { Request, Response } from 'express';
import { ringCentralService, replaceTemplateVariables } from '../ringcentral-service';
import { storage } from '../storage';
import { db } from '../db';
import { isAuthenticated } from '../auth';
import { type User, smsTemplates, insertSmsTemplateSchema, bazzaMaintenanceAssignments, bazzaRouteStops, bazzaRoutes, users, clients, technicians, organizations } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

const DEFAULT_SMS_TEMPLATES = [
  {
    name: 'On The Way',
    category: 'on_the_way',
    body: 'Hi {{client_name}}, {{tech_name}} is on the way to your location. Estimated arrival: {{eta}}. - {{company_name}}',
    variables: ['client_name', 'tech_name', 'eta', 'company_name'],
    isSystemTemplate: true,
    isActive: true,
  },
  {
    name: 'Job Complete',
    category: 'job_complete',
    body: 'Hi {{client_name}}, your service at {{address}} has been completed by {{tech_name}}. Thank you for choosing {{company_name}}!',
    variables: ['client_name', 'address', 'tech_name', 'company_name'],
    isSystemTemplate: true,
    isActive: true,
  },
  {
    name: 'Appointment Reminder',
    category: 'reminder',
    body: 'Reminder: Your scheduled service with {{company_name}} is tomorrow at {{time}}. See you then!',
    variables: ['company_name', 'time'],
    isSystemTemplate: true,
    isActive: true,
  },
  {
    name: 'Service Delayed',
    category: 'custom',
    body: "Hi {{client_name}}, we're running slightly behind schedule. {{tech_name}} will arrive approximately {{delay}} later than planned. We apologize for any inconvenience.",
    variables: ['client_name', 'tech_name', 'delay'],
    isSystemTemplate: true,
    isActive: true,
  },
];

async function getMaintenanceDetails(maintenanceId: number) {
  const [assignment] = await db.select()
    .from(bazzaMaintenanceAssignments)
    .where(eq(bazzaMaintenanceAssignments.maintenanceId, maintenanceId))
    .limit(1);

  if (!assignment) {
    return null;
  }

  const [routeStop] = await db.select()
    .from(bazzaRouteStops)
    .where(eq(bazzaRouteStops.id, assignment.routeStopId))
    .limit(1);

  if (!routeStop) {
    return null;
  }

  const [route] = await db.select()
    .from(bazzaRoutes)
    .where(eq(bazzaRoutes.id, routeStop.routeId))
    .limit(1);

  const [client] = await db.select()
    .from(clients)
    .where(eq(clients.id, routeStop.clientId))
    .limit(1);

  if (!client) {
    return null;
  }

  const [clientUser] = await db.select()
    .from(users)
    .where(eq(users.id, client.userId))
    .limit(1);

  let technicianUser = null;
  if (route?.technicianId) {
    const [tech] = await db.select()
      .from(technicians)
      .where(eq(technicians.id, route.technicianId))
      .limit(1);
    
    if (tech) {
      const [techUser] = await db.select()
        .from(users)
        .where(eq(users.id, tech.userId))
        .limit(1);
      technicianUser = techUser;
    }
  }

  return {
    assignment,
    routeStop,
    route,
    client,
    clientUser,
    technicianUser,
  };
}

const router = express.Router();

router.get('/connection-status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const status = await ringCentralService.getConnectionStatus(user.organizationId);
    res.json(status);
  } catch (error) {
    console.error('Error checking RingCentral connection status:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

const sendSMSSchema = z.object({
  to: z.string().min(10, 'Phone number is required'),
  message: z.string().min(1, 'Message is required').max(1600, 'Message too long'),
  clientId: z.number().optional(),
  maintenanceId: z.number().optional(),
  repairId: z.number().optional(),
  projectId: z.number().optional(),
  messageType: z.enum(['on_the_way', 'job_complete', 'reminder', 'verification', 'custom']).optional(),
});

router.post('/send', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const validation = sendSMSSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validation.error.errors 
      });
    }

    const { to, message, clientId, maintenanceId, repairId, projectId, messageType } = validation.data;

    const result = await ringCentralService.sendSMS(
      user.organizationId,
      to,
      message,
      {
        clientId,
        maintenanceId,
        repairId,
        projectId,
        messageType,
        sentBy: user.id,
      }
    );

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        externalId: result.externalId,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        messageId: result.messageId,
      });
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

router.get('/messages', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ success: false, messages: [], error: 'Organization not found' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const messages = await ringCentralService.getMessages(user.organizationId, limit, offset);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching SMS messages:', error);
    res.status(500).json({ success: false, messages: [], error: 'Failed to fetch messages' });
  }
});

router.post('/sync', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const result = await ringCentralService.syncMessages(user.organizationId);
    
    if (result.success) {
      res.json({ 
        success: true, 
        synced: result.synced,
        message: `Synced ${result.synced} messages from RingCentral`
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Error syncing SMS messages:', error);
    res.status(500).json({ error: 'Failed to sync messages' });
  }
});

router.get('/phone-numbers', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const result = await ringCentralService.getPhoneNumbers(user.organizationId);
    
    if (result.success) {
      res.json({ phoneNumbers: result.phoneNumbers });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    res.status(500).json({ error: 'Failed to fetch phone numbers' });
  }
});

router.post('/templates', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const validation = insertSmsTemplateSchema.safeParse({
      ...req.body,
      organizationId: user.organizationId,
      createdBy: user.id,
    });

    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validation.error.errors 
      });
    }

    const [template] = await db.insert(smsTemplates).values(validation.data).returning();
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating SMS template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

router.get('/templates', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const templates = await db.select()
      .from(smsTemplates)
      .where(eq(smsTemplates.organizationId, user.organizationId))
      .orderBy(desc(smsTemplates.createdAt));

    res.json(templates);
  } catch (error) {
    console.error('Error fetching SMS templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

router.patch('/templates/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const templateId = parseInt(req.params.id);
    if (isNaN(templateId)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    const [existingTemplate] = await db.select()
      .from(smsTemplates)
      .where(eq(smsTemplates.id, templateId))
      .limit(1);

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existingTemplate.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const partialSchema = insertSmsTemplateSchema.partial();
    const validation = partialSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validation.error.errors 
      });
    }

    const [updatedTemplate] = await db.update(smsTemplates)
      .set({ ...validation.data, updatedAt: new Date() })
      .where(eq(smsTemplates.id, templateId))
      .returning();

    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating SMS template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

router.delete('/templates/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const templateId = parseInt(req.params.id);
    if (isNaN(templateId)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    const [existingTemplate] = await db.select()
      .from(smsTemplates)
      .where(eq(smsTemplates.id, templateId))
      .limit(1);

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existingTemplate.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.delete(smsTemplates).where(eq(smsTemplates.id, templateId));

    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    console.error('Error deleting SMS template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

router.post('/seed-templates', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const existingTemplates = await db.select()
      .from(smsTemplates)
      .where(and(
        eq(smsTemplates.organizationId, user.organizationId),
        eq(smsTemplates.isSystemTemplate, true)
      ));

    const existingCategories = new Set(existingTemplates.map(t => t.category));
    const templatesToInsert = DEFAULT_SMS_TEMPLATES.filter(t => !existingCategories.has(t.category));

    if (templatesToInsert.length === 0) {
      return res.json({ success: true, message: 'Default templates already exist', templatesCreated: 0 });
    }

    const insertedTemplates = await db.insert(smsTemplates)
      .values(templatesToInsert.map(t => ({
        ...t,
        organizationId: user.organizationId,
        createdBy: user.id,
      })))
      .returning();

    res.status(201).json({
      success: true,
      message: `Created ${insertedTemplates.length} default templates`,
      templatesCreated: insertedTemplates.length,
      templates: insertedTemplates,
    });
  } catch (error) {
    console.error('Error seeding SMS templates:', error);
    res.status(500).json({ error: 'Failed to seed templates' });
  }
});

const sendOnTheWaySchema = z.object({
  maintenanceId: z.number(),
  eta: z.string().optional(),
});

router.post('/send-on-the-way', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const validation = sendOnTheWaySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation error', details: validation.error.errors });
    }

    const { maintenanceId, eta } = validation.data;

    const connectionStatus = await ringCentralService.getConnectionStatus(user.organizationId);
    if (!connectionStatus.connected) {
      return res.status(400).json({ error: 'RingCentral not connected' });
    }

    const details = await getMaintenanceDetails(maintenanceId);
    if (!details) {
      return res.status(404).json({ error: 'Maintenance assignment not found' });
    }

    if (!details.clientUser?.phone) {
      return res.status(400).json({ error: 'Client phone number not found' });
    }

    const [org] = await db.select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);

    const [template] = await db.select()
      .from(smsTemplates)
      .where(and(
        eq(smsTemplates.organizationId, user.organizationId),
        eq(smsTemplates.category, 'on_the_way'),
        eq(smsTemplates.isActive, true)
      ))
      .limit(1);

    const templateBody = template?.body || DEFAULT_SMS_TEMPLATES.find(t => t.category === 'on_the_way')!.body;

    const variables: Record<string, string> = {
      client_name: details.clientUser.name || 'Valued Customer',
      tech_name: details.technicianUser?.name || 'Our technician',
      eta: eta || 'shortly',
      company_name: org?.name || 'Our Company',
    };

    const message = replaceTemplateVariables(templateBody, variables);

    const result = await ringCentralService.sendSMS(
      user.organizationId,
      details.clientUser.phone,
      message,
      {
        clientId: details.client.id,
        maintenanceId,
        messageType: 'on_the_way',
        sentBy: user.id,
      }
    );

    if (result.success) {
      res.json({ success: true, messageId: result.messageId, message: 'On the way SMS sent' });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error sending on-the-way SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

const sendJobCompleteSchema = z.object({
  maintenanceId: z.number(),
});

router.post('/send-job-complete', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const validation = sendJobCompleteSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation error', details: validation.error.errors });
    }

    const { maintenanceId } = validation.data;

    const connectionStatus = await ringCentralService.getConnectionStatus(user.organizationId);
    if (!connectionStatus.connected) {
      return res.status(400).json({ error: 'RingCentral not connected' });
    }

    const details = await getMaintenanceDetails(maintenanceId);
    if (!details) {
      return res.status(404).json({ error: 'Maintenance assignment not found' });
    }

    if (!details.clientUser?.phone) {
      return res.status(400).json({ error: 'Client phone number not found' });
    }

    const [org] = await db.select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);

    const [template] = await db.select()
      .from(smsTemplates)
      .where(and(
        eq(smsTemplates.organizationId, user.organizationId),
        eq(smsTemplates.category, 'job_complete'),
        eq(smsTemplates.isActive, true)
      ))
      .limit(1);

    const templateBody = template?.body || DEFAULT_SMS_TEMPLATES.find(t => t.category === 'job_complete')!.body;

    const variables: Record<string, string> = {
      client_name: details.clientUser.name || 'Valued Customer',
      address: details.clientUser.address || 'your location',
      tech_name: details.technicianUser?.name || 'Our technician',
      company_name: org?.name || 'Our Company',
    };

    const message = replaceTemplateVariables(templateBody, variables);

    const result = await ringCentralService.sendSMS(
      user.organizationId,
      details.clientUser.phone,
      message,
      {
        clientId: details.client.id,
        maintenanceId,
        messageType: 'job_complete',
        sentBy: user.id,
      }
    );

    if (result.success) {
      res.json({ success: true, messageId: result.messageId, message: 'Job complete SMS sent' });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error sending job-complete SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

const sendReminderSchema = z.object({
  maintenanceId: z.number(),
});

router.post('/send-reminder', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const validation = sendReminderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation error', details: validation.error.errors });
    }

    const { maintenanceId } = validation.data;

    const connectionStatus = await ringCentralService.getConnectionStatus(user.organizationId);
    if (!connectionStatus.connected) {
      return res.status(400).json({ error: 'RingCentral not connected' });
    }

    const details = await getMaintenanceDetails(maintenanceId);
    if (!details) {
      return res.status(404).json({ error: 'Maintenance assignment not found' });
    }

    if (!details.clientUser?.phone) {
      return res.status(400).json({ error: 'Client phone number not found' });
    }

    const [org] = await db.select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);

    const [template] = await db.select()
      .from(smsTemplates)
      .where(and(
        eq(smsTemplates.organizationId, user.organizationId),
        eq(smsTemplates.category, 'reminder'),
        eq(smsTemplates.isActive, true)
      ))
      .limit(1);

    const templateBody = template?.body || DEFAULT_SMS_TEMPLATES.find(t => t.category === 'reminder')!.body;

    let scheduledTime = 'your scheduled time';
    if (details.assignment.estimatedStartTime) {
      const time = new Date(details.assignment.estimatedStartTime);
      scheduledTime = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    const variables: Record<string, string> = {
      company_name: org?.name || 'Our Company',
      time: scheduledTime,
      client_name: details.clientUser.name || 'Valued Customer',
    };

    const message = replaceTemplateVariables(templateBody, variables);

    const result = await ringCentralService.sendSMS(
      user.organizationId,
      details.clientUser.phone,
      message,
      {
        clientId: details.client.id,
        maintenanceId,
        messageType: 'reminder',
        sentBy: user.id,
      }
    );

    if (result.success) {
      res.json({ success: true, messageId: result.messageId, message: 'Reminder SMS sent' });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error sending reminder SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

export default router;
