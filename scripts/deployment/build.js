/**
 * Custom build script to handle path aliases correctly during the build process
 */
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

console.log('🔨 Starting custom build process...');

try {
  // Step 1: Build frontend with Vite
  console.log('📦 Building frontend with Vite...');
  execSync('vite build', { stdio: 'inherit', cwd: rootDir });
  
  // Step 2: Build backend with esbuild and correct path aliases
  console.log('📦 Building backend with esbuild...');
  execSync(
    'esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --alias:@/=./client/src/ --alias:@shared/=./shared/',
    { stdio: 'inherit', cwd: rootDir }
  );
  
  // Step 3: Create a .env.production file if it doesn't exist
  const envProdPath = resolve(rootDir, '.env.production');
  if (!fs.existsSync(envProdPath)) {
    console.log('📝 Creating .env.production file...');
    fs.writeFileSync(envProdPath, '# Production environment variables\n');
  }
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}