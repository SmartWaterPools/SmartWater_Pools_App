/**
 * Email API Routes
 * 
 * This file contains all API routes related to email functionality,
 * including password reset, two-factor authentication, and email verification.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { emailService, loadEmailConfigFromDatabase } from './email-service.js';
import { db } from './db.js';
import { users, communicationProviders } from '../shared/schema.js';
import { eq, and, ne } from 'drizzle-orm';
import { isAuthenticated, isAdmin, hashPassword } from './auth.js';

// Create the router
const router = Router();

// Validation schemas
const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

const passwordResetConfirmSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8),
});

const emailVerifySchema = z.object({
  token: z.string(),
});

const twoFactorAuthRequestSchema = z.object({
  email: z.string().email(),
});

const twoFactorAuthVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const testEmailSchema = z.object({
  recipient: z.string().email(),
});

/**
 * Request a password reset link
 * POST /api/email/password-reset/request
 */
router.post('/password-reset/request', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = passwordResetRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validationResult.error.errors
      });
    }
    
    const { email } = validationResult.data;
    
    // Find user by email
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email)
    });
    
    if (!user) {
      // For security reasons, don't reveal that the email doesn't exist
      // Instead, return a success response as if the email was sent
      return res.json({
        success: true,
        message: 'If your email exists in our system, you will receive a password reset link shortly.'
      });
    }
    
    // Send password reset email
    const result = await emailService.sendPasswordResetEmail(user);
    
    if (!result) {
      console.error('Failed to send password reset email');
      
      // Check if this is because dependencies are missing
      let nodemailerAvailable = false;
      let googleapisAvailable = false;
      
      try {
        require('nodemailer');
        nodemailerAvailable = true;
      } catch (error) {
        console.log('Nodemailer is not available');
      }
      
      try {
        require('googleapis');
        googleapisAvailable = true;
      } catch (error) {
        console.log('Googleapis is not available');
      }
      
      // If dependencies are missing, fake success in development
      if (process.env.NODE_ENV !== 'production' && (!nodemailerAvailable || !googleapisAvailable)) {
        console.log('----------------------------------------');
        console.log('DEVELOPMENT MODE: Simulating password reset email success');
        console.log(`A password reset token would have been sent to: ${user.email}`);
        console.log('----------------------------------------');
        
        return res.json({
          success: true,
          message: 'Password reset email sent. Please check your inbox.',
          dev_note: 'This is a simulated success. In development mode without email dependencies, no actual email is sent.'
        });
      }
      
      // In production or if dependencies are available but email failed
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please try again later.'
      });
    }
    
    return res.json({
      success: true,
      message: 'Password reset email sent. Please check your inbox.'
    });
    
  } catch (error) {
    console.error('Error in password reset request:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request'
    });
  }
});

/**
 * Reset password with token
 * POST /api/email/password-reset/confirm
 */
router.post('/password-reset/confirm', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = passwordResetConfirmSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validationResult.error.errors
      });
    }
    
    const { token, newPassword } = validationResult.data;
    
    // Verify token
    const userId = emailService.verifyToken(token, 'password-reset');
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update user password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
    
    return res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
    
  } catch (error) {
    console.error('Error in password reset confirmation:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request'
    });
  }
});

/**
 * Request 2FA code
 * POST /api/email/2fa/request
 */
