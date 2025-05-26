import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { db } from '../db';
import { organizations, users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { isAuthenticated } from '../auth';

const router = Router();

// Gmail OAuth configuration
const getGmailOAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL || 'https://smartwaterpools.replit.app'}/api/email-providers/gmail/callback`
  );
};

/**
 * Initiate Gmail OAuth flow for email provider setup
 * GET /api/email-providers/gmail/auth
 */
router.get('/gmail/auth', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    if (!user || user.role !== 'org_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only organization administrators can configure email providers'
      });
    }

    const oauth2Client = getGmailOAuthClient();
    
    // Generate the URL that will be used for authorization
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: JSON.stringify({
        userId: user.id,
        organizationId: user.organizationId,
        provider: 'gmail'
      })
    });

    // Store the OAuth state in session for security
    if (req.session) {
      req.session.emailProviderOAuth = {
        state: 'pending',
        provider: 'gmail',
        userId: user.id,
        organizationId: user.organizationId,
        timestamp: Date.now()
      };
    }

    return res.json({
      success: true,
      authUrl: authorizeUrl,
      message: 'Please complete the Gmail authorization process'
    });

  } catch (error) {
    console.error('Error initiating Gmail OAuth:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate Gmail authorization'
    });
  }
});

/**
 * Handle Gmail OAuth callback
 * GET /api/email-providers/gmail/callback
 */
router.get('/gmail/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('Gmail OAuth error:', error);
      return res.redirect('/settings?error=gmail_auth_failed');
    }

    if (!code || !state) {
      return res.redirect('/settings?error=invalid_oauth_response');
    }

    // Parse state parameter
    let stateData;
    try {
      stateData = JSON.parse(state as string);
    } catch (e) {
      return res.redirect('/settings?error=invalid_state');
    }

    const { userId, organizationId, provider } = stateData;

    if (provider !== 'gmail') {
      return res.redirect('/settings?error=invalid_provider');
    }

    // Verify user exists and has permission
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      with: { organization: true }
    });

    if (!user || user.role !== 'org_admin' || user.organizationId !== organizationId) {
      return res.redirect('/settings?error=unauthorized');
    }

    // Exchange code for tokens
    const oauth2Client = getGmailOAuthClient();
    const { tokens } = await oauth2Client.getToken(code as string);
    
    oauth2Client.setCredentials(tokens);

    // Get user info to verify the email address
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    // Get email address from OAuth userinfo
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    const emailAddress = userInfo.data.email;

    if (!emailAddress) {
      return res.redirect('/settings?error=no_email_found');
    }

    // Store the email configuration securely
    const emailConfig = {
      provider: 'gmail',
      emailAddress,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expiry_date,
      configuredBy: userId,
      configuredAt: new Date().toISOString()
    };

    // Update organization with email configuration
    await db
      .update(organizations)
      .set({
        emailConfig: emailConfig,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, organizationId));

    // Clear OAuth session data
    if (req.session && req.session.emailProviderOAuth) {
      delete req.session.emailProviderOAuth;
    }

    return res.redirect('/settings?success=gmail_connected&email=' + encodeURIComponent(emailAddress));

  } catch (error) {
    console.error('Error handling Gmail OAuth callback:', error);
    return res.redirect('/settings?error=oauth_callback_failed');
  }
});

/**
 * Remove email provider connection
 * DELETE /api/email-providers/:provider
 */
router.delete('/:provider', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const user = req.user as any;

    if (!user || user.role !== 'org_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only organization administrators can configure email providers'
      });
    }

    if (provider !== 'gmail') {
      return res.status(400).json({
        success: false,
        message: 'Unsupported email provider'
      });
    }

    // Remove email configuration
    await db
      .update(organizations)
      .set({
        emailConfig: null,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, user.organizationId));

    return res.json({
      success: true,
      message: 'Email provider disconnected successfully'
    });

  } catch (error) {
    console.error('Error removing email provider:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove email provider'
    });
  }
});

/**
 * Get email provider status
 * GET /api/email-providers/status
 */
router.get('/status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    if (!user?.organizationId) {
      return res.status(400).json({
        success: false,
        message: 'No organization found'
      });
    }

    // Get organization email configuration
    const organization = await db.query.organizations.findFirst({
      where: (organizations, { eq }) => eq(organizations.id, user.organizationId)
    });

    const emailConfig = organization?.emailConfig as any;
    
    let status = {
      connected: false,
      provider: null,
      emailAddress: null,
      configuredAt: null,
      needsReauth: false
    };

    if (emailConfig) {
      status = {
        connected: true,
        provider: emailConfig.provider,
        emailAddress: emailConfig.emailAddress,
        configuredAt: emailConfig.configuredAt,
        needsReauth: emailConfig.tokenExpiry && emailConfig.tokenExpiry < Date.now()
      };
    }

    return res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error getting email provider status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get email provider status'
    });
  }
});

export default router;