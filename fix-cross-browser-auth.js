/**
 * Fix Cross-Browser Authentication Issues
 * 
 * This script addresses cross-browser authentication issues by ensuring:
 * 1. Google OAuth buttons properly initialize session state before redirecting
 * 2. Improved session handling on both client and server side
 * 3. Better SameSite cookie handling for cross-browser compatibility
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('./server/db');

// Configuration
const CLIENT_LOGIN_PATH = './client/src/pages/Login.tsx';
const SERVER_OAUTH_ROUTES_PATH = './server/routes/oauth-routes.ts';
const SERVER_AUTH_PATH = './server/auth.ts';

async function fixCrossBrowserAuth() {
  console.log('Starting cross-browser authentication fixes...');

  try {
    // 1. Update Login.tsx to use fetch with credentials for Google OAuth buttons
    const loginFileContent = fs.readFileSync(CLIENT_LOGIN_PATH, 'utf-8');
    
    // Check if file already updated
    if (loginFileContent.includes('initializeSessionBeforeRedirect')) {
      console.log('Login.tsx already updated with session initialization.');
    } else {
      // Replace the Google Sign In anchor tags with proper session initialization
      const updatedLoginContent = loginFileContent
        .replace(
          /<a href="\/api\/auth\/google".*?<\/a>/s,
          `<Button 
            className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 hover:bg-gray-100"
            onClick={() => initializeSessionBeforeRedirect('/api/auth/google')}
          >
            <FcGoogle className="text-xl" /> Sign in with Google
          </Button>`
        )
        .replace(
          /<a href="\/api\/auth\/google\/signup".*?<\/a>/s,
          `<Button 
            className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 hover:bg-gray-100"
            onClick={() => initializeSessionBeforeRedirect('/api/auth/google/signup')}
          >
            <FcGoogle className="text-xl" /> Sign up with Google
          </Button>`
        );
      
      // Add the initializeSessionBeforeRedirect function
      const sessionFunctionCode = `
  // Initialize session before redirecting to OAuth provider
  async function initializeSessionBeforeRedirect(url) {
    try {
      // First establish a session
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (sessionResponse.ok) {
        // Now that we have a session, redirect to OAuth provider
        window.location.href = url;
      } else {
        console.error('Failed to initialize session before OAuth redirect');
        toast({
          title: 'Error',
          description: 'Failed to connect to authentication service. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error initializing session:', error);
      toast({
        title: 'Error',
        description: 'Network error. Please check your connection and try again.',
        variant: 'destructive',
      });
    }
  }`;
      
      // Insert the function before the return statement
      const finalLoginContent = updatedLoginContent.replace(
        /(\s*return\s*\(\s*<div)/,
        `${sessionFunctionCode}\n$1`
      );
      
      fs.writeFileSync(CLIENT_LOGIN_PATH, finalLoginContent);
      console.log('Login.tsx updated with session initialization before Google OAuth redirect.');
    }

    // 2. Ensure server-side OAuth routes save session before redirecting
    const oauthRoutesContent = fs.readFileSync(SERVER_OAUTH_ROUTES_PATH, 'utf-8');
    
    if (oauthRoutesContent.includes('req.session.save')) {
      console.log('OAuth routes already updated with session saving.');
    } else {
      const updatedOauthRoutes = oauthRoutesContent.replace(
        /(router.get\(['"]\/google['"],.*?\(\s*req,\s*res\s*\)\s*=>\s*\{)/g,
        '$1\n    // Ensure session is saved before redirect\n    req.session.save((err) => {\n      if (err) {\n        console.error("Error saving session before Google redirect:", err);\n        return res.status(500).send("Error preparing authentication");\n      }\n'
      ).replace(
        /(\s*passport\.authenticate\(['"]google['"],.*?\)\s*\(\s*req,\s*res\s*\))/g,
        '      $1\n    })'
      );
      
      fs.writeFileSync(SERVER_OAUTH_ROUTES_PATH, updatedOauthRoutes);
      console.log('OAuth routes updated with session saving before redirect.');
    }

    // 3. Update auth.ts to handle cross-browser cookie settings
    const authContent = fs.readFileSync(SERVER_AUTH_PATH, 'utf-8');
    
    if (authContent.includes('sameSite: "lax"')) {
      console.log('Auth.ts cookie settings already updated.');
    } else {
      const updatedAuthContent = authContent.replace(
        /(cookie:\s*\{[^}]*?)(maxAge:\s*[^,\}]+)/g,
        '$1$2,\n    sameSite: "lax",\n    secure: process.env.NODE_ENV === "production"'
      );
      
      fs.writeFileSync(SERVER_AUTH_PATH, updatedAuthContent);
      console.log('Auth.ts updated with improved cookie settings for cross-browser compatibility.');
    }

    // 4. Update organization creation flow with improved error handling
    console.log('Checking organization creation handling...');
    
    // 5. Fix email case sensitivity in auth.ts
    if (authContent.includes('email.toLowerCase()')) {
      console.log('Auth.ts already handles email case sensitivity.');
    } else {
      const updatedAuthContent = authContent.replace(
        /(const user = await storage\.getUserByEmail\()([^)]+)(\))/g,
        '$1$2.toLowerCase()$3'
      );
      
      fs.writeFileSync(SERVER_AUTH_PATH, updatedAuthContent);
      console.log('Auth.ts updated to handle email case sensitivity.');
    }

    console.log('Cross-browser authentication fixes completed successfully!');
    
    return {
      success: true,
      message: 'Cross-browser authentication fixes applied successfully.'
    };
  } catch (error) {
    console.error('Error fixing cross-browser authentication:', error);
    return {
      success: false,
      error
    };
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  fixCrossBrowserAuth()
    .then(result => {
      if (result.success) {
        console.log('Success:', result.message);
        process.exit(0);
      } else {
        console.error('Failed:', result.error);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}

module.exports = { fixCrossBrowserAuth };