router.post('/2fa/request', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = twoFactorAuthRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validationResult.error.errors
      });
    }
    
    const { email } = validationResult.data;
    
    // Find user by email
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email)
    });
    
    if (!user) {
      // For security reasons, don't reveal that the email doesn't exist
      return res.json({
        success: true,
        message: 'If your email exists in our system, you will receive a verification code shortly.'
      });
    }
    
    // Send 2FA code
    const code = await emailService.send2FACode(user);
    
    if (!code) {
      console.error('Failed to send 2FA code');
      
      // Check if this is because dependencies are missing
      let nodemailerAvailable = false;
      let googleapisAvailable = false;
      
      try {
        require('nodemailer');
        nodemailerAvailable = true;
      } catch (error) {
        console.log('Nodemailer is not available');
      }
      
      try {
        require('googleapis');
        googleapisAvailable = true;
      } catch (error) {
        console.log('Googleapis is not available');
      }
      
      // If dependencies are missing, fake success in development
      if (process.env.NODE_ENV !== 'production' && (!nodemailerAvailable || !googleapisAvailable)) {
        console.log('----------------------------------------');
        console.log('DEVELOPMENT MODE: Simulating 2FA code success');
        console.log(`A verification code would have been sent to: ${user.email}`);
        console.log('FOR TESTING PURPOSES ONLY: Verification code would be 123456');
        console.log('----------------------------------------');
        
        return res.json({
          success: true,
          message: 'Verification code sent. Please check your email.',
          dev_note: 'This is a simulated success. In development mode without email dependencies, no actual email is sent.'
        });
      }
      
      // In production or if dependencies are available but email failed
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code. Please try again later.'
      });
    }
    
    return res.json({
      success: true,
      message: 'Verification code sent. Please check your email.'
    });
    
  } catch (error) {
    console.error('Error in 2FA request:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request'
    });
  }
});

/**
 * Test email service connection
 * POST /api/email/test
 * (Protected admin route)
 */
router.post('/test', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = testEmailSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validationResult.error.errors
      });
    }
    
    const { recipient } = validationResult.data;
    
    // Check if email service is configured
    if (!emailService.hasCredentials()) {
      return res.status(400).json({
        success: false, 
        message: 'Email service is not configured. Please check the server settings.'
      });
    }
    
    // Test connection
    const connectionTest = await emailService.testConnection();
    
    if (!connectionTest) {
      return res.status(500).json({
        success: false,
        message: 'Failed to connect to the email service. Please check the credentials.'
      });
    }
    
    // If connection is successful, send a test email
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, recipient)
    });
    
    let result = false;
    
    if (user) {
      // Send a password reset email as a test
      result = await emailService.sendPasswordResetEmail(user);
    } else {
      // Create a temporary user object for testing
      const tempUser = {
        id: 0,
        username: 'test',
        email: recipient,
        name: 'Test User',
        role: 'admin',
        active: true,
        organizationId: 1,
        password: '',
        // Add required null values for phone and address
        phone: null,
        address: null
      };
      
      result = await emailService.sendPasswordResetEmail(tempUser);
    }
    
    if (result) {
      return res.json({
        success: true,
        message: 'Test email sent successfully. Please check the recipient inbox.'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send test email. The connection test passed but sending failed.'
      });
    }
  } catch (error) {
    console.error('Error in email test:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while testing the email service'
    });
  }
});

/**
 * Get email configuration status
 * GET /api/email/status
 * (Protected admin route)
 */
router.get('/status', isAuthenticated, isAdmin, (_req: Request, res: Response) => {
  const configured = emailService.hasCredentials();
  
  return res.json({
    success: true,
    configured,
    message: configured 
      ? 'Email service is configured and ready to use'
      : 'Email service is not configured. Please set up credentials.'
  });
});

/**
 * Get communication providers from database
 * GET /api/email/providers
 * (Protected admin route)
 */
router.get('/providers', isAuthenticated, isAdmin, async (_req: Request, res: Response) => {
  try {
    // Fetch all communication providers from database
    const providers = await db.query.communicationProviders.findMany({
      orderBy: (providers, { desc }) => [desc(providers.isDefault)]
    });
    
    // For security, mask sensitive fields
    const maskedProviders = providers.map(provider => ({
      ...provider,
      clientId: provider.clientId ? `${provider.clientId.substring(0, 5)}...` : null,
      clientSecret: provider.clientSecret ? '[MASKED]' : null,
      apiKey: provider.apiKey ? '[MASKED]' : null,
      authToken: provider.authToken ? '[MASKED]' : null,
      accountSid: provider.accountSid ? `${provider.accountSid.substring(0, 5)}...` : null,
      settings: provider.settings ? '[MASKED]' : null
    }));
    
    return res.json({
      success: true,
      providers: maskedProviders,
      count: providers.length,
      message: providers.length > 0 
        ? `Found ${providers.length} communication provider(s)`
        : 'No communication providers configured'
    });
  } catch (error) {
    console.error('Error fetching communication providers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch communication providers from database'
    });
  }
});

