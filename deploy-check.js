// Enhanced deployment check script for Cloud Run
// Using ES modules syntax

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { createRequire } from 'module';
import { execSync } from 'child_process';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n🔍 Running enhanced Cloud Run deployment check...');

// Validate server configuration
try {
  const serverFilePath = './server/index.ts';
  console.log(`\nChecking ${serverFilePath}...`);
  
  const serverContent = fs.readFileSync(serverFilePath, 'utf8');
  
  // Check PORT environment variable handling
  if (!serverContent.includes('process.env.PORT')) {
    console.error('❌ Error: server/index.ts does not handle process.env.PORT');
    process.exit(1);
  } else {
    console.log('✅ PORT environment variable handling: OK');
  }
  
  // Check for 0.0.0.0 binding (required for Cloud Run)
  if (!serverContent.includes('0.0.0.0')) {
    console.error('❌ Error: Server not configured to listen on 0.0.0.0 (all interfaces)');
    process.exit(1);
  } else {
    console.log('✅ Binding to all interfaces (0.0.0.0): OK');
  }
  
  // Check for SIGTERM handler (required for graceful shutdown)
  if (!serverContent.includes('SIGTERM')) {
    console.warn('⚠️ Warning: No SIGTERM handler found. Cloud Run may not shut down gracefully.');
  } else {
    console.log('✅ Graceful shutdown (SIGTERM) handling: OK');
  }
} catch (error) {
  console.error(`❌ Error checking server code: ${error.message}`);
}

// Check package.json scripts needed for Cloud Run
try {
  const packageJsonPath = './package.json';
  console.log(`\nChecking ${packageJsonPath}...`);
  
  const packageJson = require(packageJsonPath);
  
  // Check build script
  if (!packageJson.scripts?.build) {
    console.error('❌ Error: Missing "build" script in package.json');
    process.exit(1);
  } else {
    console.log(`✅ Build script found: "${packageJson.scripts.build}"`);
  }
  
  // Check start script
  if (!packageJson.scripts?.start) {
    console.error('❌ Error: Missing "start" script in package.json');
    process.exit(1);
  } else {
    console.log(`✅ Start script found: "${packageJson.scripts.start}"`);
  }
  
  // Validate start script uses NODE_ENV=production
  if (!packageJson.scripts.start.includes('NODE_ENV=production')) {
    console.warn('⚠️ Warning: start script should include NODE_ENV=production.');
  } else {
    console.log('✅ Production environment in start script: OK');
  }
} catch (error) {
  console.error(`❌ Error checking package.json: ${error.message}`);
}

// Check .replit deployment configuration
try {
  const replitFilePath = './.replit';
  console.log(`\nChecking ${replitFilePath}...`);
  
  const replitContent = fs.readFileSync(replitFilePath, 'utf8');
  
  // Check for deployment section
  if (!replitContent.includes('[deployment]')) {
    console.error('❌ Error: No [deployment] section in .replit file');
    process.exit(1);
  } else {
    console.log('✅ Deployment section exists: OK');
  }
  
  // Check for cloudrun target
  if (!replitContent.includes('deploymentTarget = "cloudrun"')) {
    console.error('❌ Error: Cloud Run deployment target not set in .replit');
    process.exit(1);
  } else {
    console.log('✅ Cloud Run deployment target: OK');
  }
  
  // Check build command
  if (!replitContent.includes('build = ["npm", "run", "build"]')) {
    console.warn('⚠️ Warning: Build command may not be correctly configured in .replit');
  } else {
    console.log('✅ Build command in .replit: OK');
  }
  
  // Check run command
  if (!replitContent.includes('run = ["npm", "run", "start"]')) {
    console.warn('⚠️ Warning: Run command may not be correctly configured in .replit');
  } else {
    console.log('✅ Run command in .replit: OK');
  }
} catch (error) {
  console.error(`❌ Error checking .replit file: ${error.message}`);
}

// Check for database configuration (if used)
console.log('\nChecking database configuration...');
if (process.env.DATABASE_URL) {
  console.log('✅ DATABASE_URL environment variable exists');
} else {
  console.warn('⚠️ Warning: DATABASE_URL environment variable not found');
}

// Verify git is clean
try {
  console.log('\nChecking git status...');
  const gitStatus = execSync('git status --porcelain').toString();
  if (gitStatus.trim() !== '') {
    console.warn('⚠️ Warning: You have uncommitted changes. Deployment may not include latest changes.');
  } else {
    console.log('✅ Git working directory is clean: OK');
  }
} catch (error) {
  console.warn('⚠️ Warning: Unable to check git status: ' + error.message);
}

// Additional Cloud Run specific checks
console.log('\nRunning Cloud Run specific checks...');

// Ensure dist directory will be included
try {
  const gitignorePath = './.gitignore';
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (gitignoreContent.includes('dist') || gitignoreContent.includes('dist/')) {
      console.warn('⚠️ Warning: "dist" is in .gitignore. Make sure it\'s not ignored for deployment.');
    } else {
      console.log('✅ dist/ not in .gitignore: OK');
    }
  }
} catch (error) {
  console.warn('⚠️ Warning: Unable to check .gitignore: ' + error.message);
}

// Check if dist/ exists and contains expected files
try {
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    console.log('✅ dist/ directory exists');
    
    // Check for server build
    if (fs.existsSync(path.join(distPath, 'index.js'))) {
      console.log('✅ Server build (dist/index.js) exists');
    } else {
      console.warn('⚠️ Warning: Server build (dist/index.js) missing. Run "npm run build" first.');
    }
    
    // Check for client build
    if (fs.existsSync(path.join(distPath, 'public', 'index.html'))) {
      console.log('✅ Client build (dist/public/index.html) exists');
    } else {
      console.warn('⚠️ Warning: Client build missing. Run "npm run build" first.');
    }
  } else {
    console.warn('⚠️ Warning: dist/ directory not found. Run "npm run build" before deploying.');
  }
} catch (error) {
  console.warn('⚠️ Warning: Error checking dist/ directory: ' + error.message);
}

console.log('\n✨ Deployment check complete!');

// Final recommendation
console.log('\nRecommendation:');
console.log('1. Run "npm run build" to verify the build process works locally');
console.log('2. Test the production build with "PORT=8080 NODE_ENV=production node dist/index.js"');
console.log('3. Use the "deploy" button in the Replit interface to deploy your application');
console.log('4. Check the deployment logs for specific errors if deployment fails');