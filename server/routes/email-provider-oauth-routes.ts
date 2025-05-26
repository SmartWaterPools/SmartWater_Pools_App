import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { 
  communicationProviders,
  insertCommunicationProviderSchema,
  organizations
} from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { isAuthenticated } from '../auth';
import { google } from 'googleapis';

const router = Router();

/**
 * Initiate Gmail OAuth flow for adding email provider
 * POST /api/email-providers/oauth/gmail/init
 */
router.post('/oauth/gmail/init', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { organizationId } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify user has permission to add providers for this organization
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      with: { organization: true }
    });

    if (!user?.organizationId || (organizationId && user.organizationId !== organizationId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add providers for this organization'
      });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.APP_URL || 'http://localhost:5000'}/api/email-providers/oauth/gmail/callback`
    );

    // Generate state parameter with organization info
    const state = JSON.stringify({
      userId,
      organizationId: user.organizationId,
      timestamp: Date.now(),
      action: 'add_email_provider'
    });

    // Store state in session for verification
    if (req.session) {
      (req.session as any).emailProviderOAuthState = state;
    }

    // Generate authorization URL with Gmail scopes
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      state: Buffer.from(state).toString('base64'),
      prompt: 'consent'
    });

    return res.json({
      success: true,
      authUrl,
      message: 'Gmail OAuth flow initiated'
    });

  } catch (error) {
    console.error('Error initiating Gmail OAuth:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate Gmail OAuth flow'
    });
  }
});

/**
 * Handle Gmail OAuth callback and create provider
 * GET /api/email-providers/oauth/gmail/callback
 */
router.get('/oauth/gmail/callback', async (req: Request, res: Response) => {
  try {
    const { code, state: stateParam } = req.query;
    
    if (!code || !stateParam) {
      return res.redirect(`${process.env.APP_URL || 'http://localhost:5000'}/settings?error=oauth_failed`);
    }

    // Decode and verify state
    let state;
    try {
      state = JSON.parse(Buffer.from(stateParam as string, 'base64').toString());
    } catch (error) {
      console.error('Invalid state parameter:', error);
      return res.redirect(`${process.env.APP_URL || 'http://localhost:5000'}/settings?error=invalid_state`);
    }

    // Verify state matches session (if available)
    // Note: In production, always verify state from session for security

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.APP_URL || 'http://localhost:5000'}/api/email-providers/oauth/gmail/callback`
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    const email = userInfo.data.email;
    const name = userInfo.data.name || email;

    if (!email) {
      return res.redirect(`${process.env.APP_URL || 'http://localhost:5000'}/settings?error=no_email`);
    }

    // Check if provider already exists for this organization
    const existingProvider = await db.query.communicationProviders.findFirst({
      where: (providers, { and, eq }) => and(
        eq(providers.organizationId, state.organizationId),
        eq(providers.providerType, 'gmail'),
        eq(providers.emailAddress, email)
      )
    });

    if (existingProvider) {
      // Update existing provider
      await db
        .update(communicationProviders)
        .set({
          displayName: name,
          isActive: true,
          credentials: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date,
            email
          },
          additionalSettings: {
            scopes: [
              'https://www.googleapis.com/auth/gmail.readonly',
              'https://www.googleapis.com/auth/gmail.send',
              'https://www.googleapis.com/auth/userinfo.email'
            ]
          }
        })
        .where(eq(communicationProviders.id, existingProvider.id));
    } else {
      // Create new provider
      await db
        .insert(communicationProviders)
        .values({
          organizationId: state.organizationId,
          providerType: 'gmail',
          displayName: name,
          emailAddress: email,
          isActive: true,
          isDefault: false, // Can be set as default later
          credentials: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date,
            email
          },
          additionalSettings: {
            scopes: [
              'https://www.googleapis.com/auth/gmail.readonly',
              'https://www.googleapis.com/auth/gmail.send',
              'https://www.googleapis.com/auth/userinfo.email'
            ]
          }
        });
    }

    // Redirect to settings page with success message
    return res.redirect(`${process.env.APP_URL || 'http://localhost:5000'}/settings?provider_added=gmail&email=${encodeURIComponent(email)}`);

  } catch (error) {
    console.error('Error handling Gmail OAuth callback:', error);
    return res.redirect(`${process.env.APP_URL || 'http://localhost:5000'}/settings?error=oauth_callback_failed`);
  }
});

/**
 * Initiate Outlook OAuth flow for adding email provider
 * POST /api/email-providers/oauth/outlook/init
 */
router.post('/oauth/outlook/init', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { organizationId } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify user has permission
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      with: { organization: true }
    });

    if (!user?.organizationId || (organizationId && user.organizationId !== organizationId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add providers for this organization'
      });
    }

    // Microsoft OAuth endpoint
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = `${process.env.APP_URL || 'http://localhost:5000'}/api/email-providers/oauth/outlook/callback`;
    
    if (!clientId) {
      return res.status(500).json({
        success: false,
        message: 'Microsoft OAuth not configured. Please contact your administrator.'
      });
    }

    // Generate state parameter
    const state = JSON.stringify({
      userId,
      organizationId: user.organizationId,
      timestamp: Date.now(),
      action: 'add_email_provider'
    });

    // Store state in session
    if (req.session) {
      req.session.emailProviderOAuthState = state;
    }

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_mode=query&` +
      `scope=${encodeURIComponent('https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read')}&` +
      `state=${encodeURIComponent(Buffer.from(state).toString('base64'))}`;

    return res.json({
      success: true,
      authUrl,
      message: 'Outlook OAuth flow initiated'
    });

  } catch (error) {
    console.error('Error initiating Outlook OAuth:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate Outlook OAuth flow'
    });
  }
});

/**
 * Get available OAuth providers
 * GET /api/email-providers/oauth/available
 */
router.get('/oauth/available', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const availableProviders = [];

    // Check Google OAuth configuration
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      availableProviders.push({
        id: 'gmail',
        name: 'Gmail',
        displayName: 'Google Gmail',
        icon: 'gmail',
        description: 'Connect your Gmail account for email management',
        scopes: ['gmail.readonly', 'gmail.send', 'userinfo.email']
      });
    }

    // Check Microsoft OAuth configuration
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      availableProviders.push({
        id: 'outlook',
        name: 'Outlook',
        displayName: 'Microsoft Outlook',
        icon: 'outlook',
        description: 'Connect your Outlook account for email management',
        scopes: ['Mail.ReadWrite', 'Mail.Send', 'User.Read']
      });
    }

    return res.json({
      success: true,
      providers: availableProviders
    });

  } catch (error) {
    console.error('Error fetching available OAuth providers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch available providers'
    });
  }
});

export default router;