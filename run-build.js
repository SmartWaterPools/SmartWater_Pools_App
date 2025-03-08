// Build script for SmartWater Pools Management System
// This script creates a production-ready build for deployment

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

console.log(`${colors.bright}${colors.cyan}
╔═════════════════════════════════════════════════════╗
║  SmartWater Pools Management System - Build Script  ║
╚═════════════════════════════════════════════════════╝${colors.reset}
`);

try {
  // Step 1: Check if dist directory exists, create or clean it
  const distDir = path.join(__dirname, 'dist');
  console.log(`${colors.yellow}Step 1: Preparing build directory...${colors.reset}`);
  
  if (fs.existsSync(distDir)) {
    console.log('- Cleaning existing dist directory...');
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  
  fs.mkdirSync(distDir, { recursive: true });
  console.log(`${colors.green}✓ Build directory prepared${colors.reset}\n`);

  // Step 2: Build frontend with Vite
  console.log(`${colors.yellow}Step 2: Building client with Vite...${colors.reset}`);
  try {
    execSync('npx vite build', { stdio: 'inherit' });
    console.log(`${colors.green}✓ Frontend built successfully${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}✗ Frontend build failed:${colors.reset}`, error.message);
    process.exit(1);
  }

  // Step 3: Build server with esbuild
  console.log(`${colors.yellow}Step 3: Building server with esbuild...${colors.reset}`);
  try {
    execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', 
      { stdio: 'inherit' });
    console.log(`${colors.green}✓ Server built successfully${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}✗ Server build failed:${colors.reset}`, error.message);
    process.exit(1);
  }

  // Step 4: Verify build artifacts
  console.log(`${colors.yellow}Step 4: Verifying build artifacts...${colors.reset}`);
  
  const serverBuild = path.join(distDir, 'index.js');
  const clientDir = path.join(distDir, 'public');
  const clientIndex = path.join(clientDir, 'index.html');
  
  if (!fs.existsSync(serverBuild)) {
    console.error(`${colors.red}✗ Server build not found at ${serverBuild}${colors.reset}`);
    process.exit(1);
  } else {
    console.log('- Server build verified ✓');
  }
  
  if (!fs.existsSync(clientDir) || !fs.existsSync(clientIndex)) {
    console.error(`${colors.red}✗ Client build not found at ${clientIndex}${colors.reset}`);
    process.exit(1);
  } else {
    const files = fs.readdirSync(clientDir);
    console.log(`- Client build verified ✓ (${files.length} files)`);
  }

  // Step 5: Create a package.json specifically for production
  console.log(`${colors.yellow}Step 5: Creating production package.json...${colors.reset}`);
  
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  
  // Simplify package.json for production
  const prodPackage = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    type: "module",
    engines: {
      node: ">=18.0.0"
    },
    scripts: {
      start: "NODE_ENV=production node index.js"
    },
    dependencies: packageJson.dependencies
  };
  
  fs.writeFileSync(
    path.join(distDir, 'package.json'),
    JSON.stringify(prodPackage, null, 2)
  );
  console.log(`${colors.green}✓ Production package.json created${colors.reset}\n`);

  // Step 6: Create README/instructions in the dist directory
  console.log(`${colors.yellow}Step 6: Adding deployment instructions...${colors.reset}`);
  
  const readmeContent = `# SmartWater Pools Management System - Production Build

This directory contains the production build of the SmartWater Pools Management System.

## Structure

- \`index.js\`: The compiled server application
- \`public/\`: The compiled frontend application
- \`package.json\`: Simplified package.json for production

## Running in Production

\`\`\`
NODE_ENV=production PORT=8080 node index.js
\`\`\`

## Cloud Run Deployment

This build is ready to be deployed to Google Cloud Run.
For detailed deployment instructions, see the DEPLOYMENT.md file in the project root.
`;
  
  fs.writeFileSync(
    path.join(distDir, 'README.md'),
    readmeContent
  );
  console.log(`${colors.green}✓ Deployment instructions added${colors.reset}\n`);

  // Done!
  console.log(`${colors.bright}${colors.green}
╔═════════════════════════════════════════════╗
║  Build completed successfully! 🎉            ║
╚═════════════════════════════════════════════╝${colors.reset}

${colors.cyan}To test the production build:${colors.reset}
1. Run the Cloud Run test script:
   ${colors.bright}node cloudrun-test.js${colors.reset}

${colors.cyan}To deploy to Cloud Run:${colors.reset}
1. Commit and push your code (including the dist/ directory)
2. Click the "Deploy" button in Replit
3. Choose "Deploy to Cloud Run"
4. Follow the deployment prompts

${colors.cyan}For more details:${colors.reset}
See DEPLOYMENT.md for comprehensive deployment instructions
  `);

} catch (error) {
  console.error(`${colors.red}Build failed with error:${colors.reset}`, error);
  process.exit(1);
}