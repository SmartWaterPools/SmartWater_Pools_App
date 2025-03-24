/**
 * OAuth API Routes
 * 
 * This file contains routes for handling the OAuth flow:
 * - Completing registration for pending OAuth users
 * - Organization selection and creation
 * - Handling invitation code validation
 */

import { Router, Request, Response } from 'express';
import { IStorage } from '../storage';
import { getPendingOAuthUser } from '../oauth-pending-users';
import { completeOAuthRegistration, verifyInvitationToken } from '../oauth-utils';
import { UserRole } from '../permissions';

export default function registerOAuthRoutes(router: Router, storage: IStorage) {
  /**
   * Complete OAuth registration
   * POST /api/oauth/complete-registration
   */
  router.post('/complete-registration', async (req: Request, res: Response) => {
    try {
      const { googleId, action, organizationName, organizationType, invitationCode } = req.body;

      if (!googleId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing Google ID' 
        });
      }

      // Verify the pending user exists - pass req for session access
      const pendingUser = getPendingOAuthUser(googleId, req);
      if (!pendingUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'Pending user not found. Your session may have expired.' 
        });
      }

      console.log(`Completing registration for pending OAuth user:`, {
        googleId,
        email: pendingUser.email,
        action
      });

      if (action === 'create') {
        // Creating a new organization
        if (!organizationName) {
          return res.status(400).json({ 
            success: false, 
            message: 'Organization name is required' 
          });
        }

        console.log('[OAUTH DEBUG] Creating organization with following details:', {
          name: organizationName,
          type: organizationType || 'company',
          email: pendingUser.email
        });

        // Clean and prepare organization slug
        let slug = organizationName.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')  // Replace non-alphanumeric with hyphens
          .replace(/-+/g, '-')         // Replace multiple hyphens with single hyphen
          .replace(/^-|-$/g, '');      // Remove leading and trailing hyphens
        
        // Make sure the slug isn't empty after cleaning
        if (!slug) {
          slug = 'org-' + Date.now();
        }
          
        console.log(`[OAUTH DEBUG] Creating organization with slug: ${slug}`);
        
        // Create a new organization with only the columns that exist in the database
        const organizationData = {
          name: organizationName,
          slug: slug,
          active: true,
          email: pendingUser.email,
          phone: null,
          address: null,
          city: null,
          state: null,
          zipCode: null,
          logo: null,
          type: organizationType || 'company',
          // Explicitly set the trial end date (14 days from now)
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        };

        console.log('[OAUTH DEBUG] Creating organization with data:', JSON.stringify(organizationData, null, 2));
        
        try {
          // Create the organization
          console.log('[OAUTH DEBUG] Calling storage.createOrganization...');
          const newOrganization = await storage.createOrganization(organizationData);
          console.log('[OAUTH DEBUG] Organization created successfully:', JSON.stringify(newOrganization, null, 2));

          if (!newOrganization) {
            console.error('createOrganization returned null or undefined');
            return res.status(500).json({ 
              success: false, 
              message: 'Failed to create organization' 
            });
          }

          // Create the user as an admin of the new organization
          const newUser = await completeOAuthRegistration(
            googleId,
            newOrganization.id,
            'org_admin', // Make the creator an admin of the new organization
            storage,
            req // Pass request object for session access
          );

          if (!newUser) {
            return res.status(500).json({ 
              success: false, 
              message: 'Failed to create user account' 
            });
          }

          // Log in the user
          req.login(newUser, (err) => {
            if (err) {
              console.error('Error logging in new user:', err);
              return res.status(500).json({ 
                success: false, 
                message: 'Failed to log in' 
              });
            }

            // Redirect to the pricing page to select a subscription
            return res.json({ 
              success: true, 
              message: 'Organization created successfully', 
              redirectTo: '/pricing',
              user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                organizationId: newUser.organizationId
              }
            });
          });
        } catch (error) {
          console.error('Error creating organization or user:', error);
          return res.status(500).json({ 
            success: false, 
            message: 'An unexpected error occurred while creating the organization: ' + (error instanceof Error ? error.message : String(error))
          });
        }
      } else if (action === 'join') {
        // Joining an existing organization with an invitation code
        if (!invitationCode) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invitation code is required' 
          });
        }

        try {
          // Verify the invitation
          const verificationResult = await verifyInvitationToken(invitationCode, storage);
          
          if (!verificationResult.valid) {
            return res.status(400).json({ 
              success: false, 
              message: verificationResult.message || 'Invalid invitation code' 
            });
          }

          // Use the role from the invitation or default to 'client'
          const role = (verificationResult.role as UserRole) || 'client';

          // Create the user in the invited organization using properly typed data
          const newUser = await completeOAuthRegistration(
            googleId,
            verificationResult.organizationId,
            role,
            storage,
            req // Pass request object for session access
          );

          if (!newUser) {
            return res.status(500).json({ 
              success: false, 
              message: 'Failed to create user account' 
            });
          }

          // Update the invitation to mark it as accepted
          if (verificationResult.invitationId) {
            await storage.updateInvitationToken(verificationResult.invitationId, {
              status: 'accepted'
            });
          }

          // Log in the user
          req.login(newUser, (err) => {
            if (err) {
              console.error('Error logging in new user:', err);
              return res.status(500).json({ 
                success: false, 
                message: 'Failed to log in' 
              });
            }

            // Redirect to the dashboard
            return res.json({ 
              success: true, 
              message: 'Successfully joined organization', 
              redirectTo: '/dashboard',
              user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                organizationId: newUser.organizationId
              }
            });
          });
        } catch (error) {
          console.error('Error joining organization:', error);
          return res.status(500).json({ 
            success: false, 
            message: 'An unexpected error occurred while joining the organization: ' + (error instanceof Error ? error.message : String(error))
          });
        }
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid action. Must be "create" or "join".' 
        });
      }
      } catch (error) {
        console.error('Error completing OAuth registration:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'An unexpected error occurred' 
        });
      }
  });

  /**
   * Get pending OAuth user details
   * GET /api/oauth/pending/:googleId
   */
  router.get('/pending/:googleId', (req: Request, res: Response) => {
    try {
      const { googleId } = req.params;
      
      if (!googleId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing Google ID' 
        });
      }

      const pendingUser = getPendingOAuthUser(googleId, req);
      
      if (!pendingUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'Pending user not found. Your session may have expired.' 
        });
      }

      // Return only the necessary user details, not the full profile
      return res.json({
        success: true,
        user: {
          googleId: pendingUser.id,
          email: pendingUser.email,
          displayName: pendingUser.displayName,
          photoUrl: pendingUser.photoUrl
        }
      });
    } catch (error) {
      console.error('Error fetching pending OAuth user:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'An unexpected error occurred' 
      });
    }
  });

  /**
   * Verify invitation token
   * GET /api/oauth/verify-invitation/:token
   */
  router.get('/verify-invitation/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing invitation token' 
        });
      }

      const verificationResult = await verifyInvitationToken(token, storage);
      
      if (!verificationResult.valid) {
        return res.json({ 
          success: false, 
          message: verificationResult.message || 'Invalid invitation code' 
        });
      }

      return res.json({
        success: true,
        organizationId: verificationResult.organizationId,
        organizationName: verificationResult.organizationName,
        role: verificationResult.role,
        invitationId: verificationResult.invitationId
      });
    } catch (error) {
      console.error('Error verifying invitation token:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'An unexpected error occurred while verifying the invitation' 
      });
    }
  });

  /**
   * Handle OAuth callback debug
   * GET /api/oauth/debug
   */
  router.get('/debug', (req: Request, res: Response) => {
    try {
      // For debugging purposes, return details about available pending users
      // Get all pending users from memory storage
      const pendingUsersFromMemory = Object.values(getPendingOAuthUsers());
      
      // Get session-based pending users if they exist
      const pendingUsersFromSession = req.session.pendingOAuthUsers || [];
      
      const debug = {
        user: req.user,
        isAuthenticated: req.isAuthenticated(),
        pendingUsersFromMemory,
        pendingUsersFromSession
      };
      
      return res.json({
        success: true,
        debug
      });
    } catch (error) {
      console.error('Error in OAuth debug endpoint:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'An unexpected error occurred' 
      });
    }
  });

  return router;
}