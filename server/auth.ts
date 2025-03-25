import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy, VerifyCallback } from 'passport-google-oauth20';
import { Request } from 'express';
import bcrypt from 'bcrypt';
import { User } from '@shared/schema';
import { IStorage } from './storage';
import { UserRole, ResourceType, ActionType, hasPermission, checkPermission } from './permissions';

export function configurePassport(storage: IStorage) {
  // Serialize user to the session
  passport.serializeUser((user: any, done) => {
    console.log(`Serializing user to session:`, { id: user.id, username: user.username });
    done(null, user.id);
  });
  
  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user from session with ID: ${id}`);
      const user = await storage.getUser(id);
      
      if (!user) {
        console.error(`Failed to deserialize user: User with ID ${id} not found`);
        return done(null, false);
      }
      
      console.log(`Successfully deserialized user:`, { 
        id: user.id, 
        username: user.username,
        role: user.role
      });
      
      done(null, user);
    } catch (error) {
      console.error(`Error deserializing user:`, error);
      done(error);
    }
  });
  
  // Configure local strategy for username/password authentication
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password',
      },
      async (username, password, done) => {
        try {
          // Find the user by username
          const user = await storage.getUserByUsername(username);
          
          // If user not found or inactive
          if (!user || !user.active) {
            return done(null, false, { message: 'Invalid username or password' });
          }
          
          // Check if the stored password is a bcrypt hash
          let isValidPassword = false;
          
          if (user.password && (user.password.startsWith('$2b$') || user.password.startsWith('$2a$'))) {
            // Use bcrypt comparison for hashed passwords
            isValidPassword = await bcrypt.compare(password, user.password);
          } else if (user.password) {
            // For plain text passwords (temporary during migration)
            isValidPassword = password === user.password;
            
            // If password is correct, update it to a hashed version
            if (isValidPassword) {
              const hashedPassword = await hashPassword(password);
              await storage.updateUser(user.id, { password: hashedPassword });
              console.log(`Updated password hash for user: ${user.username}`);
            }
          } else {
            // No password set (OAuth user)
            isValidPassword = false;
          }
          
          if (!isValidPassword) {
            return done(null, false, { message: 'Invalid username or password' });
          }
          
          // Authentication successful
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  
  // Configure Google OAuth strategy
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  
  // Determine the environment and set appropriate callback URL
  let callbackURL = 'http://localhost:5000/api/auth/google/callback';
  
  // Check if we're running in Replit environment
  if (process.env.REPL_ID && process.env.REPL_SLUG && process.env.REPL_OWNER) {
    // Always use the production domain since that's where users are logging in from
    callbackURL = `https://smartwaterpools.replit.app/api/auth/google/callback`;
    console.log(`Running in Replit environment. Using production callback URL: ${callbackURL}`);
  } else if (process.env.GOOGLE_CALLBACK_URL) {
    callbackURL = process.env.GOOGLE_CALLBACK_URL;
    console.log(`Using callback URL from environment: ${callbackURL}`);
  }
  
  console.log(`Google OAuth callback URL configured as: ${callbackURL}`);
  
  // Explicitly check that the required environment variables are available
  if (!GOOGLE_CLIENT_ID) {
    console.error('GOOGLE_CLIENT_ID environment variable is missing!');
  }
  
  if (!GOOGLE_CLIENT_SECRET) {
    console.error('GOOGLE_CLIENT_SECRET environment variable is missing!');
  }
  
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: callbackURL,
          scope: ['profile', 'email'],
          // Enable both proxy trust and pass request object for better session handling
          proxy: true,
          passReqToCallback: true
        },
        async (req, accessToken, refreshToken, profile, done) => {
          // Log session information for debugging
          console.log(`[OAUTH DEBUG] Google callback with session ID:`, req.sessionID);
          console.log(`[OAUTH DEBUG] Session cookie:`, req.session?.cookie);
          try {
            if (!profile || !profile.id) {
              console.error('Invalid Google profile received', profile);
              return done(new Error('Invalid Google profile'), false);
            }
            
            // Extract primary email from profile
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase() : '';
            
            if (!email) {
              console.error('No email found in Google profile', profile);
              return done(new Error('No email address provided by Google'), false);
            }
            
            console.log(`Google authentication for email: ${email}`);
            console.log(`Google profile:`, {
              id: profile.id,
              displayName: profile.displayName,
              email: email,
              hasEmails: profile.emails ? profile.emails.length : 0,
              hasPhotos: profile.photos ? profile.photos.length : 0
            });
            
            // Step 1: Check if user already exists with this Google ID
            console.log(`Looking up user by Google ID: ${profile.id}`);
            let existingUser = await storage.getUserByGoogleId(profile.id);
            
            if (existingUser) {
              console.log(`Found existing user by Google ID: ${profile.id}`, {
                id: existingUser.id,
                username: existingUser.username,
                role: existingUser.role,
                active: existingUser.active
              });
              
              // Check if user is active
              if (!existingUser.active) {
                console.log(`User ${existingUser.id} is inactive, rejecting login`);
                return done(null, false, { message: 'This account has been deactivated' });
              }
              
              // Update photo URL if it changed
              if (profile.photos && profile.photos[0] && profile.photos[0].value !== existingUser.photoUrl) {
                console.log(`Updating user photo URL`);
                existingUser = await storage.updateUser(existingUser.id, {
                  photoUrl: profile.photos[0].value
                }) || existingUser;
              }
              
              // If user exists and is active, return the user
              return done(null, existingUser);
            }
            
            // Step 2: If no user found by Google ID, check if user exists with the same email
            // This is the case where a user registered with email/password or was created by admin
            // and now they're trying to sign in with Google using the same email
            try {
              console.log(`No user found with Google ID ${profile.id}. Looking up by email: ${email}`);
              const userWithEmail = await storage.getUserByEmail(email);
              
              if (userWithEmail) {
                console.log(`Found existing user with email ${email}:`, {
                  id: userWithEmail.id,
                  username: userWithEmail.username,
                  role: userWithEmail.role,
                  active: userWithEmail.active, 
                  hasGoogleId: !!userWithEmail.googleId
                });
                
                // Check if the user was previously deleted or inactive
                if (!userWithEmail.active) {
                  // For previously deleted users, reactivate the account and treat as a new sign up
                  console.log(`User ${userWithEmail.id} was previously deactivated. Treating as a new registration.`);
                  
                  // Reactivate the user account and update with Google credentials
                  const updatedUser = await storage.updateUser(userWithEmail.id, {
                    googleId: profile.id,
                    photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                    authProvider: 'google',
                    active: true
                    // Note: createdAt cannot be updated through updateUser,
                    // would need a direct database query to modify this field
                  });
                  
                  if (updatedUser) {
                    console.log(`Successfully reactivated previously deleted user and updated Google credentials:`, {
                      id: updatedUser.id,
                      email: updatedUser.email,
                      googleId: updatedUser.googleId,
                      role: updatedUser.role
                    });
                    // Set a flag to indicate this is a reactivated user that should go through subscription flow
                    (updatedUser as any).isReactivated = true;
                    return done(null, updatedUser);
                  } else {
                    console.error(`Failed to reactivate user with Google credentials`);
                    return done(new Error('Failed to reactivate user in database'), false);
                  }
                }
                
                // Case-insensitive comparison to handle email casing differences
                if (userWithEmail.email.toLowerCase() === email.toLowerCase()) {
                  console.log(`Email match confirmed. Linking Google account to existing user: ${userWithEmail.id}`);
                  
                  // Link Google account to existing user
                  const updatedUser = await storage.updateUser(userWithEmail.id, {
                    googleId: profile.id,
                    photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                    authProvider: 'google'
                  });
                  
                  if (updatedUser) {
                    console.log(`Successfully linked Google account to existing user:`, {
                      id: updatedUser.id,
                      email: updatedUser.email,
                      googleId: updatedUser.googleId,
                      role: updatedUser.role
                    });
                    return done(null, updatedUser);
                  } else {
                    console.error(`Failed to update user with Google credentials - updateUser returned undefined`);
                    return done(new Error('Failed to update user in database'), false);
                  }
                } else {
                  console.log(`Email case mismatch: ${userWithEmail.email} vs ${email}, still linking accounts`);
                  
                  // Continue with linking as above, same logic applies for case-insensitive matches
                  const updatedUser = await storage.updateUser(userWithEmail.id, {
                    googleId: profile.id,
                    photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                    authProvider: 'google'
                  });
                  
                  if (updatedUser) {
                    return done(null, updatedUser);
                  } else {
                    return done(new Error('Failed to update user in database'), false);
                  }
                }
              } else {
                console.log(`No existing user found with email: ${email}, creating new user`);
              }
            } catch (error) {
              console.error(`Error finding user by email ${email}:`, error);
              // Continue to create new user if there's an error looking up by email
            }
            
            // Handle new user from OAuth differently - create a temporary pending user
            // instead of automatically assigning to a default organization
            const displayName = profile.displayName || 
                               (profile.name ? `${profile.name.givenName} ${profile.name.familyName}` : 
                                email.split('@')[0]);
            
            // Special case for Travis@SmartWaterPools.com - assign directly to SmartWater Pools
            if (email.toLowerCase() === 'travis@smartwaterpools.com') {
              try {
                // Use email as username directly
                const username = email;
                console.log(`Special case: Creating system admin user for ${email}`);
                
                // Get SmartWater Pools organization
                const organization = await storage.getOrganizationBySlug('smartwater-pools');
                if (!organization) {
                  console.error('SmartWater Pools organization not found');
                  return done(new Error('Default organization not found'), false);
                }
                
                const newAdmin = await storage.createUser({
                  username,
                  password: null,
                  name: displayName,
                  email: email,
                  role: 'system_admin',
                  googleId: profile.id,
                  photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                  authProvider: 'google',
                  organizationId: organization.id,
                  active: true
                });
                
                console.log(`Successfully created system admin from Google OAuth:`, {
                  id: newAdmin.id,
                  username: newAdmin.username,
                  email: newAdmin.email,
                  role: newAdmin.role
                });
                
                return done(null, newAdmin);
              } catch (error) {
                console.error('Error creating system admin user:', error);
                return done(error, false);
              }
            }
            
            // For all other new users, store their info as pending
            try {
              console.log(`Storing pending OAuth user for organization selection:`, {
                email,
                displayName,
                googleId: profile.id
              });
              
              // Import from oauth-pending-users directly (no dynamic import)
              const { storePendingOAuthUser } = require('./oauth-pending-users');
              
              // Store the pending user - pass request object for session storage
              storePendingOAuthUser({
                id: profile.id,
                email: email,
                displayName: displayName,
                photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                profile: profile,
                createdAt: new Date()
              }, req);
              
              // Create a special user object to indicate this is a pending OAuth user
              // This will be handled differently in the callback
              const pendingUser = {
                id: 0, // Will be replaced when user is created
                username: email, // Using email directly as username
                email: email,
                googleId: profile.id,
                photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                name: displayName,
                isPendingOAuthUser: true, // Special flag
                needsOrganizationSelection: true
              };
              
              return done(null, pendingUser);
            } catch (createError) {
              console.error('Error creating new user:', createError);
              return done(createError, false);
            }
          } catch (error) {
            console.error('Unexpected error in Google OAuth strategy:', error);
            return done(error, false);
          }
        }
      )
    );
    console.log('Google OAuth strategy configured');
  } else {
    console.log('Google OAuth not configured. GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET not set');
  }
  
  return passport;
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // If request expects JSON, return 401 status
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // For regular requests, redirect to login page
  res.redirect('/login');
}

