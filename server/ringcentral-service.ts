import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Use require for better CommonJS/ESM interop with the RingCentral SDK
const RingCentralModule = require('@ringcentral/sdk');
const SDK = RingCentralModule.SDK || RingCentralModule.default || RingCentralModule;

// Log SDK resolution for debugging
console.log('RingCentral SDK resolved:', typeof SDK === 'function' ? 'Success' : 'Failed', 'Type:', typeof SDK);
if (typeof SDK !== 'function') {
  console.error('RingCentral SDK module structure:', Object.keys(RingCentralModule));
}
import { storage } from './storage';
import { db } from './db';
import { smsMessages, communicationProviders, type CommunicationProvider, type InsertSmsMessage } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface SMSOptions {
  clientId?: number;
  maintenanceId?: number;
  repairId?: number;
  projectId?: number;
  messageType?: 'on_the_way' | 'job_complete' | 'reminder' | 'verification' | 'custom';
  sentBy?: number;
}

export function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

export class RingCentralService {
  private getSDK(clientId: string, clientSecret: string, server: string = 'https://platform.ringcentral.com'): any {
    return new SDK({
      server,
      clientId,
      clientSecret,
    });
  }

  async getOrganizationProvider(organizationId: number): Promise<CommunicationProvider | undefined> {
    const providers = await db.select()
      .from(communicationProviders)
      .where(and(
        eq(communicationProviders.type, 'ringcentral'),
        eq(communicationProviders.organizationId, organizationId),
        eq(communicationProviders.isActive, true)
      ))
      .limit(1);
    
    return providers[0] || undefined;
  }

