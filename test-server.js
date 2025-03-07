
// Simple script to test server connectivity
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/dashboard/summary',
  method: 'GET'
};

console.log('Testing connection to server...');
const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response received successfully');
    console.log(`Data length: ${data.length} bytes`);
    console.log('Server is responding correctly!');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
