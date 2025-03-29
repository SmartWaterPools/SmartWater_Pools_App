import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy, VerifyCallback } from 'passport-google-oauth20';
import { Request } from 'express';
import bcrypt from 'bcrypt';
import { User } from '@shared/schema';
import { IStorage } from './storage';
import { UserRole, ResourceType, ActionType, hasPermission, checkPermission } from './permissions';

export function configurePassport(storage: IStorage) {
  // Serialize user to the session with enhanced logging
  passport.serializeUser((user: any, done) => {
    console.log(`Serializing user: ${user.id}, ${user.email}, role: ${user.role}`);
    done(null, user.id);
  });
  
  // Deserialize user from the session with enhanced logging
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user ID: ${id}`);
      const user = await storage.getUser(id);
      
      if (!user) {
        console.log(`Deserialization failed - no user found with ID: ${id}`);
        return done(null, false);
      }
      
      console.log(`Deserialized user successfully: ${user.id}, ${user.email}, role: ${user.role}`);
      done(null, user);
    } catch (error) {
      console.error(`Error in deserializeUser:`, error);
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
          console.log(`LocalStrategy: Authenticating user with username '${username}'`);
          
          // Find the user by username
          const user = await storage.getUserByUsername(username);
          
          // If user not found or inactive
          if (!user) {
            console.log(`LocalStrategy: User '${username}' not found in database`);
            return done(null, false, { message: 'Invalid username or password' });
          }
          
          if (!user.active) {
            console.log(`LocalStrategy: User '${username}' found but is inactive`);
            return done(null, false, { message: 'Account is inactive' });
          }
          
          console.log(`LocalStrategy: User '${username}' found with id=${user.id}, email=${user.email}, role=${user.role}`);
          
          // Check if the stored password is a bcrypt hash
          let isValidPassword = false;
          
          if (!user.password) {
            console.log(`LocalStrategy: User '${username}' has no password set (OAuth user?)`);
            isValidPassword = false;
          } else if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
            // Use bcrypt comparison for hashed passwords
            console.log(`LocalStrategy: User '${username}' has bcrypt password hash, comparing...`);
            isValidPassword = await bcrypt.compare(password, user.password);
            console.log(`LocalStrategy: Password comparison result for '${username}': ${isValidPassword}`);
          } else {
            // For plain text passwords (temporary during migration)
            console.log(`LocalStrategy: User '${username}' has plain text password, comparing...`);
            isValidPassword = password === user.password;
            console.log(`LocalStrategy: Plain text password comparison result for '${username}': ${isValidPassword}`);
            
            // If password is correct, update it to a hashed version
            if (isValidPassword) {
              console.log(`LocalStrategy: Upgrading plain text password to bcrypt hash for '${username}'`);
              const hashedPassword = await hashPassword(password);
              await storage.updateUser(user.id, { password: hashedPassword });
              console.log(`LocalStrategy: Password hash upgrade completed for '${username}'`);
            }
          }
          
          if (!isValidPassword) {
            console.log(`LocalStrategy: Invalid password for user '${username}'`);
            return done(null, false, { message: 'Invalid username or password' });
          }
          
          // Authentication successful
          console.log(`LocalStrategy: Authentication successful for user '${username}'`);
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  
  // Configure Google OAuth strategy
  // Fetch Google OAuth credentials from environment with careful error checking
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const isReplit = !!process.env.REPL_ID;
  
  // ALWAYS use the production URL for Google OAuth callback to ensure consistency
  // This prevents issues with OAuth redirects going to the wrong domain
  let callbackURL = 'https://smartwaterpools.replit.app/api/auth/google/callback';
  
  // More comprehensive logging of Google OAuth configuration
  console.log('Google OAuth Configuration:');
  if (!GOOGLE_CLIENT_ID) {
    console.error('- ERROR: GOOGLE_CLIENT_ID is missing or empty in environment variables!');
  } else {
    const idLength = GOOGLE_CLIENT_ID.length;
    const idStart = GOOGLE_CLIENT_ID.substring(0, 6);
    const idEnd = GOOGLE_CLIENT_ID.substring(idLength - 4);
    console.log(`- Client ID available: YES (length: ${idLength}, starts with: ${idStart}..., ends with: ...${idEnd})`);
  }
  
  if (!GOOGLE_CLIENT_SECRET) {
    console.error('- ERROR: GOOGLE_CLIENT_SECRET is missing or empty in environment variables!');
  } else {
    console.log(`- Client Secret available: YES (length: ${GOOGLE_CLIENT_SECRET.length})`);
  }
  
  console.log(`- Callback URL: ${callbackURL}`);
  console.log(`- Running in Replit: ${isReplit}`);
  
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    console.log('Configuring Google OAuth strategy with available credentials');
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: callbackURL,
          scope: ['profile', 'email'],
          // Enable both proxy trust and pass request object for better session handling
          proxy: true,
          passReqToCallback: true,
          // State parameter for CSRF protection and session preservation
          state: true,
          // Handle user cancellation better
          userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
        },
        async (req, accessToken, refreshToken, profile, done) => {
          try {
            console.log('Google OAuth callback received - Processing authentication');
            
            // Log session information for debugging
            if (req.session) {
              console.log(`Google OAuth: Session exists (ID: ${req.sessionID})`);
              console.log(`Google OAuth: Session state: ${req.session.oauthState || 'none'}`);
              console.log(`Google OAuth: Session pending flag: ${req.session.oauthPending || false}`);
            } else {
              console.error('Google OAuth: No session found in request!');
            }
            
            // Enhanced profile validation
            if (!profile) {
              console.error('Google OAuth: No profile data received from Google');
              return done(new Error('No profile data received from Google'), false);
            }
            
            if (!profile.id) {
              console.error('Google OAuth: Profile missing ID field', profile);
              return done(new Error('Invalid Google profile - missing ID'), false);
            }
            
            console.log(`Google OAuth: Received profile for Google ID: ${profile.id}`);
            
            // Extract and validate email from profile
            const emails = profile.emails || [];
            const hasEmails = emails.length > 0;
            console.log(`Google OAuth: Profile has ${emails.length} email(s)`);
            
            const email = hasEmails ? emails[0].value.toLowerCase() : '';
            
            if (!email) {
              console.error('Google OAuth: No email address in profile', emails);
              return done(new Error('No email address provided by Google'), false);
            }
            
            console.log(`Google OAuth: Using email ${email} for authentication`);
            
            // Step 1: Check if user already exists with this Google ID
            let existingUser = await storage.getUserByGoogleId(profile.id);
            
            if (existingUser) {
              // Check if user is active
              if (!existingUser.active) {
                return done(null, false, { message: 'This account has been deactivated' });
              }
              
              // Update photo URL if it changed
              if (profile.photos && profile.photos[0] && profile.photos[0].value !== existingUser.photoUrl) {
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
              const userWithEmail = await storage.getUserByEmail(email);
              
              if (userWithEmail) {
                // Check if the user was previously deleted or inactive
                if (!userWithEmail.active) {
                  // For previously deleted users, reactivate the account and treat as a new sign up
                  
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
                    // Set a flag to indicate this is a reactivated user that should go through subscription flow
                    (updatedUser as any).isReactivated = true;
                    return done(null, updatedUser);
                  } else {
                    return done(new Error('Failed to reactivate user in database'), false);
                  }
                }
                
                // Case-insensitive comparison to handle email casing differences
                if (userWithEmail.email.toLowerCase() === email.toLowerCase()) {
                  // Link Google account to existing user
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
                } else {
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
              }
            } catch (error) {
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
                
                // Get SmartWater Pools organization
                const organization = await storage.getOrganizationBySlug('smartwater-pools');
                if (!organization) {
                  // Attempt to find any available organization as a fallback
                  const organizations = await storage.getAllOrganizations();
                  if (organizations && organizations.length > 0) {
                    // Use the first available organization
                    console.log(`Using first available organization for Travis: ${organizations[0].name} (ID: ${organizations[0].id})`);
                    
                    const newAdmin = await storage.createUser({
                      username,
                      password: null,
                      name: displayName,
                      email: email,
                      role: 'system_admin',
                      googleId: profile.id,
                      photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                      authProvider: 'google',
                      organizationId: organizations[0].id,
                      active: true
                    });
                    
                    return done(null, newAdmin);
                  }
                  
                  return done(new Error('Default organization not found and no fallback organization available'), false);
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
                
                console.log(`Created Travis account with system_admin role. User ID: ${newAdmin.id}, Organization: ${organization.name} (${organization.id})`);
                
                return done(null, newAdmin);
              } catch (error) {
                console.error('Error creating Travis admin account:', error);
                return done(error, false);
              }
            }
            
            // Special case for Thomas Anderson test account - also assign directly with admin role
            if (email.toLowerCase() === '010101thomasanderson@gmail.com') {
              try {
                const username = email;
                
                // Get SmartWater Pools organization or create it if it doesn't exist
                let organization = await storage.getOrganizationBySlug('smartwater-pools');
                if (!organization) {
                  organization = await storage.createOrganization({
                    name: 'SmartWater Pools',
                    slug: 'smartwater-pools'
                  });
                }
                
                const newUser = await storage.createUser({
                  username,
                  password: null,
                  name: 'Thomas Anderson',
                  email: email,
                  role: 'org_admin',  // Admin role for this test account
                  googleId: profile.id,
                  photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                  authProvider: 'google',
                  organizationId: organization.id,
                  active: true
                });
                
                return done(null, newUser);
              } catch (error) {
                return done(error, false);
              }
            }
            
            // For all other new users, store their info as pending
            try {
              // Import here to avoid circular dependency
              const { storePendingOAuthUser } = require('./oauth-pending-users');
              
              // Store pending user info
              storePendingOAuthUser({
                id: profile.id,
                email: email,
                displayName: displayName,
                photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                profile: profile,
                createdAt: new Date()
              }, req);
              
              // Set a flag to indicate this is a new OAuth user that needs to select/create organization
              const tempUser: any = { 
                id: -1,  // Temporary ID
                username: email,
                email: email,
                role: 'client',
                googleId: profile.id,
                isNewOAuthUser: true,
                needsOrganization: true
              };
              
              return done(null, tempUser);
            } catch (error) {
              return done(error, false);
            }
          } catch (error) {
            return done(error, false);
          }
        }
      )
    );
  }
  
  return passport;
}

export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ error: 'Unauthorized' });
}

export function isAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const user = req.user as User;
  
  if (user.role === 'admin' || user.role === 'org_admin' || user.role === 'system_admin') {
    return next();
  }
  
  return res.status(403).json({ error: 'Forbidden: Admin access required' });
}

export function isSystemAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const user = req.user as User;
  
  if (user.role === 'system_admin') {
    return next();
  }
  
  return res.status(403).json({ error: 'Forbidden: System Admin access required' });
}

export function requirePermission(resource: ResourceType, action: ActionType) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = req.user as User;
    
    if (!user.role) {
      return res.status(403).json({ 
        error: 'Forbidden: User role not defined',
        resource,
        action,
        required: true
      });
    }
    
    // System admins bypass all permission checks
    if (user.role === 'system_admin') {
      return next();
    }
    
    // Verify user.role is a valid UserRole
    const validRoles: UserRole[] = [
      'system_admin', 'org_admin', 'admin', 'manager', 'technician', 
      'client', 'office_staff'
    ];
    
    if (validRoles.includes(user.role as UserRole) && 
        hasPermission(user.role as UserRole, resource, action)) {
      return next();
    }
    
    return res.status(403).json({ 
      error: 'Forbidden: Insufficient permissions',
      resource,
      action, 
      required: true
    });
  };
}

export function checkOrganizationAccess(storage: IStorage) {
  return async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = req.user as User;
    
    // System admins can access all organizations
    if (user.role === 'system_admin') {
      return next();
    }
    
    // If request is for specific organization (e.g. /api/organizations/:id/...)
    if (req.params.organizationId) {
      const organizationId = parseInt(req.params.organizationId);
      
      if (isNaN(organizationId)) {
        return res.status(400).json({ error: 'Invalid organization ID' });
      }
      
      // Check if user belongs to the requested organization
      if (user.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this organization' });
      }
    } else if (req.body && req.body.organizationId) {
      // If organization is specified in the request body
      const organizationId = parseInt(req.body.organizationId);
      
      if (isNaN(organizationId)) {
        return res.status(400).json({ error: 'Invalid organization ID in request body' });
      }
      
      // Check if user belongs to the organization in the request body
      if (user.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to the specified organization' });
      }
    }
    
    // User has access to the requested organization
    return next();
  };
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}