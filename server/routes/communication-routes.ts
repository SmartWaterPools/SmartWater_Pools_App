import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../auth';
import { insertCommunicationProviderSchema, type User, type CommunicationProvider } from '@shared/schema';
import { z } from 'zod';

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

router.get('/communication-providers', isAuthenticated, async (req: Request, res: Response) => {
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

router.get('/communication-providers/:id', isAuthenticated, async (req: Request, res: Response) => {
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

router.post('/communication-providers', isAuthenticated, async (req: Request, res: Response) => {
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
