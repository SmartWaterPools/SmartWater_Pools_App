// build.js - Script to build the application for deployment
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting build process for deployment...');

// Execute the build command
console.log('\n📦 Running build command: npm run build');
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Build error: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.log(`Build process stderr: ${stderr}`);
  }
  
  console.log(`Build process stdout: ${stdout}`);
  
  // Check if build artifacts were created
  const distDir = path.join(__dirname, 'dist');
  const clientBuildDir = path.join(distDir, 'public');
  const serverBuild = path.join(distDir, 'index.js');
  
  console.log('\n🔍 Checking build artifacts...');
  
  if (fs.existsSync(distDir)) {
    console.log('✅ dist/ directory created successfully');
    
    if (fs.existsSync(serverBuild)) {
      console.log('✅ Server build (dist/index.js) exists');
    } else {
      console.error('❌ Server build (dist/index.js) is missing!');
    }
    
    if (fs.existsSync(clientBuildDir)) {
      console.log('✅ Client build directory (dist/public/) exists');
      
      const indexHtml = path.join(clientBuildDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        console.log('✅ Client entry point (dist/public/index.html) exists');
      } else {
        console.error('❌ Client entry point (dist/public/index.html) is missing!');
      }
      
      // Count assets to ensure we have something
      const files = fs.readdirSync(clientBuildDir);
      console.log(`📊 Found ${files.length} files in client build directory`);
    } else {
      console.error('❌ Client build directory (dist/public/) is missing!');
    }
    
    console.log('\n✨ Build process completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Make sure dist/ directory is not gitignored for deployment');
    console.log('2. Click the "Deploy" button in the Replit interface');
    console.log('3. Choose "Deploy to Cloud Run" option');
  } else {
    console.error('❌ dist/ directory was not created! Build failed.');
  }
});