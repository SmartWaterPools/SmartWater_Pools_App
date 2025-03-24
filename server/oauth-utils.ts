/**
 * OAuth Utilities
 * 
 * This module provides utility functions for OAuth operations,
 * particularly for handling the organization selection flow.
 */

import { getPendingOAuthUser, removePendingOAuthUser } from './oauth-pending-users';
import { IStorage } from './storage';
import { UserRole } from './permissions';
import { InvitationTokenStatus } from '@shared/schema';

// Define the interfaces for the verification results
interface InvalidInvitationResult {
  valid: false;
  message: string;
}

interface ValidInvitationResult {
  valid: true;
  organizationId: number;
  organizationName: string;
  role: string;
  invitationId: number;
}

export type InvitationVerificationResult = InvalidInvitationResult | ValidInvitationResult;

/**
 * Completes the OAuth user registration by creating a full user account
 * after the user has selected an organization.
 * 
 * @param googleId The Google ID of the pending OAuth user
 * @param organizationId The ID of the selected organization
 * @param role The role for the new user (default: 'client')
 * @param storage The storage interface
 * @param req Express request object (optional) - used for session access
 * @returns The newly created user or null if the pending user was not found
 */
export async function completeOAuthRegistration(
  googleId: string,
  organizationId: number,
  role: UserRole = 'client',
  storage: IStorage,
  req?: any
) {
  try {
    // Retrieve the pending OAuth user data - pass req for session access
    const pendingUser = getPendingOAuthUser(googleId, req);
    
    if (!pendingUser) {
      console.error(`Pending OAuth user not found for Google ID: ${googleId}`);
      return null;
    }
    
    console.log(`Completing OAuth registration for ${pendingUser.email} with organization ${organizationId}`);
    
    // Use email as username
    const username = pendingUser.email;
    
    // Create the user record in the database
    const newUser = await storage.createUser({
      username,
      password: null, // OAuth users don't have a password
      name: pendingUser.displayName,
      email: pendingUser.email,
      role: role,
      googleId: pendingUser.id,
      photoUrl: pendingUser.photoUrl,
      authProvider: 'google',
      organizationId,
      active: true
    });
    
    if (newUser) {
      console.log(`Successfully created user from OAuth:`, {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        organizationId: newUser.organizationId
      });
      
      // Clean up the pending user data - pass req for session access
      removePendingOAuthUser(googleId, req);
      
      return newUser;
    } else {
      console.error(`Failed to create user record for pending OAuth user:`, {
        googleId,
        email: pendingUser.email
      });
      return null;
    }
  } catch (error) {
    console.error(`Error in completeOAuthRegistration:`, error);
    return null;
  }
}

/**
 * Verifies if an invitation token is valid for joining an organization
 * 
 * @param invitationToken The invitation token
 * @param storage The storage interface
 * @returns An InvitationVerificationResult object with validation details
 */
export async function verifyInvitationToken(
  invitationToken: string,
  storage: IStorage
): Promise<InvitationVerificationResult> {
  try {
    // Get the invitation record
    const invitation = await storage.getInvitationByToken(invitationToken);
    
    if (!invitation) {
      console.log(`Invitation token not found: ${invitationToken}`);
      return {
        valid: false,
        message: 'Invitation not found'
      };
    }
    
    // Check if the invitation is still valid
    const now = new Date();
    const expiryDate = new Date(invitation.expiresAt);
    
    if (now > expiryDate) {
      console.log(`Invitation token expired: ${invitationToken}`);
      return {
        valid: false,
        message: 'Invitation has expired'
      };
    }
    
    // Check if the invitation has already been used
    if (invitation.status === 'accepted' as InvitationTokenStatus) {
      console.log(`Invitation token already used: ${invitationToken}`);
      return {
        valid: false,
        message: 'Invitation has already been used'
      };
    }
    
    // Get the organization details
    const organization = await storage.getOrganization(invitation.organizationId);
    
    if (!organization) {
      console.log(`Organization not found for invitation: ${invitationToken}`);
      return {
        valid: false,
        message: 'Organization not found'
      };
    }
    
    console.log(`Invitation token valid: ${invitationToken} for organization ${organization.name}`);
    
    return {
      valid: true,
      organizationId: organization.id,
      organizationName: organization.name,
      role: invitation.role,
      invitationId: invitation.id
    };
  } catch (error) {
    console.error(`Error verifying invitation token:`, error);
    return {
      valid: false,
      message: 'Error verifying invitation'
    };
  }
}