// Middleware to check if user has admin role (system_admin, org_admin, or admin)
export function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && 
      (req.user.role === 'admin' || req.user.role === 'system_admin' || req.user.role === 'org_admin')) {
    return next();
  }
  
  // If request expects JSON, return 403 status
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(403).json({ 
      message: 'Admin access required',
      details: 'This operation requires administrator privileges' 
    });
  }
  
  // For regular requests, redirect to unauthorized page
  res.redirect('/unauthorized');
}

// Middleware to check if user has system admin role
export function isSystemAdmin(req: any, res: any, next: any) {
  // Only system_admin role should have system admin privileges
  if (req.isAuthenticated() && req.user.role === 'system_admin') {
    return next();
  }
  
  // If request expects JSON, return 403 status
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(403).json({ 
      message: 'System Admin access required',
      details: 'This operation requires system administrator privileges' 
    });
  }
  
  // For regular requests, redirect to unauthorized page
  res.redirect('/unauthorized');
}

// Generic permission check middleware creator
export function requirePermission(resource: ResourceType, action: ActionType) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      // If request expects JSON, return 401 status
      if (req.xhr || req.path.startsWith('/api/')) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      // For regular requests, redirect to login page
      return res.redirect('/login');
    }
    
    const userRole = req.user.role as UserRole;
    
    // System admins and admin role bypass permission checks
    if (userRole === 'system_admin' || userRole === 'admin') {
      return next();
    }
    
    // Check permission
    if (hasPermission(userRole, resource, action)) {
      return next();
    }
    
    // If permission check fails
    if (req.xhr || req.path.startsWith('/api/')) {
      return res.status(403).json({ 
        message: 'Permission denied',
        details: `You don't have permission to ${action} ${resource}`,
        required: { resource, action }
      });
    }
    
    return res.redirect('/unauthorized');
  };
}

