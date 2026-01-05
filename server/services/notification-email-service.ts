import { storage } from '../storage';
import { sendGmailMessage, isGmailConnected } from './gmail-client';
import type { InsertScheduledEmail } from '@shared/schema';

type NotificationType = 
  | 'appointment_reminder'
  | 'project_update'
  | 'repair_status'
  | 'client_portal'
  | 'internal_alert'
  | 'marketing';

interface NotificationContext {
  recipientEmail: string;
  recipientName: string;
  organizationId: number;
  relatedProjectId?: number;
  relatedRepairId?: number;
  relatedClientId?: number;
  relatedMaintenanceId?: number;
  customData?: Record<string, string>;
}

const EMAIL_TEMPLATES: Record<NotificationType, { subject: string; bodyTemplate: string }> = {
  appointment_reminder: {
    subject: 'Upcoming Pool Service Reminder - {{date}}',
    bodyTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">Pool Service Reminder</h2>
        <p>Dear {{clientName}},</p>
        <p>This is a friendly reminder that your pool service appointment is scheduled for:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Date:</strong> {{date}}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> {{time}}</p>
          <p style="margin: 5px 0;"><strong>Service Type:</strong> {{serviceType}}</p>
        </div>
        <p>Our technician will arrive during the scheduled time window. Please ensure gate access is available.</p>
        <p>If you need to reschedule, please contact us at least 24 hours in advance.</p>
        <p>Thank you for choosing SmartWater Pools!</p>
      </div>
    `
  },
  project_update: {
    subject: 'Project Update: {{projectName}} - {{milestone}}',
    bodyTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">Project Status Update</h2>
        <p>Dear {{clientName}},</p>
        <p>We're pleased to share an update on your pool project:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Project:</strong> {{projectName}}</p>
          <p style="margin: 5px 0;"><strong>Current Phase:</strong> {{currentPhase}}</p>
          <p style="margin: 5px 0;"><strong>Progress:</strong> {{percentComplete}}% Complete</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> {{status}}</p>
        </div>
        <p>{{updateMessage}}</p>
        <p>If you have any questions about your project, please don't hesitate to reach out.</p>
        <p>Best regards,<br>SmartWater Pools Team</p>
      </div>
    `
  },
  repair_status: {
    subject: 'Repair Update: {{issueType}} - {{status}}',
    bodyTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">Repair Status Update</h2>
        <p>Dear {{clientName}},</p>
        <p>Here's the latest update on your repair request:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Issue:</strong> {{issueType}}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> {{status}}</p>
          <p style="margin: 5px 0;"><strong>Technician:</strong> {{technicianName}}</p>
          {{#if scheduledDate}}
          <p style="margin: 5px 0;"><strong>Scheduled:</strong> {{scheduledDate}}</p>
          {{/if}}
        </div>
        <p>{{updateMessage}}</p>
        <p>Thank you for your patience.</p>
        <p>Best regards,<br>SmartWater Pools Team</p>
      </div>
    `
  },
  client_portal: {
    subject: '{{subject}}',
    bodyTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">{{title}}</h2>
        <p>Dear {{clientName}},</p>
        <p>{{message}}</p>
        {{#if actionUrl}}
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{actionUrl}}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">{{actionText}}</a>
        </div>
        {{/if}}
        <p>Best regards,<br>SmartWater Pools Team</p>
      </div>
    `
  },
  internal_alert: {
    subject: '[ALERT] {{alertType}}: {{summary}}',
    bodyTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #cc3300;">Internal Alert</h2>
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #cc3300; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Alert Type:</strong> {{alertType}}</p>
          <p style="margin: 5px 0;"><strong>Priority:</strong> {{priority}}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> {{timestamp}}</p>
        </div>
        <p><strong>Summary:</strong></p>
        <p>{{details}}</p>
        {{#if actionRequired}}
        <div style="background-color: #f8d7da; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Action Required:</strong> {{actionRequired}}</p>
        </div>
        {{/if}}
        <p>Please take appropriate action.</p>
      </div>
    `
  },
  marketing: {
    subject: '{{subject}}',
    bodyTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0066cc;">{{headline}}</h2>
        <p>Dear {{clientName}},</p>
        <p>{{message}}</p>
        {{#if offerDetails}}
        <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="color: #0066cc; margin: 0;">{{offerDetails}}</h3>
          {{#if expiresDate}}
          <p style="font-size: 12px; color: #666; margin-top: 10px;">Offer expires: {{expiresDate}}</p>
          {{/if}}
        </div>
        {{/if}}
        {{#if actionUrl}}
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{actionUrl}}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">{{actionText}}</a>
        </div>
        {{/if}}
        <p>Best regards,<br>SmartWater Pools Team</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">You're receiving this email because you're a valued SmartWater Pools customer.</p>
      </div>
    `
  }
};

function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value !== undefined && value !== null ? value : '');
  }
  result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (_, varName, content) => {
    return variables[varName] ? content : '';
  });
  result = result.replace(/{{\w+}}/g, '');
  return result;
}