  async refreshTokenIfNeeded(provider: CommunicationProvider): Promise<CommunicationProvider> {
    if (!provider.tokenExpiresAt) {
      return provider;
    }

    const now = new Date();
    const expiresAt = new Date(provider.tokenExpiresAt);
    const bufferTime = 5 * 60 * 1000;

    if (expiresAt.getTime() - now.getTime() > bufferTime) {
      return provider;
    }

    if (!provider.refreshToken || !provider.clientId || !provider.clientSecret) {
      console.error('Missing credentials for token refresh');
      throw new Error('Missing credentials for token refresh - please reconnect RingCentral');
    }

    try {
      console.log(`Refreshing RingCentral token for provider ${provider.id}`);
      
      const sdk = this.getSDK(provider.clientId, provider.clientSecret);
      const platform = sdk.platform();
      
      // Set the existing auth data and then refresh
      await platform.auth().setData({
        access_token: provider.accessToken,
        refresh_token: provider.refreshToken,
        expires_in: 0, // Force refresh
        token_type: 'bearer',
      });
      
      // Perform the refresh
      await platform.refresh();

      const tokenInfo = await platform.auth().data();
      
      if (!tokenInfo.access_token) {
        throw new Error('Failed to obtain new access token');
      }
      
      const newExpiresAt = new Date(Date.now() + (tokenInfo.expires_in || 3600) * 1000);
      
      const updatedProvider = await storage.updateCommunicationProvider(provider.id, {
        accessToken: tokenInfo.access_token,
        refreshToken: tokenInfo.refresh_token || provider.refreshToken,
        tokenExpiresAt: newExpiresAt,
        lastUsed: new Date(),
      });

      console.log(`Successfully refreshed RingCentral token for provider ${provider.id}`);
      return updatedProvider || provider;
    } catch (error: any) {
      console.error('Error refreshing RingCentral token:', error);
      
      // Mark provider as disconnected if refresh fails
      await storage.updateCommunicationProvider(provider.id, {
        isActive: false,
      });
      
      throw new Error('RingCentral token refresh failed - please reconnect in Settings');
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
        return { success: false, error: 'RingCentral not connected for this organization' };
      }

      if (!provider.accessToken || !provider.phoneNumber) {
        return { success: false, error: 'RingCentral credentials incomplete' };
      }

      const refreshedProvider = await this.refreshTokenIfNeeded(provider);

      const smsRecord: InsertSmsMessage = {
        providerId: provider.id,
        direction: 'outbound',
        fromNumber: refreshedProvider.phoneNumber || '',
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

      if (!refreshedProvider.clientId || !refreshedProvider.clientSecret) {
        await db.update(smsMessages)
          .set({ status: 'failed', errorMessage: 'Missing API credentials' })
          .where(eq(smsMessages.id, insertedMessage.id));
        return { success: false, messageId: insertedMessage.id, error: 'Missing API credentials' };
      }

      try {
        const sdk = this.getSDK(refreshedProvider.clientId, refreshedProvider.clientSecret);
        const platform = sdk.platform();
        
        // Set auth data properly for authenticated requests
        await platform.auth().setData({
          access_token: refreshedProvider.accessToken,
          refresh_token: refreshedProvider.refreshToken,
          expires_in: 3600,
          token_type: 'bearer',
        });

        const response = await platform.post('/restapi/v1.0/account/~/extension/~/sms', {
          from: { phoneNumber: refreshedProvider.phoneNumber },
          to: [{ phoneNumber: to }],
          text: message,
        });

        const responseData = await response.json();
        
        await db.update(smsMessages)
          .set({
            status: 'sent',
            externalId: responseData.id?.toString(),
            sentAt: new Date(),
          })
          .where(eq(smsMessages.id, insertedMessage.id));

        await storage.updateCommunicationProvider(provider.id, {
          lastUsed: new Date(),
        });

        console.log(`SMS sent successfully to ${to} from org ${organizationId}`);
        return { 
          success: true, 
          messageId: insertedMessage.id,
          externalId: responseData.id?.toString()
        };
      } catch (sendError: any) {
        console.error('RingCentral API error:', sendError);
        
        await db.update(smsMessages)
          .set({ 
            status: 'failed', 
            errorMessage: sendError.message || 'Failed to send SMS'
          })
          .where(eq(smsMessages.id, insertedMessage.id));

        return { 
          success: false, 
          messageId: insertedMessage.id,
          error: sendError.message || 'Failed to send SMS'
        };
      }
    } catch (error: any) {
      console.error('Error in sendSMS:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  async getPhoneNumbers(organizationId: number): Promise<{ success: boolean; phoneNumbers?: any[]; error?: string }> {
    try {
      const provider = await this.getOrganizationProvider(organizationId);
      
      if (!provider) {
        return { success: false, error: 'RingCentral not connected' };
      }

      if (!provider.accessToken || !provider.clientId || !provider.clientSecret) {
        return { success: false, error: 'RingCentral credentials incomplete' };
      }

      const refreshedProvider = await this.refreshTokenIfNeeded(provider);

      const sdk = this.getSDK(refreshedProvider.clientId!, refreshedProvider.clientSecret!);
      const platform = sdk.platform();
      
      // Set auth data properly for authenticated requests
      await platform.auth().setData({
        access_token: refreshedProvider.accessToken,
        refresh_token: refreshedProvider.refreshToken,
        expires_in: 3600,
        token_type: 'bearer',
      });

      const response = await platform.get('/restapi/v1.0/account/~/extension/~/phone-number');
      const data = await response.json();

      const smsEnabledNumbers = (data.records || []).filter((num: any) => 
        num.features?.includes('SmsSender')
      );

      return { success: true, phoneNumbers: smsEnabledNumbers };
    } catch (error: any) {
      console.error('Error getting phone numbers:', error);
      return { success: false, error: error.message || 'Failed to get phone numbers' };
    }
  }

  async getConnectionStatus(organizationId: number): Promise<{ 
    connected: boolean; 
    phoneNumber?: string;
    email?: string;
    lastUsed?: Date;
    error?: string;
  }> {
    try {
      const provider = await this.getOrganizationProvider(organizationId);
      
      if (!provider) {
        return { connected: false };
      }

      if (!provider.accessToken) {
        return { connected: false, error: 'No access token' };
      }

      if (provider.tokenExpiresAt && new Date(provider.tokenExpiresAt) < new Date()) {
        const refreshedProvider = await this.refreshTokenIfNeeded(provider);
        if (!refreshedProvider.accessToken) {
          return { connected: false, error: 'Token expired and refresh failed' };
        }
      }

      return {
        connected: true,
        phoneNumber: provider.phoneNumber || undefined,
        email: provider.email || undefined,
        lastUsed: provider.lastUsed || undefined,
      };
    } catch (error: any) {
      console.error('Error checking connection status:', error);
      return { connected: false, error: error.message };
    }
  }

  async getMessages(organizationId: number, limit: number = 50, offset: number = 0): Promise<any[]> {
    return await db.select()
      .from(smsMessages)
      .where(eq(smsMessages.organizationId, organizationId))
      .orderBy(desc(smsMessages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async syncMessages(organizationId: number): Promise<{ success: boolean; synced: number; error?: string }> {
    try {
      console.log(`[SMS Sync] Starting sync for org ${organizationId}`);
      
      const provider = await this.getOrganizationProvider(organizationId);
      
      if (!provider) {
        console.log('[SMS Sync] No provider found');
        return { success: false, synced: 0, error: 'RingCentral not connected' };
      }

      if (!provider.accessToken || !provider.clientId || !provider.clientSecret) {
        console.log('[SMS Sync] Credentials incomplete:', {
          hasAccessToken: !!provider.accessToken,
          hasClientId: !!provider.clientId,
          hasClientSecret: !!provider.clientSecret
        });
        return { success: false, synced: 0, error: 'RingCentral credentials incomplete' };
      }

      console.log('[SMS Sync] Refreshing token if needed...');
      const refreshedProvider = await this.refreshTokenIfNeeded(provider);

      console.log('[SMS Sync] Creating SDK instance...');
      if (typeof SDK !== 'function') {
        console.error('[SMS Sync] SDK is not a constructor! Type:', typeof SDK);
        return { success: false, synced: 0, error: 'SDK is not a constructor' };
      }
      
      const sdk = this.getSDK(refreshedProvider.clientId!, refreshedProvider.clientSecret!);
      console.log('[SMS Sync] SDK created, getting platform...');
      const platform = sdk.platform();
      
      // Set auth data properly for authenticated requests
      await platform.auth().setData({
        access_token: refreshedProvider.accessToken,
        refresh_token: refreshedProvider.refreshToken,
        expires_in: 3600,
        token_type: 'bearer',
      });

      // Fetch SMS message log from RingCentral (last 7 days) with pagination
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 7);
      
      let syncedCount = 0;
      let page = 1;
      const maxPages = 10; // Limit to prevent infinite loops
      let hasMore = true;

      while (hasMore && page <= maxPages) {
        const response = await platform.get('/restapi/v1.0/account/~/extension/~/message-store', {
          messageType: 'SMS',
          dateFrom: dateFrom.toISOString(),
          perPage: 100,
          page,
        });

        const data = await response.json();
        const messages = data.records || [];
        
        if (messages.length === 0) {
          hasMore = false;
          break;
        }

        for (const msg of messages) {
          // Skip messages without a valid ID - can't dedupe them reliably
          const externalId = msg.id?.toString();
          if (!externalId) {
            continue;
          }

          // Check if message already exists by externalId
          const existing = await db.select()
            .from(smsMessages)
            .where(and(
              eq(smsMessages.organizationId, organizationId),
              eq(smsMessages.externalId, externalId)
            ))
            .limit(1);

          if (existing.length > 0) {
            continue; // Skip already synced messages
          }

          const direction = msg.direction === 'Inbound' ? 'inbound' : 'outbound';
          const fromNumber = msg.from?.phoneNumber || '';
          const toNumber = msg.to?.[0]?.phoneNumber || '';

          await db.insert(smsMessages).values({
            providerId: provider.id,
            organizationId,
            direction,
            fromNumber,
            toNumber,
            body: msg.subject || '',
            status: msg.messageStatus === 'Delivered' ? 'delivered' : 
                    msg.messageStatus === 'Sent' ? 'sent' : 
                    msg.messageStatus === 'Failed' ? 'failed' : 'sent',
            externalId,
            sentAt: msg.creationTime ? new Date(msg.creationTime) : null,
            deliveredAt: msg.messageStatus === 'Delivered' ? new Date(msg.lastModifiedTime) : null,
            messageType: 'custom',
            clientId: null,
            maintenanceId: null,
            repairId: null,
            projectId: null,
            sentBy: null,
          });

          syncedCount++;
        }

        // Check if there are more pages
        hasMore = data.navigation?.nextPage || messages.length === 100;
        page++;
      }

      // Update last used timestamp
      await storage.updateCommunicationProvider(provider.id, {
        lastUsed: new Date(),
      });

      console.log(`Synced ${syncedCount} SMS messages for org ${organizationId}`);
      return { success: true, synced: syncedCount };
    } catch (error: any) {
      console.error('[SMS Sync] Error syncing SMS messages:', error);
      console.error('[SMS Sync] Error stack:', error.stack);
      console.error('[SMS Sync] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      return { success: false, synced: 0, error: error.message || 'Failed to sync messages' };
    }
  }

  async disconnectProvider(organizationId: number): Promise<boolean> {
    const provider = await this.getOrganizationProvider(organizationId);
    
    if (!provider) {
      return false;
    }

    await storage.updateCommunicationProvider(provider.id, {
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      phoneNumber: null,
      isActive: false,
    });

    return true;
  }
}

export const ringCentralService = new RingCentralService();
