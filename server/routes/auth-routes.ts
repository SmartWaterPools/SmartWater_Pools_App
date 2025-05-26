import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { z } from 'zod';
import { insertUserSchema } from '@shared/schema';

// Timeout middleware specifically for OAuth requests
// This prevents requests from hanging indefinitely
const oauthTimeoutMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const OAUTH_TIMEOUT_MS = 60000; // 60 seconds
  
  // Set a timeout for the request
  const timeoutId = setTimeout(() => {
    console.error(`OAuth request timed out after ${OAUTH_TIMEOUT_MS}ms: ${req.path}`);
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(504).json({ 
        error: 'Google authentication request timed out',
        message: 'Please try again or use username/password login'
      });
    }
  }, OAUTH_TIMEOUT_MS);
  
  // Clear the timeout when the response is sent
  res.on('finish', () => {
    clearTimeout(timeoutId);
  });
  
  // Store the timeout in the request so we can cancel it manually if needed
  (req as any).oauthTimeout = timeoutId;
  
  next();
};

const router = express.Router();

// Session check endpoint - simplified version
router.get('/session', (req: Request, res: Response) => {
  try {
    // Check if the session has a user property (including temporary OAuth users)
    const hasUser = req.user;
    
    if (hasUser) {
      const user = req.user as any;
      
      // Check if this is a temporary OAuth user needing completion
      if (user.isNewOAuthUser && user.needsOrganization) {
        console.log(`Session check: OAuth user needs completion: ${user.email}`);
        
        // Send as authenticated but mark as needing completion
        const { password, ...userWithoutPassword } = user;
        res.json({
          isAuthenticated: true,
          user: userWithoutPassword
        });
      } else if (req.isAuthenticated()) {
        // Regular authenticated user
        console.log(`Session check: Authenticated user: ${user.email} (id=${user.id})`);
        
        const { password, ...userWithoutPassword } = user;
        res.json({
          isAuthenticated: true,
          user: userWithoutPassword
        });
      } else {
        console.log(`Session check: User exists but not authenticated`);
        res.json({
          isAuthenticated: false
        });
      }
    } else {
      console.log(`Session check: Not authenticated`);
      res.json({
        isAuthenticated: false
      });
    }
  } catch (error) {
    console.error("Session check error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      isAuthenticated: false
    });
  }
});

// Local login route - simplified version
router.post('/login', async (req: Request, res: Response, next) => {
  try {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login authentication error:", err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }
      
      if (!user) {
        // Authentication failed
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
      }
      
      // Log the user in
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login session error:", loginErr);
          return res.status(500).json({ success: false, message: 'Session error' });
        }
        
        // Remove password from user object before sending to client
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.password;
        
        return res.json({ 
          success: true, 
          message: 'Login successful', 
          user: userWithoutPassword
        });
      });
    })(req, res, next);
  } catch (error) {
    console.error("Login route error:", error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Logout route - simplified version
router.post('/logout', (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.json({ success: true, message: 'Already logged out' });
    }
    
    // Log the logout request
    console.log(`Logout request received`);
    
    // Perform logout
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ success: false, message: 'Error during logout' });
      }
      
      // Clear session cookie
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: 'Successfully logged out' });
    });
  } catch (error) {
    console.error("Logout route error:", error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Registration route
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Check if this is an OAuth user completion
    const isOAuthCompletion = req.isAuthenticated() && req.user && (req.user as any).isNewOAuthUser;
    
    if (isOAuthCompletion) {
      // Handle OAuth user registration completion
      console.log("Processing OAuth user registration completion");
      
      const { organizationName, role, phone, address } = req.body;
      const oauthUser = req.user as any;
      
      if (!organizationName) {
        return res.status(400).json({ 
          success: false, 
          message: 'Organization name is required' 
        });
      }
      
      // Create the actual user account
      const newUser = await storage.createUser({
        username: oauthUser.email,
        email: oauthUser.email,
        password: null, // OAuth users don't need passwords
        name: oauthUser.name || oauthUser.email.split('@')[0],
        role: role || 'client',
        googleId: oauthUser.googleId,
        authProvider: 'google',
        active: true,
        phone: phone || null,
        address: address || null,
        // organizationId will be set after creating/finding organization
      });
      
      // Remove password from user object before sending to client
      const userWithoutPassword = { ...newUser };
      delete userWithoutPassword.password;
      
      // Log the user in with the real account
      req.login(userWithoutPassword, (loginErr) => {
        if (loginErr) {
          console.error("OAuth registration completion login error:", loginErr);
          return res.status(500).json({ success: false, message: 'Session error' });
        }
        
        return res.status(201).json({ 
          success: true, 
          message: 'Registration completed successfully', 
          user: userWithoutPassword,
          organizationName: organizationName
        });
      });
      
      return;
    }
    
    // Regular registration flow
    const userSchema = insertUserSchema.extend({
      confirmPassword: z.string().optional(),
      organizationName: z.string().optional()
    });
    
    try {
      userSchema.parse(req.body);
    } catch (validationError: any) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: validationError.errors 
      });
    }
    
    const { username, password, email, name, organizationName } = req.body;
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'A user with this email already exists' 
      });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const newUser = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      name,
      role: 'client',
      active: true,
    });
    
    // Remove password from user object before sending to client
    const userWithoutPassword = { ...newUser };
    delete userWithoutPassword.password;
    
    // Log the user in
    req.login(userWithoutPassword, (loginErr) => {
      if (loginErr) {
        console.error("Registration login error:", loginErr);
        return res.status(500).json({ success: false, message: 'Session error' });
      }
      
      return res.status(201).json({ 
        success: true, 
        message: 'Registration successful', 
        user: userWithoutPassword
      });
    });
  } catch (error) {
    console.error("Registration route error:", error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Google OAuth start route with timeout protection
router.get('/google', oauthTimeoutMiddleware, (req: Request, res: Response, next) => {
  // Store the requested redirect path in the session
  if (req.query.redirectTo) {
    req.session.redirectTo = req.query.redirectTo as string;
  }
  
  // Track OAuth initiation time for timeout tracking
  req.session.oauthInitiatedAt = new Date().toISOString();
  console.log("Starting Google OAuth authentication flow");
  
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })(req, res, next);
});

