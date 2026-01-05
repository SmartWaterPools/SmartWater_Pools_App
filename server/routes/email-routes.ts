import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../auth';
import { syncGmailEmails, getGmailConnectionStatus } from '../services/email-sync-service';
import { sendGmailMessage } from '../services/gmail-client';
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
    const projectId = parseInt(req.params.projectId);
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
    const repairId = parseInt(req.params.repairId);
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
    const clientId = parseInt(req.params.clientId);
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
    
    const result = await syncGmailEmails(providerId, user.organizationId, 50);
    res.json(result);
  } catch (error) {
    console.error('Error syncing emails:', error);
    res.status(500).json({ error: 'Failed to sync emails' });
  }
});

router.get('/api/emails/connection-status/gmail', isAuthenticated, async (_req: Request, res: Response) => {
  try {
    const status = await getGmailConnectionStatus();
    res.json(status);
  } catch (error) {
    console.error('Error checking Gmail connection:', error);
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

export default router;
