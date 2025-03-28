/**
 * This is a simple script to test OAuth connectivity
 */
import https from 'https';
import http from 'http';
import { URL } from 'url';

async function testOAuthConnection() {
  // Configuration
  const BASE_URL = process.env.APP_URL || 'http://localhost:5000';
  const OAUTH_PATHS = [
    '/api/auth/google',
    '/api/auth/google/callback',
    '/api/auth/google/signup'
  ];

  console.log(`Testing OAuth endpoints on ${BASE_URL}...`);
  
  // Helper to make a GET request and follow redirects up to a limit
  const makeRequest = (url, maxRedirects = 3) => {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      console.log(`Testing endpoint: ${url}`);
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'OAuth Test Script'
        }
      };
      
      const req = client.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          const redirectUrl = res.headers.location;
          
          if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) && redirectUrl && maxRedirects > 0) {
            console.log(`Redirect to: ${redirectUrl}`);
            
            // Handle relative redirects
            const nextUrl = redirectUrl.startsWith('http') 
              ? redirectUrl 
              : `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
            
            // Follow the redirect
            makeRequest(nextUrl, maxRedirects - 1)
              .then(resolve)
              .catch(reject);
            return;
          }
          
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseData,
            redirectUrl
          });
        });
      });
      
      req.on('error', (error) => {
        console.error(`Request error: ${error.message}`);
        reject(error);
      });
      
      req.end();
    });
  };

  // Test each OAuth endpoint
  for (const path of OAUTH_PATHS) {
    try {
      const url = `${BASE_URL}${path}`;
      const response = await makeRequest(url);
      
      console.log(`\nEndpoint: ${path}`);
      console.log(`Status: ${response.statusCode}`);
      
      if (response.redirectUrl) {
        console.log(`Redirects to: ${response.redirectUrl}`);
        
        // Check for Google OAuth in redirect URL
        if (response.redirectUrl.includes('accounts.google.com')) {
          console.log('✅ Success: Properly redirects to Google OAuth');
        } else {
          console.log('❌ Error: Redirect doesn\'t go to Google OAuth');
        }
      } else if (path.includes('callback')) {
        // For callback endpoint, we expect an error without proper OAuth params
        if (response.statusCode >= 400) {
          console.log('✅ Expected error on callback without proper OAuth parameters');
        } else {
          console.log('❓ Unexpected success on callback without OAuth parameters');
        }
      } else {
        console.log('❌ Error: No redirect found for OAuth endpoint');
      }
      
      console.log('-------------------------------------');
    } catch (error) {
      console.error(`Failed to test ${path}: ${error.message}`);
    }
  }
  
  console.log('\nOAuth connection test completed.');
}

// Run the test
testOAuthConnection()
  .then(() => {
    console.log('Test completed successfully.');
  })
  .catch(err => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });

export { testOAuthConnection };