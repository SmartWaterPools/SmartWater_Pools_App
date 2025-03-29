import express, { Request, Response } from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { z } from 'zod';
import { insertUserSchema } from '@shared/schema';

const router = express.Router();

// Session check endpoint - simplified version
router.get('/session', (req: Request, res: Response) => {
  try {
    // Check if the session has a user property
    const isAuthenticated = req.isAuthenticated() && req.user;
    
    // Log authentication status
    if (isAuthenticated) {
      const user = req.user as any;
      console.log(`Session check: Authenticated user: ${user.email} (id=${user.id})`);
      
      // Don't send password to client
      const { password, ...userWithoutPassword } = user;
      
      res.json({
        isAuthenticated: true,
        user: userWithoutPassword
      });
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
    // Validate request body against schema
    const userSchema = insertUserSchema.extend({
      // Add additional validation if needed
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
      role: 'client', // Default role for new registrations
      active: true,
      // Other fields would be added here
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

// Google OAuth start route
router.get('/google', (req: Request, res: Response, next) => {
  // Store the requested redirect path in the session
  if (req.query.redirectTo) {
    req.session.redirectTo = req.query.redirectTo as string;
  }
  
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })(req, res, next);
});

// Google OAuth callback route - enhanced with debugging
router.get('/google/callback', 
  (req: Request, res: Response, next: NextFunction) => {
    // Debug logs before authentication
    console.log("Google OAuth callback received, session details:");
    console.log("- Session ID:", req.sessionID || "none");
    console.log("- Is Authenticated:", req.isAuthenticated ? req.isAuthenticated() : "function not available");
    console.log("- Has user object:", !!req.user);
    console.log("- Cookies:", req.headers.cookie || "none");
    
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

// Extra route to prepare OAuth session - simplified version
router.get('/prepare-oauth', (req: Request, res: Response) => {
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