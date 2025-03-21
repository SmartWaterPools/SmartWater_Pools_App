/**
 * Invitation API Routes
 * 
 * This file contains all API routes related to user invitations,
 * including creating, verifying, and accepting invitations.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { invitationTokens, insertInvitationTokenSchema, INVITATION_TOKEN_STATUS } from '../../shared/schema.js';
import { eq, and, ne } from 'drizzle-orm';
import { isAuthenticated, isAdmin, hashPassword } from '../auth.js';
import { emailService } from '../email-service.js';
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
    
    // Verify organization exists
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
      updatedAt: new Date(),
      createdBy: req.user?.id
    }).returning();
    
    if (!insertResult || insertResult.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create invitation'
      });
    }
    
    // Send the invitation email
    const emailSent = await emailService.sendUserInvitation(
      name,
      email,
      organization.name,
      role,
      token
    );
    
    if (!emailSent) {
      // If email sending fails, still return success but with a warning
      return res.json({
        success: true,
        warning: 'Invitation created but email could not be sent',
        invitation: {
          id: insertResult[0].id,
          email: insertResult[0].email,
          token: insertResult[0].token, // Include token for testing
          expiresAt: insertResult[0].expiresAt
        }
      });
    }
    
    // Return success
    return res.json({
      success: true,
      message: 'Invitation created and email sent successfully',
      invitation: {
        id: insertResult[0].id,
        email: insertResult[0].email,
        expiresAt: insertResult[0].expiresAt
      }
    });
    
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
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    // Find the invitation token
    const invitation = await db.query.invitationTokens.findFirst({
      where: (invite, { eq }) => eq(invite.token, token),
      with: {
        organization: true
      }
    });
    
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }
    
    // Check if invitation is expired
    if (invitation.status === 'expired' || invitation.expiresAt < new Date()) {
      // Mark as expired if not already
      if (invitation.status !== 'expired') {
        await db.update(invitationTokens)
          .set({ status: 'expired', updatedAt: new Date() })
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
      .set({ status: 'expired', updatedAt: new Date() })
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