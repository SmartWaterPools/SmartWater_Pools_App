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
          scope: [
            'profile', 
            'email',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify'
          ],
          accessType: 'offline',
          // Enable both proxy trust and pass request object for better session handling
          proxy: true,
          passReqToCallback: true,
          // State parameter for CSRF protection and session preservation
          state: true,
          // Handle user cancellation better
          userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
          // Note: We're not setting prompt or sessionMaxAge here because the
          // type definition doesn't include these properties.
          // Instead, we pass 'prompt=select_account' in the URL directly
          // on the client side.
        },
        async (req: any, accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: any, info?: any) => void) => {
          try {
            console.log('\n========== GOOGLE STRATEGY CALLBACK START ==========');
            console.log(`[${new Date().toISOString()}] Google Strategy callback received`);
            
            // 1. Token Information (don't log actual tokens for security)
            console.log('\n1. TOKEN INFORMATION:');
            console.log('- Access Token: Present:', !!accessToken);
            console.log('- Access Token Length:', accessToken ? accessToken.length : 0);
            console.log('- Refresh Token: Present:', !!refreshToken);
            console.log('- Refresh Token Length:', refreshToken ? refreshToken.length : 0);
            
            // 2. Session Information
            console.log('\n2. SESSION INFORMATION:');
            if (req && req.session) {
              console.log('- Session exists: YES');
              console.log('- Session ID:', req.sessionID || 'none');
              console.log('- Session Keys:', Object.keys(req.session));
              console.log('- OAuth State:', req.session.oauthState || 'none');
              console.log('- OAuth Pending:', req.session.oauthPending || false);
              console.log('- OAuth Initiated At:', req.session.oauthInitiatedAt || 'not set');
              
              if ((req.session as any).passport) {
                console.log('- Passport data in session:', JSON.stringify((req.session as any).passport, null, 2));
              }
            } else {
              console.error('- Session exists: NO - This is a problem!');
              if (!req) {
                console.error('  -> Request object is missing!');
              } else if (!req.session) {
                console.error('  -> Session object is missing from request!');
              }
            }
            
            // 3. Profile Information
            console.log('\n3. GOOGLE PROFILE INFORMATION:');
            if (!profile) {
              console.error('- Profile: NOT RECEIVED (null/undefined)');
              console.error('  -> This means Google did not provide user information');
              return done(new Error('No profile data received from Google'), false);
            }
            
            console.log('- Profile received: YES');
            console.log('- Profile ID:', profile.id || 'MISSING');
            console.log('- Profile Provider:', profile.provider || 'unknown');
            console.log('- Profile Display Name:', profile.displayName || 'none');
            
            // Log name details
            if (profile.name) {
              console.log('- Profile Name Object:');
              console.log('  -> Family Name:', profile.name.familyName || 'none');
              console.log('  -> Given Name:', profile.name.givenName || 'none');
              console.log('  -> Middle Name:', profile.name.middleName || 'none');
            } else {
              console.log('- Profile Name Object: NOT PROVIDED');
            }
            
            // Log email details
            const emails = profile.emails || [];
            console.log('- Profile Emails Count:', emails.length);
            if (emails.length > 0) {
              emails.forEach((emailObj: any, index: number) => {
                console.log(`  -> Email ${index + 1}:`, emailObj.value || 'none');
                console.log(`     - Verified:`, emailObj.verified || false);
                console.log(`     - Type:`, emailObj.type || 'unknown');
              });
            } else {
              console.log('  -> No emails provided');
            }
            
            // Log photo details
            if (profile.photos && profile.photos.length > 0) {
              console.log('- Profile Photos Count:', profile.photos.length);
              console.log('  -> Primary Photo URL:', profile.photos[0].value || 'none');
            } else {
              console.log('- Profile Photos: NONE');
            }
            
            // Additional profile fields
            console.log('- Profile JSON (first 500 chars):', JSON.stringify(profile).substring(0, 500));
            
            if (!profile.id) {
              console.error('\n!!! CRITICAL ERROR: Profile missing ID field !!!');
              console.error('Full profile object:', JSON.stringify(profile, null, 2));
              return done(new Error('Invalid Google profile - missing ID'), false);
            }
            
            // 4. Email Extraction
            console.log('\n4. EMAIL EXTRACTION:');
            const hasEmails = emails.length > 0;
            const email = hasEmails ? emails[0].value.toLowerCase() : '';
            
            if (!email) {
              console.error('- Email extraction FAILED');
              console.error('  -> Emails array:', JSON.stringify(emails, null, 2));
              return done(new Error('No email address provided by Google'), false);
            }
            
            console.log('- Primary email extracted:', email);
            console.log('- Email verified:', hasEmails && emails[0].verified ? 'YES' : 'NO');
            
            // 5. Database Lookup - Check if user already exists with this Google ID
            console.log('\n5. DATABASE LOOKUP - BY GOOGLE ID:');
            console.log('- Looking up user with Google ID:', profile.id);
            let existingUser = await storage.getUserByGoogleId(profile.id);
            
            if (existingUser) {
              console.log('- User found by Google ID: YES');
              console.log('  -> User ID:', existingUser.id);
              console.log('  -> User Email:', existingUser.email);
              console.log('  -> User Role:', existingUser.role);
              console.log('  -> User Active:', existingUser.active);
              console.log('  -> User Organization ID:', existingUser.organizationId);
              console.log('  -> User Photo URL:', existingUser.photoUrl ? 'Present' : 'None');
              
              // Check if user is active
              if (!existingUser.active) {
                console.log('- User is INACTIVE - rejecting authentication');
                console.log('========== GOOGLE STRATEGY CALLBACK END (INACTIVE USER) ==========\n');
                return done(null, false, { message: 'This account has been deactivated' });
              }
              
              // Update photo URL and Gmail tokens
              console.log('- Updating user with photo URL and Gmail tokens');
              const updateData: any = {};
              
              if (profile.photos && profile.photos[0] && profile.photos[0].value !== existingUser.photoUrl) {
                console.log('  -> Updating photo URL');
                updateData.photoUrl = profile.photos[0].value;
              }
              
              // Store Gmail tokens for email integration
              if (accessToken) {
                console.log('  -> Storing Gmail access token');
                updateData.gmailAccessToken = accessToken;
                updateData.gmailConnectedEmail = email;
                updateData.gmailTokenExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour from now
              }
              if (refreshToken) {
                console.log('  -> Storing Gmail refresh token');
                updateData.gmailRefreshToken = refreshToken;
              }
              
              if (Object.keys(updateData).length > 0) {
                existingUser = await storage.updateUser(existingUser.id, updateData) || existingUser;
                console.log('  -> Update successful:', !!existingUser);
              }
              
              // If user exists and is active, return the user
              console.log('- Returning existing active user');
              console.log('========== GOOGLE STRATEGY CALLBACK END (EXISTING USER) ==========\n');
              return done(null, existingUser);
            }
            
            console.log('- User found by Google ID: NO');
            
            // 6. Database Lookup - Check by email if no Google ID match
            console.log('\n6. DATABASE LOOKUP - BY EMAIL:');
            console.log('- Looking up user with email:', email);
            
            try {
              const userWithEmail = await storage.getUserByEmail(email);
              
              if (userWithEmail) {
                console.log('- User found by email: YES');
                console.log('  -> User ID:', userWithEmail.id);
                console.log('  -> User Email:', userWithEmail.email);
                console.log('  -> User Role:', userWithEmail.role);
                console.log('  -> User Active:', userWithEmail.active);
                console.log('  -> User Organization ID:', userWithEmail.organizationId);
                console.log('  -> User has Google ID:', !!userWithEmail.googleId);
                console.log('  -> User Google ID matches:', userWithEmail.googleId === profile.id);
                
                // Check if the user was previously deleted or inactive
                if (!userWithEmail.active) {
                  console.log('- User is INACTIVE - attempting reactivation');
                  console.log('  -> Reactivating user and linking Google account');
                  
                  // Reactivate the user account and update with Google credentials and Gmail tokens
                  const reactivateData: any = {
                    googleId: profile.id,
                    photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                    authProvider: 'google',
                    active: true
                  };
                  
                  // Store Gmail tokens for email integration
                  if (accessToken) {
                    reactivateData.gmailAccessToken = accessToken;
                    reactivateData.gmailConnectedEmail = email;
                    reactivateData.gmailTokenExpiresAt = new Date(Date.now() + 3600 * 1000);
                  }
                  if (refreshToken) {
                    reactivateData.gmailRefreshToken = refreshToken;
                  }
                  
                  const updatedUser = await storage.updateUser(userWithEmail.id, reactivateData);
                  
                  if (updatedUser) {
                    console.log('  -> Reactivation successful');
                    console.log('  -> Setting isReactivated flag for subscription flow');
                    (updatedUser as any).isReactivated = true;
                    console.log('========== GOOGLE STRATEGY CALLBACK END (REACTIVATED USER) ==========\n');
                    return done(null, updatedUser);
                  } else {
                    console.error('  -> Reactivation FAILED');
                    console.log('========== GOOGLE STRATEGY CALLBACK END (REACTIVATION ERROR) ==========\n');
                    return done(new Error('Failed to reactivate user in database'), false);
                  }
                }
                
                // User exists and is active - link Google account if not already linked
                console.log('- User is ACTIVE - linking Google account');
                console.log('  -> Email match (case-insensitive):', userWithEmail.email.toLowerCase() === email.toLowerCase());
                
                // Link Google account to existing user and store Gmail tokens
                console.log('  -> Updating user with Google credentials and Gmail tokens');
                const linkData: any = {
                  googleId: profile.id,
                  photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                  authProvider: 'google'
                };
                
                // Store Gmail tokens for email integration
                if (accessToken) {
                  linkData.gmailAccessToken = accessToken;
                  linkData.gmailConnectedEmail = email;
                  linkData.gmailTokenExpiresAt = new Date(Date.now() + 3600 * 1000);
                }
                if (refreshToken) {
                  linkData.gmailRefreshToken = refreshToken;
                }
                
                const updatedUser = await storage.updateUser(userWithEmail.id, linkData);
                
                if (updatedUser) {
                  console.log('  -> Google account linked successfully');
                  console.log('========== GOOGLE STRATEGY CALLBACK END (LINKED EXISTING USER) ==========\n');
                  return done(null, updatedUser);
                } else {
                  console.error('  -> Failed to link Google account');
                  console.log('========== GOOGLE STRATEGY CALLBACK END (LINKING ERROR) ==========\n');
                  return done(new Error('Failed to update user in database'), false);
                }
              } else {
                console.log('- User found by email: NO');
              }
            } catch (error) {
              console.error('- Error looking up user by email:', error);
              console.log('  -> Will proceed to create new user');
            }
            
            // 7. New User Creation - Handle new user from OAuth
            console.log('\n7. NEW USER CREATION:');
            console.log('- No existing user found, creating new OAuth user');
            
            const displayName = profile.displayName || 
                              (profile.name ? `${profile.name.givenName} ${profile.name.familyName}` : 
                                email.split('@')[0]);
            
            console.log('- Display name generated:', displayName);
            console.log('- Email to use:', email);
            console.log('- Google ID:', profile.id);
            console.log('- Photo URL:', profile.photos && profile.photos[0] ? 'Present' : 'None');
            
            // Create a real user in the database with an organization
            try {
              console.log('- Creating new user with organization');
              
              // Generate a username from email if needed
              const username = email.split('@')[0];
              
              // Create organization name based on user's name
              const orgName = `${displayName}'s Organization`;
              const baseSlug = displayName.toLowerCase().replace(/\s+/g, '-');
              
              // Ensure unique slug by adding timestamp if needed
              let slug = baseSlug;
              let attempts = 0;
              const maxAttempts = 5;
              let organizationId: number | undefined;
              
              while (attempts < maxAttempts) {
                try {
                  const newOrg = await storage.createOrganization({
                    name: orgName,
                    slug: slug
                  });
                  organizationId = newOrg.id;
                  console.log('- Organization created with ID:', organizationId);
                  break;
                } catch (error: any) {
                  // If slug already exists, add timestamp and retry
                  if (error.message?.includes('duplicate') || error.code === '23505') {
                    attempts++;
                    slug = `${baseSlug}-${Date.now()}`;
                    if (attempts >= maxAttempts) {
                      throw new Error('Unable to create unique organization identifier');
                    }
                  } else {
                    throw error;
                  }
                }
              }
              
              if (!organizationId) {
                throw new Error('Failed to create organization');
              }
              
              // Create the new user with Google OAuth info and Gmail tokens
              const newUserData: any = {
                username: username,
                email: email,
                name: displayName,
                role: 'client', // Default role for new OAuth users
                organizationId: organizationId,
                googleId: profile.id,
                photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                authProvider: 'google',
                active: true,
                password: '' // OAuth users don't need a password
              };
              
              // Store Gmail tokens for email integration
              if (accessToken) {
                newUserData.gmailAccessToken = accessToken;
                newUserData.gmailConnectedEmail = email;
                newUserData.gmailTokenExpiresAt = new Date(Date.now() + 3600 * 1000);
              }
              if (refreshToken) {
                newUserData.gmailRefreshToken = refreshToken;
              }
              
              const newUser = await storage.createUser(newUserData);
              
              console.log('- Created new user with ID:', newUser.id);
              console.log('- User email:', newUser.email);
              console.log('- User role:', newUser.role);
              console.log('- User organization ID:', newUser.organizationId);
              console.log('- Gmail connected:', !!newUserData.gmailAccessToken);
              console.log('========== GOOGLE STRATEGY CALLBACK END (NEW USER CREATED) ==========\n');
              
              return done(null, newUser);
            } catch (error) {
              console.error('- Error creating new user:', error);
              console.error('  -> Error message:', error instanceof Error ? error.message : String(error));
              console.error('  -> Error stack:', error instanceof Error ? error.stack : 'N/A');
              console.log('========== GOOGLE STRATEGY CALLBACK END (NEW USER ERROR) ==========\n');
              return done(error, false);
            }
          } catch (error) {
            console.error('\n!!! UNEXPECTED ERROR IN GOOGLE STRATEGY !!!');
            console.error('- Error:', error);
            console.error('- Error message:', error instanceof Error ? error.message : String(error));
            console.error('- Error stack:', error instanceof Error ? error.stack : 'N/A');
            console.log('========== GOOGLE STRATEGY CALLBACK END (UNEXPECTED ERROR) ==========\n');
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