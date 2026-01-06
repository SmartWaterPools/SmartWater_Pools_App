import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../auth';
import { syncGmailEmails, getGmailConnectionStatus } from '../services/email-sync-service';
import type { UserTokens } from '../services/gmail-client';
import { sendGmailMessage } from '../services/gmail-client';
import { 
  sendAppointmentReminder,
  sendProjectUpdate,
  sendRepairStatusUpdate,
  sendClientPortalEmail,
  sendInternalAlert,
  sendMarketingEmail
} from '../services/notification-email-service';
import { z } from 'zod';

const router = Router();

router.get('/api/emails', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const emails = await storage.getEmails(user.organizationId, limit, offset);
    res.json(emails);
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

router.get('/api/emails/by-project/:projectId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const projectId = parseInt(req.params.projectId);
    
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const client = await storage.getUser(project.clientId);
    if (!client || client.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const links = await storage.getEmailLinksByProject(projectId);
    
    const emails = await Promise.all(
      links.map(async (link) => {
        const email = await storage.getEmail(link.emailId);
        return email ? { ...email, linkInfo: link } : null;
      })
    );
    
    res.json(emails.filter(Boolean));
  } catch (error) {
    console.error('Error fetching project emails:', error);
    res.status(500).json({ error: 'Failed to fetch project emails' });
  }
});

router.get('/api/emails/by-repair/:repairId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const repairId = parseInt(req.params.repairId);
    
    const repair = await storage.getRepair(repairId);
    if (!repair) {
      return res.status(404).json({ error: 'Repair not found' });
    }
    
    const client = await storage.getUser(repair.clientId);
    if (!client || client.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const links = await storage.getEmailLinksByRepair(repairId);
    
    const emails = await Promise.all(
      links.map(async (link) => {
        const email = await storage.getEmail(link.emailId);
        return email ? { ...email, linkInfo: link } : null;
      })
    );
    
    res.json(emails.filter(Boolean));
  } catch (error) {
    console.error('Error fetching repair emails:', error);
    res.status(500).json({ error: 'Failed to fetch repair emails' });
  }
});

router.get('/api/emails/by-client/:clientId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const clientId = parseInt(req.params.clientId);
    
    const client = await storage.getUser(clientId);
    if (!client || client.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const links = await storage.getEmailLinksByClient(clientId);
    
    const emails = await Promise.all(
      links.map(async (link) => {
        const email = await storage.getEmail(link.emailId);
        return email ? { ...email, linkInfo: link } : null;
      })
    );
    
    res.json(emails.filter(Boolean));
  } catch (error) {
    console.error('Error fetching client emails:', error);
    res.status(500).json({ error: 'Failed to fetch client emails' });
  }
});

router.get('/api/emails/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const email = await storage.getEmail(id);
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    const links = await storage.getEmailLinksByEmail(id);
    res.json({ ...email, links });
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

router.post('/api/emails/sync', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const providerId = req.body.providerId;
    
    if (!providerId) {
      return res.status(400).json({ error: 'Provider ID is required' });
    }
    
    const userTokens: UserTokens | undefined = user.gmailAccessToken ? {
      userId: user.id,
      gmailAccessToken: user.gmailAccessToken,
      gmailRefreshToken: user.gmailRefreshToken,
      gmailTokenExpiresAt: user.gmailTokenExpiresAt,
      gmailConnectedEmail: user.gmailConnectedEmail
    } : undefined;
    
    const result = await syncGmailEmails(providerId, user.organizationId, 50, userTokens);
    res.json(result);
  } catch (error) {
    console.error('Error syncing emails:', error);
    res.status(500).json({ error: 'Failed to sync emails' });
  }
});

router.get('/api/emails/connection-status/gmail', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    // Check if user has Gmail tokens stored from Google OAuth login
    if (user.gmailAccessToken && user.gmailRefreshToken) {
      res.json({
        connected: true,
        email: user.gmailConnectedEmail || user.email,
        source: 'google_oauth',
        hasRefreshToken: !!user.gmailRefreshToken,
        tokenExpiresAt: user.gmailTokenExpiresAt
      });
    } else {
      // Fall back to checking Replit connector (for backwards compatibility)
      const status = await getGmailConnectionStatus();
      res.json(status);
    }
  } catch (error) {
    console.error('Error checking Gmail connection:', error);
    res.status(500).json({ connected: false, error: 'Failed to check connection' });
  }
});

router.get('/api/emails/connection-status/outlook', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    // Check if user has Outlook tokens stored
    if (user.outlookAccessToken && user.outlookRefreshToken) {
      res.json({
        connected: true,
        email: user.outlookConnectedEmail || user.email,
        source: 'microsoft_oauth',
        hasRefreshToken: !!user.outlookRefreshToken,
        tokenExpiresAt: user.outlookTokenExpiresAt
      });
    } else {
      res.json({ connected: false });
    }
  } catch (error) {
    console.error('Error checking Outlook connection:', error);
    res.status(500).json({ connected: false, error: 'Failed to check connection' });
  }
});

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  isHtml: z.boolean().optional().default(false)
});

router.post('/api/emails/send', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validation = sendEmailSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid email data', details: validation.error.errors });
    }

    const { to, subject, body, isHtml } = validation.data;
    const result = await sendGmailMessage(to, subject, body, isHtml);
    
    if (!result) {
      return res.status(500).json({ error: 'Failed to send email' });
    }
    
    res.json({ success: true, messageId: result.id });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

