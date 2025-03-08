// Deployment verification script for SmartWater Pools Management System
// This script performs a comprehensive check of deployment readiness

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n🔍 SMARTWATER POOLS DEPLOYMENT VERIFICATION\n');
console.log('This script verifies that your application is ready for Cloud Run deployment\n');

// STEP 1: Verify server configuration
console.log('STEP 1: Checking server configuration...');
try {
  const serverFile = path.join(__dirname, 'server', 'index.ts');
  const serverContent = fs.readFileSync(serverFile, 'utf8');
  
  // Check for essential configuration
  let checksPassed = true;
  
  if (!serverContent.includes('process.env.PORT')) {
    console.error('❌ Server is not configured to use PORT environment variable');
    checksPassed = false;
  } else {
    console.log('✅ Server uses PORT environment variable');
  }
  
  if (!serverContent.includes('0.0.0.0')) {
    console.error('❌ Server is not configured to bind to all interfaces (0.0.0.0)');
    checksPassed = false;
  } else {
    console.log('✅ Server binds to all interfaces (0.0.0.0)');
  }
  
  if (!serverContent.includes('SIGTERM')) {
    console.warn('⚠️ Server lacks SIGTERM handler (recommended for graceful shutdown)');
  } else {
    console.log('✅ Server has SIGTERM handler for graceful shutdown');
  }
  
  if (checksPassed) {
    console.log('✅ Server configuration looks good for Cloud Run deployment');
  } else {
    console.warn('⚠️ Server configuration needs improvements for Cloud Run');
  }
} catch (error) {
  console.error(`❌ Error checking server configuration: ${error.message}`);
}

// STEP 2: Check build script in package.json
console.log('\nSTEP 2: Checking build configuration...');
try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.scripts?.build) {
    console.error('❌ No build script found in package.json');
  } else {
    console.log(`✅ Build script found: "${packageJson.scripts.build}"`);
  }
  
  if (!packageJson.scripts?.start) {
    console.error('❌ No start script found in package.json');
  } else {
    console.log(`✅ Start script found: "${packageJson.scripts.start}"`);
  }
  
  // Validate start script has production environment
  if (!packageJson.scripts?.start.includes('NODE_ENV=production')) {
    console.warn('⚠️ Start script should include NODE_ENV=production');
  } else {
    console.log('✅ Start script includes production environment');
  }
} catch (error) {
  console.error(`❌ Error checking package.json: ${error.message}`);
}

// STEP 3: Check for deployment configuration in .replit
console.log('\nSTEP 3: Checking deployment configuration...');
try {
  const replitPath = path.join(__dirname, '.replit');
  if (fs.existsSync(replitPath)) {
    const replitContent = fs.readFileSync(replitPath, 'utf8');
    
    if (!replitContent.includes('[deployment]')) {
      console.warn('⚠️ No [deployment] section found in .replit');
    } else {
      console.log('✅ Deployment section found in .replit');
    }
    
    if (!replitContent.includes('deploymentTarget = "cloudrun"')) {
      console.warn('⚠️ Cloud Run deployment target not configured in .replit');
    } else {
      console.log('✅ Cloud Run deployment target configured');
    }
  } else {
    console.warn('⚠️ .replit file not found');
  }
} catch (error) {
  console.error(`❌ Error checking .replit configuration: ${error.message}`);
}

// STEP 4: Check .gitignore settings
console.log('\nSTEP 4: Checking .gitignore configuration...');
try {
  const gitignorePath = path.join(__dirname, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    
    const distIgnored = /^dist$/m.test(gitignoreContent) || 
                        /^dist\//m.test(gitignoreContent) || 
                        /^\/dist$/m.test(gitignoreContent);
    
    if (distIgnored) {
      console.warn('⚠️ dist/ directory is being ignored in .gitignore');
      console.log('   This could prevent build artifacts from being deployed');
      console.log('   Consider commenting out the "dist" line in .gitignore');
    } else {
      console.log('✅ dist/ directory is not being ignored in .gitignore');
    }
  } else {
    console.log('ℹ️ No .gitignore file found');
  }
} catch (error) {
  console.error(`❌ Error checking .gitignore: ${error.message}`);
}

// STEP 5: Check if health endpoint is available
console.log('\nSTEP 5: Checking API health endpoint...');
try {
  // Check if server is running (using lsof)
  let serverRunning = false;
  try {
    const lsofOutput = execSync('lsof -i :5000 -t').toString().trim();
    serverRunning = lsofOutput !== '';
  } catch (error) {
    // lsof might not be available or no server running
    serverRunning = false;
  }
  
  if (serverRunning) {
    console.log('✅ Development server is running');
    
    // Check if health endpoint exists
    const req = http.request({
      host: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Health endpoint is available and returning 200 OK');
          try {
            const healthData = JSON.parse(data);
            console.log('   Health response:', healthData);
          } catch (error) {
            console.warn('⚠️ Health endpoint response is not valid JSON');
          }
        } else {
          console.warn(`⚠️ Health endpoint returned status code: ${res.statusCode}`);
        }
      });
    });
    
    req.on('error', (error) => {
      console.warn(`⚠️ Health endpoint request failed: ${error.message}`);
      console.log('   This may indicate the endpoint is not implemented.');
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.warn('⚠️ Health endpoint request timed out');
    });
    
    req.end();
  } else {
    console.log('ℹ️ Development server is not running, skipping health endpoint check');
  }
} catch (error) {
  console.error(`❌ Error checking health endpoint: ${error.message}`);
}

// STEP 6: Verify if build has already been run
console.log('\nSTEP 6: Checking for existing build artifacts...');
try {
  const distDir = path.join(__dirname, 'dist');
  if (fs.existsSync(distDir)) {
    console.log('✅ dist/ directory exists');
    
    // Check for server build
    if (fs.existsSync(path.join(distDir, 'index.js'))) {
      console.log('✅ Server build (dist/index.js) exists');
    } else {
      console.warn('⚠️ Server build (dist/index.js) missing');
    }
    
    // Check for client build
    const publicDir = path.join(distDir, 'public');
    if (fs.existsSync(publicDir)) {
      console.log('✅ Client build directory (dist/public/) exists');
      
      if (fs.existsSync(path.join(publicDir, 'index.html'))) {
        console.log('✅ Client entry point (dist/public/index.html) exists');
      } else {
        console.warn('⚠️ Client entry point (dist/public/index.html) missing');
      }
      
      // Count assets to ensure we have something
      const files = fs.readdirSync(publicDir);
      console.log(`   Found ${files.length} files in client build directory`);
    } else {
      console.warn('⚠️ Client build directory (dist/public/) missing');
    }
  } else {
    console.warn('⚠️ dist/ directory not found');
    console.log('   Run "node run-build.js" to create build artifacts');
  }
} catch (error) {
  console.error(`❌ Error checking build artifacts: ${error.message}`);
}

// Summary and next steps
console.log('\n📋 DEPLOYMENT READINESS SUMMARY');
console.log('Based on the checks performed:');
console.log('1. Make sure your code is committed and pushed');
console.log('2. Run "node run-build.js" to build the application');
console.log('3. Ensure dist/ directory is not ignored for deployment');
console.log('4. Click the "Deploy" button in the Replit interface');
console.log('5. Choose "Deploy to Cloud Run"');
console.log('6. Follow the deployment prompts\n');