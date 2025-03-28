console.log('Environment variables:');
console.log('GOOGLE_MAPS_API_KEY:', process.env.GOOGLE_MAPS_API_KEY ? 'Present (length: ' + process.env.GOOGLE_MAPS_API_KEY.length + ')' : 'Not present');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REPL_ID:', process.env.REPL_ID);
console.log('REPL_SLUG:', process.env.REPL_SLUG);
console.log('REPL_OWNER:', process.env.REPL_OWNER);