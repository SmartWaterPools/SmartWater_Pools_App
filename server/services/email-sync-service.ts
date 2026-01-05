import { storage } from '../storage';
import { getGmailClient, parseGmailMessage, isGmailConnected, getGmailProfile } from './gmail-client';
import type { InsertEmail, InsertEmailLink, Email } from '@shared/schema';

interface SyncResult {
  success: boolean;
  emailsSynced: number;
  emailsLinked: number;
  errors: string[];
}

export async function syncGmailEmails(
  providerId: number,
  organizationId: number,
  maxResults: number = 50
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    emailsSynced: 0,
    emailsLinked: 0,
    errors: []
  };

  try {
    const isConnected = await isGmailConnected();
    if (!isConnected) {
      result.success = false;
      result.errors.push('Gmail is not connected');
      return result;
    }

    const gmail = await getGmailClient();
    
    const profile = await getGmailProfile();
    const profileEmail = profile?.emailAddress?.toLowerCase() || '';
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: 'in:inbox OR in:sent'
    });

    if (!response.data.messages) {
      return result;
    }

    for (const msgRef of response.data.messages) {
      if (!msgRef.id) continue;

      try {
        const existing = await storage.getEmailByExternalId(providerId, msgRef.id);
        if (existing) continue;

        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: msgRef.id,
          format: 'full'
        });

        const parsed = parseGmailMessage(fullMessage.data);
        
        const fromEmailAddress = extractEmailAddress(parsed.fromEmail);
        const direction = fromEmailAddress === profileEmail ? 'outbound' : 'inbound';

        const emailData: InsertEmail = {
          providerId,
          organizationId,
          externalId: parsed.externalId,
          threadId: parsed.threadId,
          subject: parsed.subject,
          fromEmail: parsed.fromEmail,
          toEmails: parsed.toEmail ? [parsed.toEmail] : null,
          ccEmails: parsed.ccEmail ? [parsed.ccEmail] : null,
          bccEmails: parsed.bccEmail ? [parsed.bccEmail] : null,
          bodyText: parsed.bodyText,
          bodyHtml: parsed.bodyHtml,
          receivedAt: parsed.receivedAt,
          isRead: parsed.isRead,
          isStarred: parsed.isStarred,
          hasAttachments: parsed.hasAttachments,
          labels: parsed.labels,
          isSent: direction === 'outbound'
        };

        const savedEmail = await storage.createEmail(emailData);
        result.emailsSynced++;

        const linksCreated = await autoLinkEmail(savedEmail, organizationId);
        result.emailsLinked += linksCreated;

      } catch (msgError) {
        console.error(`Error processing message ${msgRef.id}:`, msgError);
        result.errors.push(`Failed to process message ${msgRef.id}`);
      }
    }

  } catch (error) {
    console.error('Gmail sync error:', error);
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
  }

  return result;
}

async function autoLinkEmail(email: Email, organizationId: number): Promise<number> {
  let linksCreated = 0;
  
  try {
    const fromEmail = extractEmailAddress(email.fromEmail);
    const toEmail = email.toEmails && email.toEmails.length > 0 
      ? extractEmailAddress(email.toEmails[0]) 
      : '';
    
    const allClients = await storage.getUsersByRole('client');
    const clients = allClients.filter(c => c.organizationId === organizationId);
    const clientIds = clients.map(c => c.id);
    
    for (const client of clients) {
      if (client.email && (client.email.toLowerCase() === fromEmail || client.email.toLowerCase() === toEmail)) {
        const linkData: InsertEmailLink = {
          emailId: email.id,
          linkType: 'client',
          clientId: client.id,
          isAutoLinked: true
        };
        await storage.createEmailLink(linkData);
        linksCreated++;
        
        const projects = await storage.getProjectsByClient(client.id);
        for (const project of projects) {
          const projectLinkData: InsertEmailLink = {
            emailId: email.id,
            linkType: 'project',
            projectId: project.id,
            isAutoLinked: true
          };
          await storage.createEmailLink(projectLinkData);
          linksCreated++;
        }
        break;
      }
    }

    const subjectLower = (email.subject || '').toLowerCase();
    if (subjectLower.includes('repair') || subjectLower.includes('fix') || subjectLower.includes('broken')) {
      const allRepairs = await storage.getRepairs();
      const repairs = allRepairs.filter(r => clientIds.includes(r.clientId));
      
      for (const repair of repairs) {
        if (subjectLower.includes(repair.id.toString()) || 
            (repair.issue && subjectLower.includes(repair.issue.toLowerCase()))) {
          const repairLinkData: InsertEmailLink = {
            emailId: email.id,
            linkType: 'repair',
            repairId: repair.id,
            isAutoLinked: true
          };
          await storage.createEmailLink(repairLinkData);
          linksCreated++;
          break;
        }
      }
    }

  } catch (error) {
    console.error('Error auto-linking email:', error);
  }

  return linksCreated;
}

function extractEmailAddress(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  if (match) {
    return match[1].toLowerCase();
  }
  return emailString.trim().toLowerCase();
}

export async function getGmailConnectionStatus(): Promise<{
  connected: boolean;
  email?: string;
  messagesTotal?: number;
}> {
  try {
    const isConnected = await isGmailConnected();
    if (!isConnected) {
      return { connected: false };
    }

    const profile = await getGmailProfile();
    return {
      connected: true,
      email: profile?.emailAddress || undefined,
      messagesTotal: profile?.messagesTotal || undefined
    };
  } catch {
    return { connected: false };
  }
}