router.post('/api/emails/:id/link', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const emailId = parseInt(req.params.id);
    const { linkType, projectId, repairId, clientId, maintenanceId } = req.body;
    
    if (!linkType) {
      return res.status(400).json({ error: 'Link type is required' });
    }
    
    const link = await storage.createEmailLink({
      emailId,
      linkType,
      projectId: projectId || null,
      repairId: repairId || null,
      clientId: clientId || null,
      maintenanceId: maintenanceId || null,
      isAutoLinked: false
    });
    
    res.json(link);
  } catch (error) {
    console.error('Error linking email:', error);
    res.status(500).json({ error: 'Failed to link email' });
  }
});

router.delete('/api/emails/link/:linkId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const linkId = parseInt(req.params.linkId);
    const success = await storage.deleteEmailLink(linkId);
    
    if (!success) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting email link:', error);
    res.status(500).json({ error: 'Failed to delete email link' });
  }
});

const appointmentReminderSchema = z.object({
  clientEmail: z.string().email(),
  clientName: z.string().min(1),
  appointmentDate: z.string(),
  appointmentTime: z.string(),
  serviceType: z.string(),
  maintenanceId: z.number().optional()
});

router.post('/api/notifications/appointment-reminder', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const validation = appointmentReminderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid data', details: validation.error.errors });
    }

    const { clientEmail, clientName, appointmentDate, appointmentTime, serviceType, maintenanceId } = validation.data;
    const result = await sendAppointmentReminder(
      clientEmail,
      clientName,
      user.organizationId,
      new Date(appointmentDate),
      appointmentTime,
      serviceType,
      maintenanceId
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error sending appointment reminder:', error);
    res.status(500).json({ error: 'Failed to send appointment reminder' });
  }
});

const projectUpdateSchema = z.object({
  clientEmail: z.string().email(),
  clientName: z.string().min(1),
  projectId: z.number(),
  projectName: z.string(),
  currentPhase: z.string(),
  percentComplete: z.number(),
  status: z.string(),
  updateMessage: z.string(),
  milestone: z.string().optional()
});

router.post('/api/notifications/project-update', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const validation = projectUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid data', details: validation.error.errors });
    }

    const data = validation.data;
    const result = await sendProjectUpdate(
      data.clientEmail,
      data.clientName,
      user.organizationId,
      data.projectId,
      data.projectName,
      data.currentPhase,
      data.percentComplete,
      data.status,
      data.updateMessage,
      data.milestone
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error sending project update:', error);
    res.status(500).json({ error: 'Failed to send project update' });
  }
});

const repairStatusSchema = z.object({
  clientEmail: z.string().email(),
  clientName: z.string().min(1),
  repairId: z.number(),
  issueType: z.string(),
  status: z.string(),
  technicianName: z.string(),
  updateMessage: z.string(),
  scheduledDate: z.string().optional()
});

router.post('/api/notifications/repair-status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const validation = repairStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid data', details: validation.error.errors });
    }

    const data = validation.data;
    const result = await sendRepairStatusUpdate(
      data.clientEmail,
      data.clientName,
      user.organizationId,
      data.repairId,
      data.issueType,
      data.status,
      data.technicianName,
      data.updateMessage,
      data.scheduledDate
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error sending repair status update:', error);
    res.status(500).json({ error: 'Failed to send repair status update' });
  }
});

const clientPortalSchema = z.object({
  clientEmail: z.string().email(),
  clientName: z.string().min(1),
  clientId: z.number(),
  subject: z.string(),
  title: z.string(),
  message: z.string(),
  actionUrl: z.string().optional(),
  actionText: z.string().optional()
});

router.post('/api/notifications/client-portal', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const validation = clientPortalSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid data', details: validation.error.errors });
    }

    const data = validation.data;
    const result = await sendClientPortalEmail(
      data.clientEmail,
      data.clientName,
      user.organizationId,
      data.clientId,
      data.subject,
      data.title,
      data.message,
      data.actionUrl,
      data.actionText
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error sending client portal email:', error);
    res.status(500).json({ error: 'Failed to send client portal email' });
  }
});

const internalAlertSchema = z.object({
  teamMemberEmail: z.string().email(),
  teamMemberName: z.string().min(1),
  alertType: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  summary: z.string(),
  details: z.string(),
  actionRequired: z.string().optional()
});

router.post('/api/notifications/internal-alert', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const validation = internalAlertSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid data', details: validation.error.errors });
    }

    const data = validation.data;
    const result = await sendInternalAlert(
      data.teamMemberEmail,
      data.teamMemberName,
      user.organizationId,
      data.alertType,
      data.priority,
      data.summary,
      data.details,
      data.actionRequired
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error sending internal alert:', error);
    res.status(500).json({ error: 'Failed to send internal alert' });
  }
});

const marketingEmailSchema = z.object({
  clientEmail: z.string().email(),
  clientName: z.string().min(1),
  clientId: z.number(),
  subject: z.string(),
  headline: z.string(),
  message: z.string(),
  offerDetails: z.string().optional(),
  expiresDate: z.string().optional(),
  actionUrl: z.string().optional(),
  actionText: z.string().optional()
});

router.post('/api/notifications/marketing', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const validation = marketingEmailSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid data', details: validation.error.errors });
    }

    const data = validation.data;
    const result = await sendMarketingEmail(
      data.clientEmail,
      data.clientName,
      user.organizationId,
      data.clientId,
      data.subject,
      data.headline,
      data.message,
      data.offerDetails,
      data.expiresDate,
      data.actionUrl,
      data.actionText
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error sending marketing email:', error);
    res.status(500).json({ error: 'Failed to send marketing email' });
  }
});

export default router;
