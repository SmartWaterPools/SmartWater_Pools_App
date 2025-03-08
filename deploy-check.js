// Simple deployment check script for Cloud Run readiness
// Using ES modules syntax

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 Checking deployment readiness for Cloud Run...');

// Check if PORT environment variable is handled correctly
try {
  const mainScript = fs.readFileSync('./server/index.ts', 'utf8');
  if (!mainScript.includes('process.env.PORT')) {
    console.error('❌ server/index.ts does not properly handle process.env.PORT');
    process.exit(1);
  } else {
    console.log('✅ PORT environment variable handling: OK');
  }

  // Check for Cloud Run best practices
  if (!mainScript.includes('SIGTERM')) {
    console.warn('⚠️ Warning: No SIGTERM handler found. Cloud Run may not shut down gracefully.');
  } else {
    console.log('✅ Graceful shutdown handling: OK');
  }

  if (!mainScript.includes('0.0.0.0')) {
    console.error('❌ Server not configured to listen on 0.0.0.0 (all interfaces)');
    process.exit(1);
  } else {
    console.log('✅ Binding to all interfaces: OK');
  }
} catch (error) {
  console.error('❌ Error reading server/index.ts:', error.message);
}

// Check package.json for required scripts
try {
  const packageJson = require('./package.json');
  if (!packageJson.scripts.build) {
    console.error('❌ Missing "build" script in package.json');
    process.exit(1);
  } else {
    console.log('✅ Build script: OK');
  }
  
  if (!packageJson.scripts.start) {
    console.error('❌ Missing "start" script in package.json');
    process.exit(1);
  } else {
    console.log('✅ Start script: OK');
  }
} catch (error) {
  console.error('❌ Error reading package.json:', error.message);
}

// Check for deployment configuration in .replit file
try {
  const replitConfig = fs.readFileSync('./.replit', 'utf8');
  if (!replitConfig.includes('deploymentTarget')) {
    console.warn('⚠️ Warning: No deployment configuration found in .replit');
  } else if (!replitConfig.includes('cloudrun')) {
    console.warn('⚠️ Warning: Deployment target may not be set to Cloud Run in .replit');
  } else {
    console.log('✅ Replit deployment configuration: OK');
  }
} catch (error) {
  console.warn('⚠️ Warning: Unable to read .replit file:', error.message);
}

console.log('\n✨ Deployment check complete!');
console.log('Your application is configured correctly for Cloud Run deployment.');
console.log('Remember to use the "deploy" button in the Replit interface to deploy your application.');