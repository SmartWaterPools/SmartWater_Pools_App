import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import { User } from '@shared/schema';
import { IStorage } from './storage';

export function configurePassport(storage: IStorage) {
  // Serialize user to the session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
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
    // Check if this is a production deployment (replit.app domain)
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      callbackURL = `https://smartwaterpools.replit.app/api/auth/google/callback`;
      console.log(`Running in Replit production environment. Using callback URL: ${callbackURL}`);
    } else {
      // Use the exact case as provided by Replit environment variables
      callbackURL = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/auth/google/callback`;
      console.log(`Running in Replit development environment. Using callback URL: ${callbackURL}`);
    }
  } else if (process.env.GOOGLE_CALLBACK_URL) {
    callbackURL = process.env.GOOGLE_CALLBACK_URL;
    console.log(`Using callback URL from environment: ${callbackURL}`);
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
            // Check if user already exists with this Google ID
            const existingUser = await storage.getUserByGoogleId(profile.id);
            
            if (existingUser) {
              // If user exists, return the user
              return done(null, existingUser);
            }
            
            // If user doesn't exist, create a new one
            // First, check if the email is already in use
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
            
            if (email) {
              const userWithEmail = await storage.getUserByEmail(email);
              
              if (userWithEmail) {
                // Link Google account to existing user
                const updatedUser = await storage.updateUser(userWithEmail.id, {
                  googleId: profile.id,
                  photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                  authProvider: 'google'
                });
                
                return done(null, updatedUser);
              }
            }
            
            // Create new user
            const username = email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);
            const displayName = profile.displayName || (profile.name ? `${profile.name.givenName} ${profile.name.familyName}` : username);
            
            // Get the default organization ID
            const organizations = await storage.getAllOrganizations();
            const defaultOrg = organizations.find(org => org.isSystemAdmin) || organizations[0];
            
            if (!defaultOrg) {
              return done(new Error('No default organization found'), false);
            }
            
            const newUser = await storage.createUser({
              username,
              name: displayName,
              email: email || username + '@example.com', // Fallback email if none provided
              role: 'client', // Default role for new users
              googleId: profile.id,
              photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
              authProvider: 'google',
              organizationId: defaultOrg.id,
              active: true
            });
            
            return done(null, newUser);
          } catch (error) {
            return done(error);
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