/**
 * Invitation API Routes
 * 
 * This file contains all API routes related to user invitations,
 * including creating, verifying, and accepting invitations.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { invitationTokens, insertInvitationTokenSchema, INVITATION_TOKEN_STATUS, users, technicians, clients } from '@shared/schema';
import { eq, and, ne } from 'drizzle-orm';
import { isAuthenticated, isAdmin, hashPassword } from '../auth.js';
import { sendGmailMessage, UserTokens } from '../services/gmail-client.js';
import { storage } from '../storage.js';
import { emailTemplates } from '../email-config.js';
import crypto from 'crypto';

// Create the router
const router = Router();

// Validation schemas
const createInvitationSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.string(),
  organizationId: z.number().positive(),
});

const verifyInvitationSchema = z.object({
  token: z.string(),
});

/**
 * Create a new invitation
 * POST /api/invitations
 * (Protected admin route)
 */
router.post('/', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = createInvitationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validationResult.error.errors
      });
    }
    
    const { name, email, role, organizationId } = validationResult.data;
    const currentUser = req.user as any;
    
    if (currentUser.role !== 'system_admin' && organizationId !== currentUser.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'You can only invite users to your own organization'
      });
    }
    
    const organization = await db.query.organizations.findFirst({
      where: (orgs, { eq }) => eq(orgs.id, organizationId)
    });
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }
    
    // Check if user already exists with this email
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email)
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }
    
    // Check if there's already an active invitation for this email
    const existingInvitation = await db.query.invitationTokens.findFirst({
      where: (invite, { eq, and }) => and(
        eq(invite.email, email),
        eq(invite.status, 'pending')
      )
    });
    
    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: 'An invitation has already been sent to this email address'
      });
    }
    
    // Generate a unique token for the invitation
    const token = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Create the invitation token in the database
    const insertResult = await db.insert(invitationTokens).values({
      token,
      email,
      name,
      role,
      organizationId,
      status: 'pending',
      expiresAt,
      createdAt: new Date(),
      createdBy: req.user?.id
    }).returning();
    
    if (!insertResult || insertResult.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create invitation'
      });
    }
    
    console.log('Preparing to send invitation email:');
    console.log('- Name:', name);
    console.log('- Email:', email);
    console.log('- Organization:', organization.name);
    console.log('- Role:', role);
    console.log('- Token:', token.substring(0, 8) + '...');
    
    try {
      const currentUser = await storage.getUser((req.user as any).id);
      
      let baseUrl = process.env.APP_URL || 'https://smartwaterpools.replit.app';
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
      const inviteLink = `${baseUrl}/invite?token=${token}`;
      
      const subject = emailTemplates.userInvitation.subject;
      const htmlBody = emailTemplates.userInvitation.html(name, organization.name, inviteLink, role);
      
      let emailSent = false;
      let emailWarning = '';
      
      if (currentUser?.gmailAccessToken) {
        const userTokens: UserTokens = {
          userId: currentUser.id,
          gmailAccessToken: currentUser.gmailAccessToken,
          gmailRefreshToken: currentUser.gmailRefreshToken,
          gmailTokenExpiresAt: currentUser.gmailTokenExpiresAt,
          gmailConnectedEmail: currentUser.gmailConnectedEmail,
        };
        
        const result = await sendGmailMessage(email, subject, htmlBody, true, userTokens);
        emailSent = result !== null;
      }
      
      if (!emailSent) {
        emailWarning = 'Invitation created but email could not be sent. Please connect your Gmail account in Settings to enable email sending, or share the invitation link manually.';
        console.log(`[Invitation] Email not sent - user Gmail not connected. Invitation link: ${inviteLink}`);
      }
      
      return res.json({
        success: true,
        message: emailSent ? 'Invitation sent successfully' : 'Invitation created',
        invitation: insertResult[0],
        inviteLink,
        emailSent,
        emailWarning: emailWarning || undefined,
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      return res.json({
        success: true,
        message: 'Invitation created but email sending failed',
        invitation: insertResult[0],
        emailSent: false,
        emailWarning: 'Failed to send invitation email. You can share the invitation link manually.',
      });
    }
    
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating the invitation'
    });
  }
});

