import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { isAuthenticated, requirePermission } from '../auth';
import { insertCommunicationProviderSchema, type User, type CommunicationProvider } from '@shared/schema';
import { z } from 'zod';
import twilio from 'twilio';
import { normalizePhoneNumber } from '../twilio-service';

const router = express.Router();

const SENSITIVE_FIELDS = ['clientSecret', 'apiKey', 'authToken', 'refreshToken', 'accessToken'] as const;

function maskSensitiveFields(provider: CommunicationProvider): CommunicationProvider {
  const masked = { ...provider };
  for (const field of SENSITIVE_FIELDS) {
    if (masked[field]) {
      masked[field] = '••••••••';
    }
  }
  return masked;
}

router.get('/communication-providers', isAuthenticated, requirePermission('communications', 'view'), async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const providers = await storage.getCommunicationProviders(user.organizationId);
    const maskedProviders = providers.map(maskSensitiveFields);
    res.json(maskedProviders);
  } catch (error) {
    console.error('Error fetching communication providers:', error);
    res.status(500).json({ error: 'Failed to fetch communication providers' });
  }
});

router.get('/communication-providers/:id', isAuthenticated, requirePermission('communications', 'view'), async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid provider ID' });
    }

    const provider = await storage.getCommunicationProvider(id);
    if (!provider) {
      return res.status(404).json({ error: 'Communication provider not found' });
    }

    if (provider.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(maskSensitiveFields(provider));
  } catch (error) {
    console.error('Error fetching communication provider:', error);
    res.status(500).json({ error: 'Failed to fetch communication provider' });
  }
});

router.post('/communication-providers', isAuthenticated, requirePermission('communications', 'create'), async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const validationResult = insertCommunicationProviderSchema.safeParse({
      ...req.body,
      organizationId: user.organizationId
    });

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationResult.error.errors 
      });
    }

    if (validationResult.data.type === 'twilio' && validationResult.data.accountSid && validationResult.data.authToken) {
      try {
        const testClient = twilio(validationResult.data.accountSid, validationResult.data.authToken);
        await testClient.api.accounts(validationResult.data.accountSid).fetch();
      } catch (twilioError: any) {
        console.error('Twilio credential validation failed:', twilioError.message);
        return res.status(400).json({ 
          error: 'Invalid Twilio credentials. Please verify your Account SID and Auth Token are correct.',
          details: twilioError.message
        });
      }
    }

    if (validationResult.data.type === 'twilio' && validationResult.data.phoneNumber) {
      validationResult.data.phoneNumber = normalizePhoneNumber(validationResult.data.phoneNumber);
    }

    const provider = await storage.createCommunicationProvider(validationResult.data);
    res.status(201).json(maskSensitiveFields(provider));
  } catch (error) {
    console.error('Error creating communication provider:', error);
    res.status(500).json({ error: 'Failed to create communication provider' });
  }
});

router.patch('/communication-providers/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid provider ID' });
    }

    const existingProvider = await storage.getCommunicationProvider(id);
    if (!existingProvider) {
      return res.status(404).json({ error: 'Communication provider not found' });
    }

    if (existingProvider.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const partialSchema = insertCommunicationProviderSchema.partial();
    const validationResult = partialSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationResult.error.errors 
      });
    }

    const effectiveType = validationResult.data.type || existingProvider.type;
    const effectiveSid = validationResult.data.accountSid || existingProvider.accountSid;
    const effectiveToken = validationResult.data.authToken || existingProvider.authToken;

    if (effectiveType === 'twilio' && (validationResult.data.accountSid || validationResult.data.authToken) && effectiveSid && effectiveToken) {
      try {
        const testClient = twilio(effectiveSid, effectiveToken);
        await testClient.api.accounts(effectiveSid).fetch();
      } catch (twilioError: any) {
        console.error('Twilio credential validation failed:', twilioError.message);
        return res.status(400).json({ 
          error: 'Invalid Twilio credentials. Please verify your Account SID and Auth Token are correct.',
          details: twilioError.message
        });
      }
    }

    if (effectiveType === 'twilio' && validationResult.data.phoneNumber) {
      validationResult.data.phoneNumber = normalizePhoneNumber(validationResult.data.phoneNumber);
    }

    const updatedProvider = await storage.updateCommunicationProvider(id, validationResult.data);
    if (!updatedProvider) {
      return res.status(500).json({ error: 'Failed to update communication provider' });
    }

    res.json(maskSensitiveFields(updatedProvider));
  } catch (error) {
    console.error('Error updating communication provider:', error);
    res.status(500).json({ error: 'Failed to update communication provider' });
  }
});

router.delete('/communication-providers/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid provider ID' });
    }

    const existingProvider = await storage.getCommunicationProvider(id);
    if (!existingProvider) {
      return res.status(404).json({ error: 'Communication provider not found' });
    }

    if (existingProvider.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const deleted = await storage.deleteCommunicationProvider(id);
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete communication provider' });
    }

    res.json({ success: true, message: 'Communication provider deleted' });
  } catch (error) {
    console.error('Error deleting communication provider:', error);
    res.status(500).json({ error: 'Failed to delete communication provider' });
  }
});

export default router;
