// Test server for local Cloud Run build verification
// This mimics the behavior of Cloud Run deployment

import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// First, verify build artifacts exist
const distDir = path.join(__dirname, 'dist');
const distServerFile = path.join(distDir, 'index.js');
const distClientDir = path.join(distDir, 'public');

console.log('🔍 Checking build artifacts...');

// Check server build
if (!fs.existsSync(distServerFile)) {
  console.error('❌ Server build missing! Run "npm run build" first.');
  process.exit(1);
} else {
  console.log('✅ Server build exists');
}

// Check client build
if (!fs.existsSync(distClientDir)) {
  console.error('❌ Client build missing! Run "npm run build" first.');
  process.exit(1);
} else {
  console.log('✅ Client build exists');
}

// Create simple verification server
const app = express();
const port = process.env.PORT || 8080;

// Serve static assets from dist/public
app.use(express.static(path.join(__dirname, 'dist', 'public')));

// API endpoint
app.get('/api/health', (req, res) => {
  res.status(200).send({
    status: 'healthy',
    environment: process.env.NODE_ENV || 'development',
    port: port,
    message: 'Build verification server running successfully'
  });
});

// Serve SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`\n🚀 Build verification server running at http://0.0.0.0:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`PORT environment variable: ${process.env.PORT || 'not set, using default 8080'}`);
  console.log('\nThis server is serving your production build locally.');
  console.log('If you can access this server and see your app, deployment should work!');
});