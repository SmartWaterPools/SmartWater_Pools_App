// A simple test server using ES modules
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create express app and HTTP server
const app = express();
const server = createServer(app);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple API endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || '8080'
  });
});

// Serve static files from the current directory
app.use(express.static(__dirname));

// Catch-all route to serve the test HTML
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'test.html'));
});

// Determine port based on environment
const PORT = process.env.PORT || 8080; // Default to 8080 for Cloud Run compatibility

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://0.0.0.0:${PORT}`);
});