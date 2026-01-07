import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../auth';
import { syncGmailEmails, getGmailConnectionStatus, fetchGmailEmailsTransient, TransientEmail } from '../services/email-sync-service';
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
import type { InsertEmail, InsertEmailLink } from '@shared/schema';

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
    console.log('==========================================================');
    console.log('=== EMAIL SYNC REQUEST RECEIVED AT', new Date().toISOString(), '===');
    console.log('==========================================================');
    console.log('User ID:', user.id, 'Email:', user.email, 'OrgId:', user.organizationId);
    console.log('Has gmailAccessToken:', !!user.gmailAccessToken, 'Length:', user.gmailAccessToken?.length || 0);
    console.log('Has gmailRefreshToken:', !!user.gmailRefreshToken);
    console.log('Gmail Connected Email:', user.gmailConnectedEmail);
    console.log('Token Expires At:', user.gmailTokenExpiresAt);
    console.log('Request body:', JSON.stringify(req.body));
    
    const maxResults = req.body.maxResults || 10; // Default to 10 emails
    const pageToken = req.body.pageToken || null; // For pagination
    
    // Check if user has Gmail OAuth tokens
    const userTokens: UserTokens | undefined = user.gmailAccessToken ? {
      userId: user.id,
      gmailAccessToken: user.gmailAccessToken,
      gmailRefreshToken: user.gmailRefreshToken,
      gmailTokenExpiresAt: user.gmailTokenExpiresAt,
      gmailConnectedEmail: user.gmailConnectedEmail
    } : undefined;
    
    // Determine providerId: use user.id for OAuth tokens, or passed providerId for configured providers
    // Parse providerId from request body - it may come as a string from JSON
    let rawProviderId = req.body.providerId;
    let providerId: number | undefined;
    
    if (rawProviderId !== undefined && rawProviderId !== null) {
      providerId = Number(rawProviderId);
    }
    
    // For OAuth-connected Gmail users, default providerId to user.id
    if (userTokens && (!providerId || isNaN(providerId) || providerId <= 0)) {
      providerId = user.id;
      console.log('Using user.id as providerId for OAuth user:', providerId);
    }
    
    // Validate we have a valid providerId (must be a positive number)
    if (!providerId || isNaN(providerId) || providerId <= 0) {
      console.log('ERROR: Invalid providerId after processing:', providerId, 'raw:', rawProviderId);
      return res.status(400).json({ error: 'Invalid provider configuration. Please reconnect Gmail in Settings.' });
    }
    
    // For OAuth-connected users, userTokens is required
    if (!userTokens) {
      console.log('ERROR: No Gmail tokens available for user');
      return res.status(400).json({ error: 'Gmail not connected. Please connect Gmail in Settings.' });
    }
    
    console.log('Calling syncGmailEmails with providerId:', providerId, 'orgId:', user.organizationId);
    const result = await syncGmailEmails(providerId, user.organizationId, maxResults, userTokens, pageToken);
    console.log('Sync result:', JSON.stringify(result));
    res.json(result);
  } catch (error) {
    console.error('Error syncing emails:', error);
    res.status(500).json({ error: 'Failed to sync emails' });
  }
});

