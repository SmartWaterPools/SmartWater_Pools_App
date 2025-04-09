/**
 * This script periodically sends requests to your deployed application
 * to prevent it from going to sleep. You can run this on a separate machine
 * or use a service like Uptime Robot for the same purpose.
 */

import fetch from 'node-fetch';

// Update this with your deployed URL
const DEPLOYED_URL = 'https://smartwaterpools.replit.app';

// Ping interval in milliseconds (5 minutes = 300000 ms)
const PING_INTERVAL = 300000;

/**
 * Sends a simple GET request to the deployed URL
 */
async function pingServer() {
  try {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Pinging ${DEPLOYED_URL}...`);
    
    const response = await fetch(DEPLOYED_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'KeepAliveService/1.0'
      },
      timeout: 10000 // 10 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      console.log(`[${new Date().toISOString()}] Server responded with ${response.status} in ${responseTime}ms`);
    } else {
      console.warn(`[${new Date().toISOString()}] Server returned status ${response.status} in ${responseTime}ms`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error pinging server:`, error.message);
  }
}

// Initial ping
pingServer();

// Set up recurring ping
setInterval(pingServer, PING_INTERVAL);

console.log(`Keep-alive service started. Pinging ${DEPLOYED_URL} every ${PING_INTERVAL/1000} seconds.`);