/**
 * Cloud Run Environment Test Script
 * Simulates a Cloud Run environment locally for testing
 */
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import http from 'http';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

console.log('🚀 Starting Cloud Run environment simulation...');

// Define test port
const PORT = 5000;

// Check if build exists
if (!fs.existsSync(resolve(rootDir, 'dist/index.js'))) {
  console.log('❌ Build not found. Building project first...');
  try {
    execSync('node scripts/build.js', { stdio: 'inherit', cwd: rootDir });
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Set environment variables similar to Cloud Run
process.env.PORT = PORT;
process.env.NODE_ENV = 'production';

console.log(`\n🔧 Starting server with production environment on port ${PORT}...`);
console.log('📝 Press Ctrl+C to stop the server\n');

// Start the server
const server = spawn('node', ['dist/index.js'], {
  cwd: rootDir,
  env: { ...process.env },
  stdio: 'inherit'
});

// Check if the server is running
setTimeout(() => {
  http.get(`http://localhost:${PORT}/api/health`, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const health = JSON.parse(data);
          console.log('\n✅ Server health check passed:');
          console.log(`🔹 Status: ${health.status}`);
          console.log(`🔹 Environment: ${health.environment}`);
          if (health.database) {
            console.log(`🔹 Database: ${health.database}`);
          }
          
          console.log(`\n📝 Test your app in the browser: http://localhost:${PORT}`);
          console.log('📝 This simulates how your app will run in Cloud Run');
        } catch (e) {
          console.log('\n⚠️ Server is running but returned invalid health check data');
        }
      } else {
        console.log(`\n⚠️ Server responded with status ${res.statusCode}`);
      }
    });
  }).on('error', () => {
    console.log('\n❌ Server health check failed - server may not be running correctly');
  });
}, 3000);

// Handle server process
server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

server.on('close', (code) => {
  console.log(`\n🛑 Server process exited with code ${code}`);
});