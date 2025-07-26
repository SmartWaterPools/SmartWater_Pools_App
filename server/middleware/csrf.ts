import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// CSRF token management
const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_SESSION_KEY = 'csrfToken';

// Generate a new CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

// Middleware to create and attach CSRF token to session
export function csrfTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only generate CSRF token for sessions that need it
  if (req.session && !req.session[CSRF_SESSION_KEY]) {
    req.session[CSRF_SESSION_KEY] = generateCSRFToken();
  }
  
  // Add CSRF token to response locals for templates
  if (req.session && req.session[CSRF_SESSION_KEY]) {
    res.locals.csrfToken = req.session[CSRF_SESSION_KEY];
  }
  
  next();
}

// Middleware to validate CSRF token on state-changing requests
export function validateCSRFToken(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF validation for API endpoints that use different authentication
  // OAuth callbacks need to be excluded
  const excludedPaths = [
    '/api/auth/google/callback',
    '/api/auth/oauth/callback',
    '/api/stripe/webhook', // Stripe webhooks have their own validation
    '/api/health', // Health checks
  ];
  
  if (excludedPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // Get CSRF token from session
  const sessionToken = req.session?.[CSRF_SESSION_KEY];
  
  if (!sessionToken) {
    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'No CSRF token found in session'
    });
  }
  
  // Get CSRF token from request (header or body)
  const requestToken = req.headers[CSRF_HEADER_NAME.toLowerCase()] || 
                      req.headers[CSRF_HEADER_NAME] ||
                      req.body?.csrfToken ||
                      req.body?._csrf;
  
  if (!requestToken) {
    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'CSRF token not provided in request'
    });
  }
  
  // Validate tokens match
  if (sessionToken !== requestToken) {
    console.warn(`CSRF token mismatch for ${req.method} ${req.path} from IP ${req.ip}`);
    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'Invalid CSRF token'
    });
  }
  
  // Token is valid, proceed
  next();
}

// Endpoint to get current CSRF token
export function getCSRFToken(req: Request, res: Response) {
  if (!req.session) {
    return res.status(500).json({
      error: 'Session not initialized'
    });
  }
  
  // Generate token if it doesn't exist
  if (!req.session[CSRF_SESSION_KEY]) {
    req.session[CSRF_SESSION_KEY] = generateCSRFToken();
  }
  
  res.json({
    csrfToken: req.session[CSRF_SESSION_KEY]
  });
}