/**
 * Test API endpoint (no authentication required)
 * GET /api/email/email-test
 */
router.get('/email-test', async (_req: Request, res: Response) => {
  // Check if nodemailer and googleapis are available
  let nodemailerAvailable = false;
  let googleapisAvailable = false;
  
  // Use dynamic imports to check for package availability
  try {
    await import('nodemailer');
    nodemailerAvailable = true;
  } catch (error) {
    console.log('Nodemailer is not available');
  }
  
  try {
    await import('googleapis');
    googleapisAvailable = true;
  } catch (error) {
    console.log('Googleapis is not available');
  }
  
  // Check email service configuration
  const configured = emailService.hasCredentials();
  
  return res.json({
    success: true,
    emailServiceStatus: {
      configured: configured,
      dependencies: {
        nodemailer: nodemailerAvailable ? 'installed' : 'missing',
        googleapis: googleapisAvailable ? 'installed' : 'missing'
      },
      operationalStatus: configured && nodemailerAvailable && googleapisAvailable 
        ? 'fully operational' 
        : 'limited functionality',
      statusMessage: configured 
        ? 'Email service is configured' 
        : 'Email service is not configured'
    },
    message: 'Email service test endpoint'
  });
});

/**
 * Send invitation email to join organization
 * POST /api/email/invite
 * (Protected admin route)
 */
router.post('/invite', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { name, email, role, organizationId } = req.body;
    
    if (!name || !email || !role || !organizationId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields' 
      });
    }
    
    // Get organization info
    const organization = await db.query.organizations.findFirst({
      where: (organizations, { eq }) => eq(organizations.id, organizationId)
    });
    
    if (!organization) {
      return res.status(404).json({ 
        success: false,
        error: 'Organization not found' 
      });
    }
    
    // Generate a unique token for this invitation
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    // Get company name from organization
    const companyName = organization.name;
    
    // Send the invitation email
    const emailSent = await emailService.sendUserInvitation(
      name,
      email,
      companyName,
      role,
      token
    );
    
    if (emailSent) {
      return res.json({ 
        success: true, 
        message: 'Invitation email sent successfully',
        // Include token in response for development purposes
        ...(process.env.NODE_ENV !== 'production' ? { token } : {})
      });
    } else {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to send invitation email' 
      });
    }
  } catch (error) {
    console.error('Error sending invitation:', error);
    return res.status(500).json({ 
      success: false,
      error: 'An error occurred while sending invitation' 
    });
  }
});

/**
 * Create a new communication provider
 * POST /api/email/providers
 * (Protected admin route)
 */
