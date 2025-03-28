/**
 * Deployment script for SmartWater Pools Management System
 * Handles the correct build process for deployment, ensuring path aliases work properly
 */
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

console.log('🚀 Starting deployment process...');

try {
  // Step 1: Run the deploy helper to prepare the project
  console.log('🔧 Preparing project for deployment...');
  execSync('node scripts/deploy-helper.js', { stdio: 'inherit', cwd: rootDir });
  
  // Step 2: Run the build script
  console.log('📦 Building project...');
  execSync('node scripts/build.js', { stdio: 'inherit', cwd: rootDir });
  
  // Step 3: Create a .env.production file if it doesn't exist
  const envProdPath = resolve(rootDir, '.env.production');
  if (!fs.existsSync(envProdPath)) {
    console.log('📝 Creating .env.production file...');
    fs.writeFileSync(envProdPath, '# Production environment variables\n');
  }
  
  console.log('✅ Deployment preparation completed successfully!');
  console.log('ℹ️ Note: To start the server in production mode, use NODE_ENV=production node dist/index.js');
} catch (error) {
  console.error('❌ Deployment failed:', error);
  process.exit(1);
}