// Middleware to check organization boundaries for resource access
export function checkOrganizationAccess(storage: IStorage) {
  return async (req: any, res: any, next: any) => {
    // Skip if not authenticated
    if (!req.isAuthenticated()) {
      return next();
    }

    // System admins and admin role can access all resources
    if (req.user.role === 'system_admin' || req.user.role === 'admin') {
      return next();
    }

    const resourceType = req.params.resourceType;
    const resourceId = parseInt(req.params.id);

    if (!resourceId || isNaN(resourceId)) {
      return next();
    }

    try {
      let resource;
      let resourceOrgId;

      // Determine resource type and check organization access
      if (resourceType === 'user' || req.path.includes('/users/')) {
        resource = await storage.getUser(resourceId);
        resourceOrgId = resource?.organizationId;
      } else if (resourceType === 'client' || req.path.includes('/clients/')) {
        const clientWithUser = await storage.getClientWithUser(resourceId);
        resourceOrgId = clientWithUser?.user.organizationId;
      } else if (resourceType === 'technician' || req.path.includes('/technicians/')) {
        const techWithUser = await storage.getTechnicianWithUser(resourceId);
        resourceOrgId = techWithUser?.user.organizationId;
      } else if (resourceType === 'project' || req.path.includes('/projects/')) {
        const project = await storage.getProject(resourceId);
        if (project) {
          const clientWithUser = await storage.getClientWithUser(project.clientId);
          resourceOrgId = clientWithUser?.user.organizationId;
        }
      } else if (resourceType === 'maintenance' || req.path.includes('/maintenances/')) {
        const maintenance = await storage.getMaintenance(resourceId);
        if (maintenance) {
          const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
          resourceOrgId = clientWithUser?.user.organizationId;
        }
      } else if (resourceType === 'repair' || req.path.includes('/repairs/')) {
        const repair = await storage.getRepair(resourceId);
        if (repair) {
          const clientWithUser = await storage.getClientWithUser(repair.clientId);
          resourceOrgId = clientWithUser?.user.organizationId;
        }
      } else if (resourceType === 'invoice' || req.path.includes('/invoices/')) {
        const invoice = await storage.getInvoice(resourceId);
        if (invoice) {
          const clientWithUser = await storage.getClientWithUser(invoice.clientId);
          resourceOrgId = clientWithUser?.user.organizationId;
        }
      } else if (resourceType === 'inventory-item' || req.path.includes('/inventory/items/')) {
        const item = await storage.getInventoryItem(resourceId);
        resourceOrgId = item?.organizationId;
      } else if (resourceType === 'warehouse' || req.path.includes('/inventory/warehouses/')) {
        const warehouse = await storage.getWarehouse(resourceId);
        resourceOrgId = warehouse?.organizationId;
      } else if (resourceType === 'inventory-transfer' || req.path.includes('/inventory/transfers/')) {
        const transfer = await storage.getInventoryTransfer(resourceId);
        resourceOrgId = transfer?.organizationId;
      } else if (resourceType === 'inventory-adjustment' || req.path.includes('/inventory/adjustments/')) {
        const adjustment = await storage.getInventoryAdjustment(resourceId);
        resourceOrgId = adjustment?.organizationId;
      } else if (resourceType === 'barcode' || req.path.includes('/inventory/barcodes/')) {
        const barcode = await storage.getBarcode(resourceId);
        
        // For barcodes, we need to check the organization ID of the referenced item
        if (barcode) {
          if (barcode.itemType === 'inventory_item') {
            const item = await storage.getInventoryItem(barcode.itemId);
            resourceOrgId = item?.organizationId;
          } else if (barcode.itemType === 'warehouse') {
            const warehouse = await storage.getWarehouse(barcode.itemId);
            resourceOrgId = warehouse?.organizationId;
          }
        }
      } else {
        // For other resource types we default to allow access for now
        return next();
      }

      // If no organization ID was found or if it matches the user's organization, allow access
      if (!resourceOrgId || resourceOrgId === req.user.organizationId) {
        return next();
      }

      console.log(`Organization access denied: User from organization ${req.user.organizationId} attempted to access resource from organization ${resourceOrgId}`);
      return res.status(403).json({ message: "You don't have permission to access this resource" });
    } catch (error) {
      console.error("Error checking organization access:", error);
      return next(); // In case of error, proceed (safer to not block access due to error)
    }
  };
}

// Hash password using bcrypt
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}