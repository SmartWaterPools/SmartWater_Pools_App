/**
 * Deployment verification script
 * Checks if the project is properly configured for deployment
 */
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

console.log('🔍 Verifying deployment readiness...');

const issues = [];
const warnings = [];
let passesVerification = true;

// Check .npmrc exists
if (!fs.existsSync(resolve(rootDir, '.npmrc'))) {
  issues.push('❌ .npmrc file is missing - this may cause path alias errors during deployment');
  passesVerification = false;
} else {
  const npmrc = fs.readFileSync(resolve(rootDir, '.npmrc'), 'utf8');
  if (!npmrc.includes('save-exact=true')) {
    warnings.push('⚠️ .npmrc file may not be properly configured to handle path aliases');
  }
}

// Check for correct build scripts
try {
  if (!fs.existsSync(resolve(rootDir, 'scripts/build.js'))) {
    issues.push('❌ Build script (scripts/build.js) is missing');
    passesVerification = false;
  }

  if (!fs.existsSync(resolve(rootDir, 'scripts/deploy.js'))) {
    issues.push('❌ Deployment script (scripts/deploy.js) is missing');
    passesVerification = false;
  }
} catch (error) {
  issues.push(`❌ Error checking build scripts: ${error.message}`);
  passesVerification = false;
}

// Check paths configuration in tsconfig.json
try {
  const tsconfig = JSON.parse(fs.readFileSync(resolve(rootDir, 'tsconfig.json'), 'utf8'));
  if (!tsconfig.compilerOptions.paths || !tsconfig.compilerOptions.paths['@/*']) {
    issues.push('❌ Path aliases not correctly configured in tsconfig.json');
    passesVerification = false;
  }
} catch (error) {
  issues.push(`❌ Error reading tsconfig.json: ${error.message}`);
  passesVerification = false;
}

// Check paths configuration in vite.config.ts
try {
  const viteConfig = fs.readFileSync(resolve(rootDir, 'vite.config.ts'), 'utf8');
  if (!viteConfig.includes('@": path.resolve') && !viteConfig.includes('@/": path.resolve')) {
    issues.push('❌ Path aliases not correctly configured in vite.config.ts');
    passesVerification = false;
  }
} catch (error) {
  issues.push(`❌ Error reading vite.config.ts: ${error.message}`);
  passesVerification = false;
}

// Print results
console.log('\n📋 Deployment Verification Results:');

if (issues.length === 0) {
  console.log('✅ All deployment requirements passed!');
} else {
  console.log('\nCritical Issues:');
  issues.forEach(issue => console.log(issue));
}

if (warnings.length > 0) {
  console.log('\nWarnings:');
  warnings.forEach(warning => console.log(warning));
}

console.log('\n📝 Recommended actions:');
if (!passesVerification) {
  console.log('1. Fix the critical issues listed above');
  console.log('2. Run the deployment script: node scripts/deploy.js');
  console.log('3. Run this verification check again');
} else {
  console.log('1. Run the deployment script: node scripts/deploy.js');
  console.log('2. Deploy using the Replit deployment interface');
}

// Exit with proper code
process.exit(passesVerification ? 0 : 1);