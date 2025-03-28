// A minimal Express server to test Replit web accessibility
import express from 'express';
const app = express();
const port = process.env.PORT || 5000;

// Enable basic request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Simple HTML response for root path
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Server</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #0066cc; }
          .success { color: green; font-weight: bold; }
          .warning { color: orange; font-weight: bold; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Replit Test Server</h1>
          <p class="success">If you can see this page, the Express server is working correctly!</p>
          <p>Server details:</p>
          <ul>
            <li>Port: <span class="success">${port}</span></li>
            <li>Time: <span class="success">${new Date().toLocaleString()}</span></li>
            <li>Hostname: <span class="success">${req.hostname}</span></li>
            <li>Protocol: <span class="success">${req.protocol}</span></li>
            <li>Original URL: <span class="success">${req.originalUrl}</span></li>
            <li>IP: <span class="success">${req.ip}</span></li>
            <li>Headers: <pre>${JSON.stringify(req.headers, null, 2)}</pre></li>
          </ul>
          <p>Environment Variables:</p>
          <ul>
            <li>NODE_ENV: <span class="success">${process.env.NODE_ENV || 'not set'}</span></li>
            <li>REPL_ID: <span class="success">${process.env.REPL_ID || 'not set'}</span></li>
            <li>REPL_SLUG: <span class="success">${process.env.REPL_SLUG || 'not set'}</span></li>
            <li>REPL_OWNER: <span class="success">${process.env.REPL_OWNER || 'not set'}</span></li>
            <li>REPLIT_CLUSTER: <span class="success">${process.env.REPLIT_CLUSTER || 'not set'}</span></li>
            <li>PORT: <span class="success">${process.env.PORT || 'not set (using default ' + port + ')'}</span></li>
          </ul>
          <p>Replit Deployment URLs:</p>
          <ul>
            <li>Standard: <span class="success">https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co</span></li>
            <li>New format: <span class="warning">https://${process.env.REPL_SLUG}.replit.app</span></li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// Handle any other routes
app.get('*', (req, res) => {
  res.send(`
    <h1>Route: ${req.url}</h1>
    <p>This route is being handled by the test server.</p>
    <p><a href="/">Back to home</a></p>
  `);
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log('----------------------------------------');
  console.log(`Test server running on port ${port}`);
  console.log(`Local URL: http://localhost:${port}`);
  console.log(`Network URL: http://0.0.0.0:${port}`);
  
  // Log Replit-specific URLs
  if (process.env.REPL_ID) {
    console.log(`Replit Classic URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
    console.log(`Replit App URL: https://${process.env.REPL_SLUG}.replit.app`);
  }
  console.log('----------------------------------------');
});