// Google OAuth callback route - enhanced with debugging and timeout protection
router.get('/google/callback', 
  oauthTimeoutMiddleware, // Add timeout middleware
  (req: Request, res: Response, next: NextFunction) => {
    // Debug logs before authentication
    console.log("Google OAuth callback received, session details:");
    console.log("- Session ID:", req.sessionID || "none");
    console.log("- Is Authenticated:", req.isAuthenticated ? req.isAuthenticated() : "function not available");
    console.log("- Has user object:", !!req.user);
    console.log("- Cookies:", req.headers.cookie || "none");
    
    // Calculate elapsed time since OAuth flow started (if available)
    if (req.session?.oauthInitiatedAt) {
      const startTime = new Date(req.session.oauthInitiatedAt).getTime();
      const elapsedMs = Date.now() - startTime;
      console.log(`- OAuth flow elapsed time: ${elapsedMs}ms`);
    }
    
    next();
  },
  passport.authenticate('google', { 
    failureRedirect: '/login?error=google-auth-failed',
    session: true
  }),
  (req: Request, res: Response) => {
    try {
      // Log authentication result
      console.log("Google OAuth login completed, authentication result:");
      console.log("- Is authenticated after Google auth:", req.isAuthenticated ? req.isAuthenticated() : "function not available");
      console.log("- User object present:", !!req.user);
      if (req.user) {
        const user = req.user as any;
        console.log("- User ID:", user.id);
        console.log("- User email:", user.email);
        console.log("- User role:", user.role);
        console.log("- Is new OAuth user:", user.isNewOAuthUser);
        console.log("- Needs organization:", user.needsOrganization);
      } else {
        console.log("- No user object found in request");
      }
      
      // Check if this is a new user that needs to complete registration
      if (req.user) {
        const user = req.user as any;
        
        // If this is a new OAuth user without an organization, redirect to registration
        if (user.isNewOAuthUser && user.needsOrganization) {
          console.log("New OAuth user detected, redirecting to registration flow");
          
          // Save session explicitly before redirecting
          req.session.save((err) => {
            if (err) {
              console.error("Error saving session after Google auth:", err);
              return res.redirect('/login?error=session-error');
            }
            
            // Redirect to dashboard where login card will handle OAuth completion
            res.redirect('/dashboard?oauth=true&new=true');
          });
          return;
        }
        
        // If user doesn't have an organization but isn't flagged as new, redirect to pricing
        if (!user.organizationId) {
          console.log("User without organization detected, redirecting to pricing");
          
          req.session.save((err) => {
            if (err) {
              console.error("Error saving session after Google auth:", err);
              return res.redirect('/login?error=session-error');
            }
            
            res.redirect('/pricing?oauth=true');
          });
          return;
        }
      }
      
      // Save session explicitly to ensure user is stored
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session after Google auth:", err);
          return res.redirect('/login?error=session-error');
        }
        
        console.log("Session saved successfully, redirecting to dashboard");
        res.redirect('/dashboard');
      });
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect('/login?error=callback-error');
    }
  }
);

// Extra route to prepare OAuth session - simplified version with timeout protection
router.get('/prepare-oauth', oauthTimeoutMiddleware, (req: Request, res: Response) => {
  try {
    console.log("OAuth session preparation requested");
    
    // Simply return success
    res.json({ 
      success: true, 
      message: 'OAuth flow ready'
    });
  } catch (error) {
    console.error("Prepare OAuth error:", error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;