/**
 * Verify an invitation token
 * GET /api/invitations/verify
 */
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    
    console.log(`[Invitation] Verifying token: ${token ? token.substring(0, 8) + '...' : 'undefined'}`);
    
    if (!token) {
      console.log('[Invitation] Verification failed: No token provided');
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    // Find the invitation token
    console.log('[Invitation] Searching for token in database...');
    const invitation = await db.query.invitationTokens.findFirst({
      where: (invite, { eq }) => eq(invite.token, token),
      with: {
        organization: true
      }
    });
    
    if (!invitation) {
      console.log('[Invitation] Verification failed: Token not found in database');
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }
    
    console.log(`[Invitation] Found invitation for: ${invitation.email}`);
    console.log(`[Invitation] Organization: ${invitation.organization?.name || 'Unknown'} (ID: ${invitation.organizationId})`);
    console.log(`[Invitation] Status: ${invitation.status}, Expires: ${invitation.expiresAt}`);
    
    // Check if invitation is expired
    if (invitation.status === 'expired' || invitation.expiresAt < new Date()) {
      console.log('[Invitation] Verification failed: Invitation has expired');
      // Mark as expired if not already
      if (invitation.status !== 'expired') {
        console.log('[Invitation] Updating status to expired');
        await db.update(invitationTokens)
          .set({ status: 'expired' })
          .where(eq(invitationTokens.id, invitation.id));
      }
      
      return res.status(400).json({
        success: false,
        message: 'Invitation has expired'
      });
    }
    
    // Check if invitation has already been accepted
    if (invitation.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Invitation has already been used'
      });
    }
    
    // Return invitation details
    return res.json({
      success: true,
      invitation: {
        name: invitation.name,
        email: invitation.email,
        role: invitation.role,
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name
        },
        expiresAt: invitation.expiresAt
      }
    });
    
  } catch (error) {
    console.error('Error verifying invitation:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while verifying the invitation'
    });
  }
});

/**
 * Accept an invitation and create a new user account
 * POST /api/invitations/accept
 * (Public route - no auth required)
 */
router.post('/accept', async (req: Request, res: Response) => {
  try {
    const { token, password, username } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const invitation = await db.query.invitationTokens.findFirst({
      where: (invite, { eq }) => eq(invite.token, token),
      with: { organization: true }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Invitation has already been used or is no longer valid'
      });
    }

    if (invitation.expiresAt < new Date()) {
      await db.update(invitationTokens)
        .set({ status: 'expired' })
        .where(eq(invitationTokens.id, invitation.id));
      return res.status(400).json({
        success: false,
        message: 'Invitation has expired'
      });
    }

    const existingUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, invitation.email)
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    const hashedPassword = await hashPassword(password);
    const userUsername = username || invitation.email;

    const [newUser] = await db.insert(users).values({
      username: userUsername,
      password: hashedPassword,
      name: invitation.name,
      email: invitation.email,
      role: invitation.role,
      organizationId: invitation.organizationId,
      active: true,
      authProvider: 'local',
    }).returning();

    if (invitation.role === 'technician') {
      await db.insert(technicians).values({
        userId: newUser.id,
      });
    }

    if (invitation.role === 'client') {
      await db.insert(clients).values({
        userId: newUser.id,
        organizationId: invitation.organizationId,
      });
    }

    await db.update(invitationTokens)
      .set({ status: 'accepted' })
      .where(eq(invitationTokens.id, invitation.id));

    console.log(`[Invitation] User account created for ${invitation.email} with role ${invitation.role}`);

    return res.json({
      success: true,
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while accepting the invitation'
    });
  }
});

