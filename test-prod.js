// Production Build Test Script
// This script tests the production build of the application

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n🧪 TESTING PRODUCTION BUILD\n');

// Check if build exists
const distDir = path.join(__dirname, 'dist');
const serverBuild = path.join(distDir, 'index.js');

if (!fs.existsSync(distDir) || !fs.existsSync(serverBuild)) {
  console.error('❌ Build artifacts not found! Please run "node run-build.js" first.');
  process.exit(1);
}

// Check for client build
const clientDir = path.join(distDir, 'public');
const clientIndex = path.join(clientDir, 'index.html');

if (!fs.existsSync(clientDir) || !fs.existsSync(clientIndex)) {
  console.error('❌ Client build not found! Please run "node run-build.js" first.');
  process.exit(1);
}

console.log('✅ Build artifacts found, ready to test\n');

// Function to make a request to the specified URL and test it
function testEndpoint(options, testName) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const statusOk = res.statusCode >= 200 && res.statusCode < 300;
        if (statusOk) {
          console.log(`✅ [${testName}] Status: ${res.statusCode} - Success`);
          try {
            // Try to parse JSON for API responses
            if (res.headers['content-type']?.includes('application/json')) {
              const jsonData = JSON.parse(data);
              resolve({ success: true, data: jsonData, statusCode: res.statusCode });
            } else {
              resolve({ success: true, data, statusCode: res.statusCode });
            }
          } catch (error) {
            resolve({ success: true, data, statusCode: res.statusCode });
          }
        } else {
          console.error(`❌ [${testName}] Status: ${res.statusCode} - Failed`);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`❌ [${testName}] Error: ${error.message}`);
      reject(error);
    });
    
    req.on('timeout', () => {
      console.error(`❌ [${testName}] Request timed out`);
      req.destroy();
      reject(new Error('Request timed out'));
    });
    
    req.end();
  });
}

console.log('Starting endpoint tests...\n');

// Test the health endpoint
async function runTests() {
  try {
    // Test the health endpoint
    console.log('Testing health endpoint...');
    await testEndpoint({
      host: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    }, 'Health Endpoint');
    
    // Test loading clients
    console.log('\nTesting clients endpoint...');
    await testEndpoint({
      host: 'localhost',
      port: 5000,
      path: '/api/clients',
      method: 'GET',
      timeout: 5000
    }, 'Clients Endpoint');
    
    // Test dashboard summary
    console.log('\nTesting dashboard summary...');
    await testEndpoint({
      host: 'localhost',
      port: 5000,
      path: '/api/dashboard/summary',
      method: 'GET',
      timeout: 5000
    }, 'Dashboard Summary');
    
    console.log('\n✅ All endpoint tests passed!\n');
    
    console.log('The application is configured correctly and all essential endpoints are working.');
    console.log('You can proceed with deployment to Cloud Run.\n');
    
  } catch (error) {
    console.error('\n❌ Some tests failed:');
    console.error(error.message);
    console.error('\nPlease fix these issues before deploying to Cloud Run.\n');
  }
}

runTests();