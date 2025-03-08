// CloudRun Test Script
// This script simulates the Cloud Run environment for testing

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check if build exists
const distDir = path.join(__dirname, 'dist');
const serverBuild = path.join(distDir, 'index.js');

if (!fs.existsSync(distDir) || !fs.existsSync(serverBuild)) {
  console.error('\n❌ Build artifacts not found! Please run "node run-build.js" first.\n');
  process.exit(1);
}

// Set Cloud Run environment
process.env.NODE_ENV = 'production';
process.env.PORT = '8080';

console.log('\n🚀 CLOUD RUN ENVIRONMENT SIMULATOR');
console.log('\nThis script creates a minimal environment that simulates Cloud Run');
console.log('If the app works here, it should work when deployed to Cloud Run.\n');

console.log('Environment variables:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- PORT: ${process.env.PORT}`);
console.log(''); // Empty line for readability

// Create a minimal HTTP server that proxies to our actual server
// This is just for verification, the real server will be started separately
const app = express();

// Serve static files from dist/public (the built frontend)
app.use(express.static(path.join(__dirname, 'dist', 'public')));

// Health check endpoint (separate from the app's health endpoint)
app.get('/simulator-health', (req, res) => {
  res.json({
    simulator: 'running',
    time: new Date().toISOString()
  });
});

// Any other route gets index.html (SPA support)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    // For API requests, proxy to the actual server
    const options = {
      hostname: 'localhost',
      port: process.env.PORT,
      path: req.url,
      method: req.method,
      headers: req.headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error(`Proxy error: ${error.message}`);
      res.status(502).json({ error: 'Bad Gateway', message: 'Failed to proxy request to server' });
    });

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      // Forward request body
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  } else {
    // For non-API requests, serve the SPA index
    res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'));
  }
});

// Start the test server
// Note that we use a different port (3000) than the actual server (8080)
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Simulator running at http://localhost:${PORT}`);
  console.log('\nIn parallel, the app server should be started with:');
  console.log('NODE_ENV=production PORT=8080 node dist/index.js\n');
  
  console.log('Press Ctrl+C to stop the simulator\n');
});

// Start the actual server process
console.log('\n🚀 Starting the production server...');
import('./dist/index.js')
  .then(() => {
    console.log('✅ Production server imported successfully');
  })
  .catch((error) => {
    console.error(`❌ Error starting production server: ${error.message}`);
    console.error('Please check your build and try again.');
  });