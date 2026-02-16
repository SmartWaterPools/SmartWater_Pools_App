import twilio from 'twilio';
import { storage } from './storage';
import { db } from './db';
import { smsMessages, callLogs, communicationProviders, type CommunicationProvider, type InsertSmsMessage, type InsertCallLog } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface SMSOptions {
  clientId?: number;
  maintenanceId?: number;
  repairId?: number;
  projectId?: number;
  messageType?: 'on_the_way' | 'job_complete' | 'reminder' | 'verification' | 'custom';
  sentBy?: number;
}

export interface CallOptions {
  clientId?: number;
  vendorId?: number;
  projectId?: number;
  notes?: string;
}

export function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

export class TwilioService {
  async getOrganizationProvider(organizationId: number): Promise<CommunicationProvider | undefined> {
    const providers = await db.select()
      .from(communicationProviders)
      .where(and(
        eq(communicationProviders.type, 'twilio'),
        eq(communicationProviders.organizationId, organizationId),
        eq(communicationProviders.isActive, true)
      ))
      .limit(1);

    return providers[0] || undefined;
  }

  async getConnectionStatus(organizationId: number): Promise<{
    connected: boolean;
    phoneNumber?: string;
    error?: string;
  }> {
    try {
      const provider = await this.getOrganizationProvider(organizationId);

      if (!provider) {
        return { connected: false };
      }

      if (!provider.accountSid || !provider.authToken || !provider.phoneNumber) {
        return { connected: false, error: 'Twilio credentials incomplete' };
      }

      return {
        connected: true,
        phoneNumber: provider.phoneNumber || undefined,
      };
    } catch (error: any) {
      console.error('Error checking Twilio connection status:', error);
      return { connected: false, error: error.message };
    }
  }

  async sendSMS(
    organizationId: number,
    to: string,
    message: string,
    options: SMSOptions = {}
  ): Promise<{ success: boolean; messageId?: number; externalId?: string; error?: string }> {
    try {
      const provider = await this.getOrganizationProvider(organizationId);

      if (!provider) {
        return { success: false, error: 'Twilio not connected for this organization' };
      }

      if (!provider.accountSid || !provider.authToken || !provider.phoneNumber) {
        return { success: false, error: 'Twilio credentials incomplete' };
      }

      const smsRecord: InsertSmsMessage = {
        providerId: provider.id,
        direction: 'outbound',
        fromNumber: provider.phoneNumber,
        toNumber: to,
        body: message,
        status: 'pending',
        organizationId,
        clientId: options.clientId || null,
        maintenanceId: options.maintenanceId || null,
        repairId: options.repairId || null,
        projectId: options.projectId || null,
        messageType: options.messageType || 'custom',
        sentBy: options.sentBy || null,
      };

      const [insertedMessage] = await db.insert(smsMessages).values(smsRecord).returning();

      try {
        const client = twilio(provider.accountSid, provider.authToken);

        const twilioMessage = await client.messages.create({
          body: message,
          from: provider.phoneNumber,
          to,
        });

        await db.update(smsMessages)
          .set({
            status: 'sent',
            externalId: twilioMessage.sid,
            sentAt: new Date(),
          })
          .where(eq(smsMessages.id, insertedMessage.id));

        await storage.updateCommunicationProvider(provider.id, {
          lastUsed: new Date(),
        });

        console.log(`SMS sent successfully via Twilio to ${to} from org ${organizationId}`);
        return {
          success: true,
          messageId: insertedMessage.id,
          externalId: twilioMessage.sid,
        };
      } catch (sendError: any) {
        console.error('Twilio API error:', sendError);

        await db.update(smsMessages)
          .set({
            status: 'failed',
            errorMessage: sendError.message || 'Failed to send SMS',
          })
          .where(eq(smsMessages.id, insertedMessage.id));

        return {
          success: false,
          messageId: insertedMessage.id,
          error: sendError.message || 'Failed to send SMS',
        };
      }
    } catch (error: any) {
      console.error('Error in sendSMS:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  async initiateCall(
    organizationId: number,
    callerUserId: number,
    callerPhone: string,
    customerPhone: string,
    options: CallOptions = {}
  ): Promise<{ success: boolean; callLogId?: number; callSid?: string; error?: string }> {
    try {
      const provider = await this.getOrganizationProvider(organizationId);

      if (!provider) {
        return { success: false, error: 'Twilio not connected for this organization' };
      }

      if (!provider.accountSid || !provider.authToken || !provider.phoneNumber) {
        return { success: false, error: 'Twilio credentials incomplete' };
      }

      const client = twilio(provider.accountSid, provider.authToken);

      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : (process.env.APP_URL || 'https://localhost:5000');

      const twimlUrl = `${baseUrl}/api/twilio/voice/connect?customerPhone=${encodeURIComponent(customerPhone)}`;

      const call = await client.calls.create({
        url: twimlUrl,
        to: callerPhone,
        from: provider.phoneNumber,
      });

      const callLogRecord: InsertCallLog = {
        organizationId,
        providerId: provider.id,
        externalId: call.sid,
        direction: 'outbound',
        fromNumber: provider.phoneNumber,
        toNumber: customerPhone,
        status: 'initiated',
        callerUserId,
        clientId: options.clientId || null,
        vendorId: options.vendorId || null,
        projectId: options.projectId || null,
        notes: options.notes || null,
        startedAt: new Date(),
      };

      const [insertedCallLog] = await db.insert(callLogs).values(callLogRecord).returning();

      await storage.updateCommunicationProvider(provider.id, {
        lastUsed: new Date(),
      });

      console.log(`Call initiated via Twilio to ${customerPhone} from org ${organizationId}`);
      return {
        success: true,
        callLogId: insertedCallLog.id,
        callSid: call.sid,
      };
    } catch (error: any) {
      console.error('Error initiating Twilio call:', error);
      return { success: false, error: error.message || 'Failed to initiate call' };
    }
  }

  async getCallLogs(organizationId: number, limit: number = 50, offset: number = 0): Promise<any[]> {
    return await db.select()
      .from(callLogs)
      .where(eq(callLogs.organizationId, organizationId))
      .orderBy(desc(callLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getMessages(organizationId: number, limit: number = 50, offset: number = 0): Promise<any[]> {
    return await db.select()
      .from(smsMessages)
      .where(eq(smsMessages.organizationId, organizationId))
      .orderBy(desc(smsMessages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async updateCallStatus(callSid: string, status: string, duration?: number): Promise<boolean> {
    try {
      const updateData: any = { status };

      if (duration !== undefined) {
        updateData.duration = duration;
        updateData.endedAt = new Date();
      }

      const result = await db.update(callLogs)
        .set(updateData)
        .where(eq(callLogs.externalId, callSid))
        .returning();

      return result.length > 0;
    } catch (error: any) {
      console.error('Error updating call status:', error);
      return false;
    }
  }

  async disconnectProvider(organizationId: number): Promise<boolean> {
    const provider = await this.getOrganizationProvider(organizationId);

    if (!provider) {
      return false;
    }

    await storage.updateCommunicationProvider(provider.id, {
      accountSid: null,
      authToken: null,
      phoneNumber: null,
      isActive: false,
    });

    return true;
  }
}

export const twilioService = new TwilioService();