export async function sendNotificationEmail(
  type: NotificationType,
  context: NotificationContext,
  variables: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const connected = await isGmailConnected();
    if (!connected) {
      return { success: false, error: 'Gmail is not connected' };
    }

    const template = EMAIL_TEMPLATES[type];
    const subject = replaceTemplateVariables(template.subject, variables);
    const bodyHtml = replaceTemplateVariables(template.bodyTemplate, variables);

    const result = await sendGmailMessage(
      context.recipientEmail,
      subject,
      bodyHtml,
      true
    );

    if (!result) {
      return { success: false, error: 'Failed to send email' };
    }

    return { success: true, messageId: result.id || undefined };
  } catch (error) {
    console.error('Error sending notification email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function scheduleNotificationEmail(
  type: NotificationType,
  context: NotificationContext,
  variables: Record<string, string>,
  scheduledFor: Date
): Promise<{ success: boolean; scheduledEmailId?: number; error?: string }> {
  try {
    const template = EMAIL_TEMPLATES[type];
    const subject = replaceTemplateVariables(template.subject, variables);
    const bodyHtml = replaceTemplateVariables(template.bodyTemplate, variables);
    const bodyText = bodyHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    const scheduledEmail: InsertScheduledEmail = {
      recipientEmail: context.recipientEmail,
      recipientName: context.recipientName,
      subject,
      bodyHtml,
      bodyText,
      scheduledFor,
      emailType: type,
      status: 'pending',
      relatedProjectId: context.relatedProjectId || null,
      relatedRepairId: context.relatedRepairId || null,
      relatedClientId: context.relatedClientId || null,
      relatedMaintenanceId: context.relatedMaintenanceId || null,
      organizationId: context.organizationId
    };

    const saved = await storage.createScheduledEmail(scheduledEmail);
    return { success: true, scheduledEmailId: saved.id };
  } catch (error) {
    console.error('Error scheduling notification email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function sendAppointmentReminder(
  clientEmail: string,
  clientName: string,
  organizationId: number,
  appointmentDate: Date,
  appointmentTime: string,
  serviceType: string,
  maintenanceId?: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationEmail(
    'appointment_reminder',
    {
      recipientEmail: clientEmail,
      recipientName: clientName,
      organizationId,
      relatedMaintenanceId: maintenanceId
    },
    {
      clientName,
      date: appointmentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: appointmentTime,
      serviceType
    }
  );
}

export async function sendProjectUpdate(
  clientEmail: string,
  clientName: string,
  organizationId: number,
  projectId: number,
  projectName: string,
  currentPhase: string,
  percentComplete: number,
  status: string,
  updateMessage: string,
  milestone?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationEmail(
    'project_update',
    {
      recipientEmail: clientEmail,
      recipientName: clientName,
      organizationId,
      relatedProjectId: projectId
    },
    {
      clientName,
      projectName,
      currentPhase,
      percentComplete: percentComplete.toString(),
      status,
      updateMessage,
      milestone: milestone || currentPhase
    }
  );
}

export async function sendRepairStatusUpdate(
  clientEmail: string,
  clientName: string,
  organizationId: number,
  repairId: number,
  issueType: string,
  status: string,
  technicianName: string,
  updateMessage: string,
  scheduledDate?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationEmail(
    'repair_status',
    {
      recipientEmail: clientEmail,
      recipientName: clientName,
      organizationId,
      relatedRepairId: repairId
    },
    {
      clientName,
      issueType,
      status,
      technicianName,
      updateMessage,
      scheduledDate: scheduledDate || ''
    }
  );
}

export async function sendClientPortalEmail(
  clientEmail: string,
  clientName: string,
  organizationId: number,
  clientId: number,
  emailSubject: string,
  title: string,
  message: string,
  actionUrl?: string,
  actionText?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationEmail(
    'client_portal',
    {
      recipientEmail: clientEmail,
      recipientName: clientName,
      organizationId,
      relatedClientId: clientId
    },
    {
      clientName,
      subject: emailSubject,
      title,
      message,
      actionUrl: actionUrl || '',
      actionText: actionText || 'Take Action'
    }
  );
}

export async function sendInternalAlert(
  teamMemberEmail: string,
  teamMemberName: string,
  organizationId: number,
  alertType: string,
  priority: 'low' | 'medium' | 'high' | 'urgent',
  summary: string,
  details: string,
  actionRequired?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationEmail(
    'internal_alert',
    {
      recipientEmail: teamMemberEmail,
      recipientName: teamMemberName,
      organizationId
    },
    {
      alertType,
      priority,
      summary,
      details,
      timestamp: new Date().toLocaleString(),
      actionRequired: actionRequired || ''
    }
  );
}

export async function sendMarketingEmail(
  clientEmail: string,
  clientName: string,
  organizationId: number,
  clientId: number,
  subject: string,
  headline: string,
  message: string,
  offerDetails?: string,
  expiresDate?: string,
  actionUrl?: string,
  actionText?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendNotificationEmail(
    'marketing',
    {
      recipientEmail: clientEmail,
      recipientName: clientName,
      organizationId,
      relatedClientId: clientId
    },
    {
      clientName,
      subject,
      headline,
      message,
      offerDetails: offerDetails || '',
      expiresDate: expiresDate || '',
      actionUrl: actionUrl || '',
      actionText: actionText || 'Learn More'
    }
  );
}