router.post('/providers', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    // Simple validation - in a production implementation, this would use a more robust schema
    const { provider } = req.body;
    
    if (!provider || !provider.type || !provider.name) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider data. Type and name are required.'
      });
    }
    
    // For Gmail providers, ensure we have the minimum required fields
    if (provider.type === 'gmail' && (!provider.email || !provider.clientId || !provider.clientSecret)) {
      return res.status(400).json({
        success: false,
        message: 'Gmail provider requires email, clientId, and clientSecret fields'
      });
    }
    
    // Insert the provider into the database
    const result = await db.insert(communicationProviders).values({
      type: provider.type,
      name: provider.name,
      isDefault: provider.isDefault || false,
      isActive: provider.isActive || true,
      clientId: provider.clientId || null,
      clientSecret: provider.clientSecret || null,
      apiKey: provider.apiKey || null,
      accountSid: provider.accountSid || null,
      authToken: provider.authToken || null,
      email: provider.email || null,
      phoneNumber: provider.phoneNumber || null,
      settings: provider.settings || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    // If this is set as the default, update other providers of the same type
    if (provider.isDefault) {
      await db.update(communicationProviders)
        .set({ isDefault: false })
        .where(
          and(
            eq(communicationProviders.type, provider.type),
            ne(communicationProviders.id, result[0].id)
          )
        );
    }
    
    // Reload the email configuration
    await loadEmailConfigFromDatabase();
    
    // Return success
    return res.json({
      success: true,
      provider: {
        ...result[0],
        clientId: result[0].clientId ? `${result[0].clientId.substring(0, 5)}...` : null,
        clientSecret: result[0].clientSecret ? '[MASKED]' : null,
        apiKey: result[0].apiKey ? '[MASKED]' : null,
        authToken: result[0].authToken ? '[MASKED]' : null,
        accountSid: result[0].accountSid ? `${result[0].accountSid.substring(0, 5)}...` : null,
        settings: result[0].settings ? '[MASKED]' : null
      },
      message: 'Communication provider created successfully'
    });
    
  } catch (error) {
    console.error('Error creating communication provider:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create communication provider'
    });
  }
});

/**
 * Update an existing communication provider
 * PATCH /api/email/providers/:id
 * (Protected admin route)
 */
router.patch('/providers/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const providerId = parseInt(id);
    
    if (isNaN(providerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider ID'
      });
    }
    
    // Get the provider to update
    const existingProvider = await db.query.communicationProviders.findFirst({
      where: (providers, { eq }) => eq(providers.id, providerId)
    });
    
    if (!existingProvider) {
      return res.status(404).json({
        success: false,
        message: 'Communication provider not found'
      });
    }
    
    const { provider } = req.body;
    
    // Update the provider
    const result = await db.update(communicationProviders)
      .set({
        name: provider.name || existingProvider.name,
        isDefault: provider.isDefault !== undefined ? provider.isDefault : existingProvider.isDefault,
        isActive: provider.isActive !== undefined ? provider.isActive : existingProvider.isActive,
        clientId: provider.clientId || existingProvider.clientId,
        clientSecret: provider.clientSecret || existingProvider.clientSecret,
        apiKey: provider.apiKey || existingProvider.apiKey,
        accountSid: provider.accountSid || existingProvider.accountSid,
        authToken: provider.authToken || existingProvider.authToken,
        email: provider.email || existingProvider.email,
        phoneNumber: provider.phoneNumber || existingProvider.phoneNumber,
        settings: provider.settings || existingProvider.settings,
        updatedAt: new Date()
      })
      .where(eq(communicationProviders.id, providerId))
      .returning();
    
    // If this is set as the default, update other providers of the same type
    if (provider.isDefault) {
      await db.update(communicationProviders)
        .set({ isDefault: false })
        .where(
          and(
            eq(communicationProviders.type, existingProvider.type),
            ne(communicationProviders.id, providerId)
          )
        );
    }
    
    // Reload the email configuration
    await loadEmailConfigFromDatabase();
    
    // Return success
    return res.json({
      success: true,
      provider: {
        ...result[0],
        clientId: result[0].clientId ? `${result[0].clientId.substring(0, 5)}...` : null,
        clientSecret: result[0].clientSecret ? '[MASKED]' : null,
        apiKey: result[0].apiKey ? '[MASKED]' : null,
        authToken: result[0].authToken ? '[MASKED]' : null,
        accountSid: result[0].accountSid ? `${result[0].accountSid.substring(0, 5)}...` : null,
        settings: result[0].settings ? '[MASKED]' : null
      },
      message: 'Communication provider updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating communication provider:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update communication provider'
    });
  }
});

export default router;