/**
 * Resend an invitation email
 * POST /api/invitations/:id/resend
 * (Protected admin route)
 */
router.post('/:id/resend', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invitationId = parseInt(id);

    if (isNaN(invitationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invitation ID'
      });
    }

    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User has no associated organization'
      });
    }

    const invitation = await db.query.invitationTokens.findFirst({
      where: (invite, { eq, and }) => and(
        eq(invite.id, invitationId),
        eq(invite.organizationId, organizationId)
      ),
      with: { organization: true }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found or not accessible'
      });
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await db.update(invitationTokens)
      .set({ token: newToken, expiresAt: newExpiresAt, status: 'pending' })
      .where(eq(invitationTokens.id, invitationId));

    let emailSent = false;
    let emailWarning = '';

    try {
      const currentUser = await storage.getUser((req.user as any).id);

      let baseUrl = process.env.APP_URL || 'https://smartwaterpools.replit.app';
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
      const inviteLink = `${baseUrl}/invite?token=${newToken}`;

      const subject = emailTemplates.userInvitation.subject;
      const htmlBody = emailTemplates.userInvitation.html(invitation.name, invitation.organization.name, inviteLink, invitation.role);

      if (currentUser?.gmailAccessToken) {
        const userTokens: UserTokens = {
          userId: currentUser.id,
          gmailAccessToken: currentUser.gmailAccessToken,
          gmailRefreshToken: currentUser.gmailRefreshToken,
          gmailTokenExpiresAt: currentUser.gmailTokenExpiresAt,
          gmailConnectedEmail: currentUser.gmailConnectedEmail,
        };

        const result = await sendGmailMessage(invitation.email, subject, htmlBody, true, userTokens);
        emailSent = result !== null;
      }

      if (!emailSent) {
        emailWarning = 'Invitation updated but email could not be sent. Please connect your Gmail account in Settings or share the invitation link manually.';
      }
    } catch (emailError) {
      console.error('Error sending resend invitation email:', emailError);
      emailWarning = 'Invitation updated but email sending failed.';
    }

    return res.json({
      success: true,
      emailSent,
      emailWarning: emailWarning || undefined,
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while resending the invitation'
    });
  }
});

/**
 * List all invitations for an organization
 * GET /api/invitations
 * (Protected admin route)
 */
router.get('/', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    // Get organization ID from authenticated user
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User has no associated organization'
      });
    }
    
    // Get all invitations for this organization
    const invitations = await db.query.invitationTokens.findMany({
      where: (invite, { eq }) => eq(invite.organizationId, organizationId),
      orderBy: (invite, { desc }) => [desc(invite.createdAt)]
    });
    
    // Mask tokens for security
    const maskedInvitations = invitations.map(invitation => ({
      ...invitation,
      token: `${invitation.token.substring(0, 8)}...`
    }));
    
    return res.json({
      success: true,
      invitations: maskedInvitations
    });
    
  } catch (error) {
    console.error('Error listing invitations:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while listing invitations'
    });
  }
});

/**
 * Cancel an invitation
 * DELETE /api/invitations/:id
 * (Protected admin route)
 */
router.delete('/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invitationId = parseInt(id);
    
    if (isNaN(invitationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invitation ID'
      });
    }
    
    // Get organization ID from authenticated user
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User has no associated organization'
      });
    }
    
    // Find the invitation
    const invitation = await db.query.invitationTokens.findFirst({
      where: (invite, { eq, and }) => and(
        eq(invite.id, invitationId),
        eq(invite.organizationId, organizationId)
      )
    });
    
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found or not accessible'
      });
    }
    
    // Mark as expired instead of deleting
    await db.update(invitationTokens)
      .set({ status: 'expired' })
      .where(eq(invitationTokens.id, invitationId));
    
    return res.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });
    
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while cancelling the invitation'
    });
  }
});

export default router;