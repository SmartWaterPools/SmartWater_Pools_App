import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import { User } from '@shared/schema';
import { IStorage } from './storage';

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
    // Check if this is a production deployment
    if (process.env.REPL_SLUG.includes('smartwaterpools') || process.env.NODE_ENV === 'production') {
      callbackURL = `https://smartwaterpools.replit.app/api/auth/google/callback`;
      console.log(`Running in Replit production environment. Using callback URL: ${callbackURL}`);
    } else {
      // Use the Replit environment variables for callback
      const slug = process.env.REPL_SLUG || 'workspace';
      const owner = process.env.REPL_OWNER || 'TravisDeRisi';
      callbackURL = `https://${slug}.${owner}.repl.co/api/auth/google/callback`;
      console.log(`Running in Replit development environment. Using callback URL: ${callbackURL}`);
    }
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
          scope: ['profile', 'email']
        },
        async (accessToken, refreshToken, profile, done) => {
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
                role: existingUser.role
              });
              
              // Update photo URL if it changed
              if (profile.photos && profile.photos[0] && profile.photos[0].value !== existingUser.photoUrl) {
                console.log(`Updating user photo URL`);
                existingUser = await storage.updateUser(existingUser.id, {
                  photoUrl: profile.photos[0].value
                }) || existingUser;
              }
              
              // If user exists, return the user
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
            
            // Create new user
            // Username = email prefix + random number to avoid collisions
            const username = email.split('@')[0] + '_' + Math.floor(Math.random() * 10000);
            const displayName = profile.displayName || 
                               (profile.name ? `${profile.name.givenName} ${profile.name.familyName}` : 
                                email.split('@')[0]);
            
            // Get the default organization ID
            let defaultOrg;
            try {
              const organizations = await storage.getAllOrganizations();
              defaultOrg = organizations.find(org => org.isSystemAdmin) || organizations[0];
              
              if (!defaultOrg) {
                console.error('No organizations found in the database');
                return done(new Error('No default organization found'), false);
              }
            } catch (err) {
              console.error('Error getting organizations:', err);
              return done(new Error('Failed to get organizations'), false);
            }
            
            console.log(`Creating new user with Google credentials:`, {
              username,
              email,
              displayName,
              organization: defaultOrg.id
            });
            
            try {
              const newUser = await storage.createUser({
                username,
                password: null, // No password for OAuth users
                name: displayName,
                email: email, 
                role: 'client', // Default role for new users
                googleId: profile.id,
                photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                authProvider: 'google',
                organizationId: defaultOrg.id,
                active: true
              });
              
              console.log(`Successfully created new user from Google OAuth:`, {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
              });
              
              return done(null, newUser);
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

// Middleware to check if user has admin role
export function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && 
      (req.user.role === 'admin' || req.user.role === 'system_admin' || req.user.role === 'org_admin')) {
    return next();
  }
  
  // If request expects JSON, return 403 status
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  // For regular requests, redirect to unauthorized page
  res.redirect('/unauthorized');
}

// Middleware to check if user has system admin role
export function isSystemAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && (req.user.role === 'system_admin' || req.user.role === 'admin')) {
    return next();
  }
  
  // If request expects JSON, return 403 status
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(403).json({ message: 'System Admin access required' });
  }
  
  // For regular requests, redirect to unauthorized page
  res.redirect('/unauthorized');
}

// Hash password using bcrypt
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}