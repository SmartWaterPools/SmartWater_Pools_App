/**
 * Fix Google OAuth Callback URLs
 * 
 * This script ensures consistency in all Google OAuth callback URL configurations
 * to resolve auth issues with Travis@SmartWaterPools.com and other accounts.
 * 
 * Issues:
 * 1. Multiple callback URL formats being defined in different files
 * 2. Inconsistent usage of domain names in callback URLs
 * 3. Potential mismatch with what's configured in Google Developer Console
 */

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

async function fixGoogleCallbackUrls() {
  console.log('=== Fixing Google OAuth Callback URLs ===');
  
  // 1. Determine correct callback URL based on environment
  let correctCallbackUrl = 'http://localhost:5000/api/auth/google/callback';
  const isReplit = process.env.REPL_ID && process.env.REPL_SLUG && process.env.REPL_OWNER;
  
  if (isReplit) {
    // Use the production domain for deployed app to work with registered OAuth app
    correctCallbackUrl = 'https://smartwaterpools.replit.app/api/auth/google/callback';
    console.log(`Running in Replit environment. Setting callback URL to: ${correctCallbackUrl}`);
  }
  
  console.log(`Using callback URL: ${correctCallbackUrl}`);
  
  // 2. Update auth.ts file
  try {
    const authFile = path.join(process.cwd(), 'server/auth.ts');
    console.log(`Updating file: ${authFile}`);
    
    let content = readFileSync(authFile, 'utf-8');
    
    // Look for the callback URL line and update it
    const callbackUrlPattern = /let callbackURL = [^;]+;/;
    const updatedContent = content.replace(
      callbackUrlPattern,
      `let callbackURL = '${correctCallbackUrl}';`
    );
    
    // Make sure we explicitly set the callback in Replit environment
    const replitPattern = /if \(process\.env\.REPL_ID.+\) \{[\s\S]+?}/;
    const replitReplacement = 
`if (process.env.REPL_ID && process.env.REPL_SLUG && process.env.REPL_OWNER) {
    // Always use the production domain since that's where users are logging in from
    callbackURL = '${correctCallbackUrl}';
    console.log(\`Running in Replit environment. Using production callback URL: \${callbackURL}\`);
  }`;
    
    const finalContent = updatedContent.replace(replitPattern, replitReplacement);
    
    // Save changes
    writeFileSync(authFile, finalContent);
    console.log(`✅ Updated ${authFile}`);
  } catch (error) {
    console.error(`Error updating auth.ts:`, error);
  }
  
  // 3. Update routes.ts to ensure consistent callback URLs
  try {
    const routesFile = path.join(process.cwd(), 'server/routes.ts');
    console.log(`Updating file: ${routesFile}`);
    
    let content = readFileSync(routesFile, 'utf-8');
    
    // Replace any hardcoded callback URLs with the correct one
    const callbackUrls = [
      'https://workspace.${process.env.REPL_OWNER}.repl.co/api/auth/google/callback',
      'http://localhost:5000/api/auth/google/callback'
    ];
    
    let updatedContent = content;
    callbackUrls.forEach(url => {
      const escapedUrl = url.replace(/\$/g, '\\$').replace(/\./g, '\\.').replace(/\//g, '\\/');
      const pattern = new RegExp(escapedUrl, 'g');
      updatedContent = updatedContent.replace(pattern, correctCallbackUrl);
    });
    
    // Save changes
    writeFileSync(routesFile, updatedContent);
    console.log(`✅ Updated ${routesFile}`);
  } catch (error) {
    console.error(`Error updating routes.ts:`, error);
  }
  
  console.log('=== Google OAuth Callback URL update complete ===');
  console.log('Restart your server for changes to take effect.');
  console.log('Remember to verify the callback URL in the Google Developer Console:');
  console.log(`- Make sure ${correctCallbackUrl} is registered as an authorized redirect URI`);
}

fixGoogleCallbackUrls().catch(console.error);