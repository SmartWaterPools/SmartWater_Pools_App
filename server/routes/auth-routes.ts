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
    // Validation schema for registration - omit organizationId since we'll create it
    const registrationSchema = insertUserSchema
      .omit({ organizationId: true })
      .extend({
        password: z.string().min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string(),
        organizationName: z.string().min(1, 'Organization name is required'),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      });
    
    try {
      registrationSchema.parse(req.body);
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
    
    // For registration, always create a new organization to prevent users from joining existing orgs
    // This maintains proper tenant isolation and security
    const orgName = organizationName || `${name}'s Organization`;
    const baseSlug = organizationName 
      ? organizationName.toLowerCase().replace(/\s+/g, '-')
      : `${username}-org`;
    
    // Ensure unique slug by adding timestamp if needed
    let slug = baseSlug;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      try {
        const newOrg = await storage.createOrganization({
          name: orgName,
          slug: slug
        });
        var organizationId = newOrg.id;
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

    // Create user
    const newUser = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      name,
      role: 'client', // Default role for new registrations
      active: true,
      organizationId
    });
    
    // Remove password from user object before sending to client
    const { password: _, ...userWithoutPassword } = newUser;
    
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

// Google OAuth callback route - enhanced with comprehensive debugging
router.get('/google/callback', 
  oauthTimeoutMiddleware, // Add timeout middleware
  (req: Request, res: Response, next: NextFunction) => {
    console.log("\n========== GOOGLE OAUTH CALLBACK DEBUG START ==========");
    console.log(`[${new Date().toISOString()}] Google OAuth callback received`);
    
    // 1. Request Details
    console.log("\n1. REQUEST DETAILS:");
    console.log("- Request URL:", req.url);
    console.log("- Request Path:", req.path);
    console.log("- Request Method:", req.method);
    console.log("- Request Protocol:", req.protocol);
    console.log("- Request Host:", req.get('host'));
    console.log("- Request Origin:", req.get('origin') || "none");
    console.log("- Request Referer:", req.get('referer') || "none");
    console.log("- User-Agent:", req.get('user-agent') || "none");
    
    // 2. Query Parameters from Google
    console.log("\n2. QUERY PARAMETERS FROM GOOGLE:");
    const queryParams = req.query;
    console.log("- All query params:", JSON.stringify(queryParams, null, 2));
    
    // Check for specific OAuth parameters
    if (queryParams.code) {
      console.log("- Authorization Code: Present (length: " + (queryParams.code as string).length + ")");
    }
    if (queryParams.state) {
      console.log("- State parameter: Present (value: " + queryParams.state + ")");
    }
    if (queryParams.error) {
      console.log("- ERROR from Google:", queryParams.error);
      console.log("- Error Description:", queryParams.error_description || "none");
      console.log("- Error URI:", queryParams.error_uri || "none");
    }
    if (queryParams.scope) {
      console.log("- Scopes granted:", queryParams.scope);
    }
    
    // 3. Session Information
    console.log("\n3. SESSION INFORMATION:");
    console.log("- Session ID:", req.sessionID || "none");
    console.log("- Session exists:", !!req.session);
    if (req.session) {
      console.log("- Session keys:", Object.keys(req.session));
      console.log("- Session cookie:", JSON.stringify(req.session.cookie, null, 2));
      console.log("- OAuth Initiated At:", req.session.oauthInitiatedAt || "not set");
      console.log("- Redirect To:", req.session.redirectTo || "not set");
      
      // Calculate elapsed time since OAuth flow started
      if (req.session.oauthInitiatedAt) {
        const startTime = new Date(req.session.oauthInitiatedAt).getTime();
        const elapsedMs = Date.now() - startTime;
        console.log(`- OAuth flow elapsed time: ${elapsedMs}ms (${(elapsedMs/1000).toFixed(2)} seconds)`);
        
        // Warn if flow took too long
        if (elapsedMs > 30000) {
          console.warn("- WARNING: OAuth flow took longer than 30 seconds!");
        }
      }
      
      // Log any passport data in session
      if ((req.session as any).passport) {
        console.log("- Passport in session:", JSON.stringify((req.session as any).passport, null, 2));
      }
    }
    
    // 4. Cookie Information
    console.log("\n4. COOKIE INFORMATION:");
    console.log("- Raw Cookie Header:", req.headers.cookie || "none");
    if (req.cookies) {
      console.log("- Parsed Cookies:", JSON.stringify(req.cookies, null, 2));
    }
    
    // 5. Authentication State Before Processing
    console.log("\n5. AUTHENTICATION STATE BEFORE PROCESSING:");
    console.log("- Is Authenticated:", req.isAuthenticated ? req.isAuthenticated() : "function not available");
    console.log("- Has user object:", !!req.user);
    if (req.user) {
      const user = req.user as any;
      console.log("- Existing User ID:", user.id);
      console.log("- Existing User email:", user.email);
    }
    
    // 6. Headers (selective important ones)
    console.log("\n6. RELEVANT HEADERS:");
    console.log("- X-Forwarded-For:", req.get('x-forwarded-for') || "none");
    console.log("- X-Forwarded-Proto:", req.get('x-forwarded-proto') || "none");
    console.log("- X-Real-IP:", req.get('x-real-ip') || "none");
    
    // Check for OAuth errors from Google
    if (queryParams.error) {
      console.log("\n!!! GOOGLE OAUTH ERROR DETECTED !!!");
      console.log("Google returned an error. Common causes:");
      console.log("- User denied permission");
      console.log("- Invalid client configuration");
      console.log("- Redirect URI mismatch");
      console.log("========== GOOGLE OAUTH CALLBACK DEBUG END (ERROR) ==========\n");
      
      // Redirect with error details
      const errorMessage = encodeURIComponent(queryParams.error_description as string || queryParams.error as string);
      return res.redirect(`/login?error=google-oauth&details=${errorMessage}`);
    }
    
    console.log("\nProceeding to passport.authenticate('google')...");
    console.log("========== GOOGLE OAUTH CALLBACK DEBUG END (PRE-AUTH) ==========\n");
    
    next();
  },
  // Passport authentication middleware with custom callback for debugging
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('google', (err: any, user: any, info: any) => {
      console.log("\n========== PASSPORT AUTHENTICATE CALLBACK ==========");
      console.log(`[${new Date().toISOString()}] Passport authenticate callback triggered`);
      
      if (err) {
        console.error("PASSPORT ERROR:", err);
        console.error("Error Stack:", err.stack);
        return res.redirect('/login?error=passport-error');
      }
      
      if (!user) {
        console.log("AUTHENTICATION FAILED:");
        console.log("- Info from Passport:", JSON.stringify(info, null, 2));
        console.log("- User is null/false");
        return res.redirect('/login?error=google-auth-failed');
      }
      
      console.log("AUTHENTICATION SUCCESS:");
      console.log("- User authenticated successfully");
      console.log("- User ID:", user.id);
      console.log("- User email:", user.email);
      console.log("- User role:", user.role);
      console.log("- User organizationId:", user.organizationId);
      console.log("- User googleId:", user.googleId);
      console.log("- Is new OAuth user:", user.isNewOAuthUser || false);
      console.log("- Needs organization:", user.needsOrganization || false);
      
      // Log user in to session
      console.log("\nAttempting req.login()...");
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("REQ.LOGIN ERROR:", loginErr);
          console.error("Error Stack:", loginErr.stack);
          return res.redirect('/login?error=session-error');
        }
        
        console.log("req.login() successful");
        console.log("- Session ID after login:", req.sessionID);
        console.log("- Is authenticated after login:", req.isAuthenticated());
        
        // Save session explicitly
        console.log("\nSaving session explicitly...");
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("SESSION SAVE ERROR:", saveErr);
            console.error("Error Stack:", saveErr.stack);
            return res.redirect('/login?error=session-save-error');
          }
          
          console.log("Session saved successfully");
          console.log("- Final session keys:", Object.keys(req.session));
          if ((req.session as any).passport) {
            console.log("- Final passport data:", JSON.stringify((req.session as any).passport, null, 2));
          }
          
          // Determine redirect URL
          let redirectUrl = '/dashboard';
          
          // Check if user needs to complete organization setup
          if (user.needsOrganization || user.isNewOAuthUser) {
            console.log("User needs organization setup, redirecting to complete-signup");
            redirectUrl = '/complete-signup';
          } else if (req.session.redirectTo) {
            console.log("Using stored redirect URL:", req.session.redirectTo);
            redirectUrl = req.session.redirectTo;
            delete req.session.redirectTo;
          }
          
          console.log(`\nREDIRECTING TO: ${redirectUrl}`);
          console.log("========== PASSPORT AUTHENTICATE CALLBACK END (SUCCESS) ==========\n");
          
          res.redirect(redirectUrl);
        });
      });
    })(req, res, next);
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