// Fetch emails transiently (for display only, not saved to database)
router.post('/api/emails/fetch', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { maxResults = 10, pageToken = null, starredOnly = false, includeSent = false, searchQuery = null } = req.body;

    if (!user.gmailAccessToken) {
      return res.status(400).json({ error: 'Gmail not connected. Please connect Gmail in Settings.' });
    }

    const userTokens: UserTokens = {
      userId: user.id,
      gmailAccessToken: user.gmailAccessToken,
      gmailRefreshToken: user.gmailRefreshToken,
      gmailTokenExpiresAt: user.gmailTokenExpiresAt,
      gmailConnectedEmail: user.gmailConnectedEmail
    };

    const result = await fetchGmailEmailsTransient(userTokens, {
      maxResults,
      pageToken,
      starredOnly,
      includeSent,
      searchQuery
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Link schema for saving email to entities
const linkEmailSchema = z.object({
  email: z.object({
    externalId: z.string(),
    threadId: z.string().nullable(),
    subject: z.string().nullable(),
    fromEmail: z.string(),
    fromName: z.string().nullable(),
    toEmails: z.array(z.string()).nullable(),
    ccEmails: z.array(z.string()).nullable().optional(),
    bccEmails: z.array(z.string()).nullable().optional(),
    bodyText: z.string().nullable(),
    bodyHtml: z.string().nullable(),
    snippet: z.string().nullable().optional(),
    isRead: z.boolean(),
    isStarred: z.boolean(),
    isDraft: z.boolean().optional(),
    isSent: z.boolean(),
    hasAttachments: z.boolean(),
    labels: z.array(z.string()).nullable(),
    receivedAt: z.string().nullable()
  }),
  clientId: z.number().nullable().optional(),
  vendorId: z.number().nullable().optional(),
  projectId: z.number().nullable().optional()
});

// Save email and link to entities (only saves when explicitly linked)
router.post('/api/emails/link', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const validation = linkEmailSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request data', details: validation.error.errors });
    }

    const { email, clientId, vendorId, projectId } = validation.data;

    // Validate that at least one entity is provided
    if (!clientId && !vendorId && !projectId) {
      return res.status(400).json({ error: 'At least one entity (client, vendor, or project) is required' });
    }

    // Verify client belongs to user's organization if provided
    if (clientId) {
      const client = await storage.getUser(clientId);
      if (!client || client.organizationId !== user.organizationId) {
        return res.status(403).json({ error: 'Access denied to this client' });
      }
    }

    // Check if email already exists by externalId
    let existingEmail = await storage.getEmailByExternalId(user.id, email.externalId);
    
    let savedEmailId: number;
    
    if (existingEmail) {
      savedEmailId = existingEmail.id;
    } else {
      // Create the email record
      const emailData: InsertEmail = {
        providerId: user.id,
        organizationId: user.organizationId,
        externalId: email.externalId,
        threadId: email.threadId,
        subject: email.subject,
        fromEmail: email.fromEmail,
        toEmails: email.toEmails,
        ccEmails: email.ccEmails || null,
        bccEmails: email.bccEmails || null,
        bodyText: email.bodyText,
        bodyHtml: email.bodyHtml,
        receivedAt: email.receivedAt ? new Date(email.receivedAt) : null,
        isRead: email.isRead,
        isStarred: email.isStarred,
        hasAttachments: email.hasAttachments,
        labels: email.labels,
        isSent: email.isSent
      };

      const savedEmail = await storage.createEmail(emailData);
      savedEmailId = savedEmail.id;
    }

    const linksCreated: string[] = [];

    // Link to client if provided
    if (clientId) {
      const existingLinks = await storage.getEmailLinksByClient(clientId);
      const alreadyLinked = existingLinks.some(link => link.emailId === savedEmailId);

      if (!alreadyLinked) {
        const linkData: InsertEmailLink = {
          emailId: savedEmailId,
          linkType: 'client',
          clientId: clientId,
          isAutoLinked: false
        };
        await storage.createEmailLink(linkData);
        linksCreated.push('Client');
      }
    }

    // Link to vendor if provided (using communication_links table)
    if (vendorId) {
      await storage.createCommunicationLink({
        organizationId: user.organizationId,
        communicationType: 'email',
        communicationId: savedEmailId,
        entityType: 'vendor',
        entityId: vendorId,
        linkSource: 'manual',
        linkedBy: user.id,
      });
      linksCreated.push('Vendor');
    }

    // Link to project if provided (using communication_links table)
    if (projectId) {
      await storage.createCommunicationLink({
        organizationId: user.organizationId,
        communicationType: 'email',
        communicationId: savedEmailId,
        entityType: 'project',
        entityId: projectId,
        linkSource: 'manual',
        linkedBy: user.id,
      });
      linksCreated.push('Project');
    }

    res.json({ 
      success: true, 
      emailId: savedEmailId,
      message: linksCreated.length > 0 
        ? `Email saved and linked to ${linksCreated.join(', ')}` 
        : 'Email saved (already linked)'
    });
  } catch (error) {
    console.error('Error linking email:', error);
    res.status(500).json({ error: 'Failed to link email' });
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

router.post('/api/emails/disconnect-gmail', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    await storage.updateUser(user.id, {
      gmailAccessToken: null,
      gmailRefreshToken: null,
      gmailTokenExpiresAt: null,
      gmailConnectedEmail: null
    });
    
    res.json({ success: true, message: 'Gmail disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
});

router.get('/api/emails/diagnose-gmail', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const diagnostics: any = {
      userId: user.id,
      email: user.email,
      hasAccessToken: !!user.gmailAccessToken,
      hasRefreshToken: !!user.gmailRefreshToken,
      gmailConnectedEmail: user.gmailConnectedEmail,
      tokenExpiresAt: user.gmailTokenExpiresAt,
      tokenExpired: user.gmailTokenExpiresAt ? new Date(user.gmailTokenExpiresAt) < new Date() : null,
      currentTime: new Date().toISOString()
    };
    
    if (!user.gmailAccessToken) {
      diagnostics.error = 'No Gmail access token found';
      return res.json(diagnostics);
    }
    
    const userTokens: UserTokens = {
      userId: user.id,
      gmailAccessToken: user.gmailAccessToken,
      gmailRefreshToken: user.gmailRefreshToken,
      gmailTokenExpiresAt: user.gmailTokenExpiresAt,
      gmailConnectedEmail: user.gmailConnectedEmail
    };
    
    try {
      const { getGmailClient, getGmailProfile } = await import('../services/gmail-client');
      const gmail = await getGmailClient(userTokens);
      diagnostics.gmailClientCreated = true;
      
      const profile = await getGmailProfile(userTokens);
      diagnostics.profile = {
        emailAddress: profile?.emailAddress,
        messagesTotal: profile?.messagesTotal
      };
      
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 5
      });
      
      diagnostics.messagesFound = listResponse.data.messages?.length || 0;
      diagnostics.resultSizeEstimate = listResponse.data.resultSizeEstimate;
      diagnostics.hasNextPageToken = !!listResponse.data.nextPageToken;
      
    } catch (apiError) {
      diagnostics.apiError = apiError instanceof Error ? apiError.message : 'Unknown API error';
    }
    
    res.json(diagnostics);
  } catch (error) {
    console.error('Error diagnosing Gmail:', error);
    res.status(500).json({ error: 'Failed to diagnose Gmail connection' });
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
    const user = req.user as any;
    const emailId = parseInt(req.params.id);
    const { clientId, vendorId, projectId, repairId, maintenanceId } = req.body;
    
    // Validate that at least one entity is provided
    if (!clientId && !vendorId && !projectId && !repairId && !maintenanceId) {
      return res.status(400).json({ error: 'At least one entity ID is required' });
    }

    const linksCreated: any[] = [];

    // Create links using the new communication_links table for each entity
    if (clientId) {
      await storage.createCommunicationLink({
        organizationId: user.organizationId,
        communicationType: 'email',
        communicationId: emailId,
        entityType: 'client',
        entityId: parseInt(clientId),
        linkSource: 'manual',
        linkedBy: user.id,
      });
      // Also create legacy email_links for backward compatibility
      await storage.createEmailLink({
        emailId,
        linkType: 'client',
        clientId: parseInt(clientId),
        isAutoLinked: false
      });
      linksCreated.push({ type: 'client', id: clientId });
    }

    if (vendorId) {
      await storage.createCommunicationLink({
        organizationId: user.organizationId,
        communicationType: 'email',
        communicationId: emailId,
        entityType: 'vendor',
        entityId: parseInt(vendorId),
        linkSource: 'manual',
        linkedBy: user.id,
      });
      linksCreated.push({ type: 'vendor', id: vendorId });
    }

    if (projectId) {
      await storage.createCommunicationLink({
        organizationId: user.organizationId,
        communicationType: 'email',
        communicationId: emailId,
        entityType: 'project',
        entityId: parseInt(projectId),
        linkSource: 'manual',
        linkedBy: user.id,
      });
      await storage.createEmailLink({
        emailId,
        linkType: 'project',
        projectId: parseInt(projectId),
        isAutoLinked: false
      });
      linksCreated.push({ type: 'project', id: projectId });
    }

    if (repairId) {
      await storage.createCommunicationLink({
        organizationId: user.organizationId,
        communicationType: 'email',
        communicationId: emailId,
        entityType: 'repair',
        entityId: parseInt(repairId),
        linkSource: 'manual',
        linkedBy: user.id,
      });
      await storage.createEmailLink({
        emailId,
        linkType: 'repair',
        repairId: parseInt(repairId),
        isAutoLinked: false
      });
      linksCreated.push({ type: 'repair', id: repairId });
    }

    if (maintenanceId) {
      await storage.createCommunicationLink({
        organizationId: user.organizationId,
        communicationType: 'email',
        communicationId: emailId,
        entityType: 'maintenance',
        entityId: parseInt(maintenanceId),
        linkSource: 'manual',
        linkedBy: user.id,
      });
      await storage.createEmailLink({
        emailId,
        linkType: 'maintenance',
        maintenanceId: parseInt(maintenanceId),
        isAutoLinked: false
      });
      linksCreated.push({ type: 'maintenance', id: maintenanceId });
    }
    
    res.json({ 
      success: true, 
      message: `Email linked to ${linksCreated.length} entity(ies) successfully`,
      links: linksCreated 
    });
  } catch (error) {
    console.error('Error linking email:', error);
    res.status(500).json({ error: 'Failed to link email' });
  }
});

// Get communication links for an email
router.get('/api/emails/:id/communication-links', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const emailId = parseInt(req.params.id);
    const links = await storage.getCommunicationLinks('email', emailId);
    res.json({ success: true, links });
  } catch (error) {
    console.error('Error fetching email links:', error);
    res.status(500).json({ error: 'Failed to fetch links' });
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
