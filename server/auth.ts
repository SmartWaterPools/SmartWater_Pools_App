import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
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
          
          if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
            // Use bcrypt comparison for hashed passwords
            isValidPassword = await bcrypt.compare(password, user.password);
          } else {
            // For plain text passwords (temporary during migration)
            isValidPassword = password === user.password;
            
            // If password is correct, update it to a hashed version
            if (isValidPassword) {
              const hashedPassword = await hashPassword(password);
              await storage.updateUser(user.id, { password: hashedPassword });
              console.log(`Updated password hash for user: ${user.username}`);
            }
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