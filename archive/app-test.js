// Standalone test server for Cloud Run deployment verification
// This script runs a minimal server that follows Cloud Run requirements
// Execute with: PORT=8080 node app-test.js

import express from 'express';
import http from 'http';

// Create Express app
const app = express();
const port = process.env.PORT || 8080;

// Basic health check endpoint
app.get('/', (req, res) => {
  res.status(200).send({
    status: 'healthy',
    environment: process.env.NODE_ENV || 'development',
    port: port,
    message: 'Cloud Run test server running successfully'
  });
});

// Create HTTP server
const server = http.createServer(app);

// Handle graceful shutdown (required for Cloud Run)
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after 10s if still not closed
  setTimeout(() => {
    console.log('Forcing server shutdown after timeout');
    process.exit(1);
  }, 10000);
});

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Test server running at http://0.0.0.0:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`PORT environment variable: ${process.env.PORT || 'not set, using default 8080'}`);
});