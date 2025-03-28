// This is a completely self-contained test React app to isolate rendering issues
// It has absolutely no dependencies on other project files

import React from 'react';
import { createRoot } from 'react-dom/client';

// Simple standalone component with no dependencies
function TestApp() {
  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      background: '#f5f5f5',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <h1 style={{ color: '#0066cc' }}>SmartWater Pools Test Page</h1>
      <p>This is a simple test page to verify React rendering is working correctly.</p>
      <button 
        style={{ 
          background: '#0066cc', 
          color: 'white', 
          padding: '10px 15px', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}
        onClick={() => alert('Button clicked!')}
      >
        Click Me
      </button>
      <div style={{ marginTop: '20px' }}>
        <h2 style={{ color: '#0066cc' }}>System Status</h2>
        <ul>
          <li>React Rendering: <span style={{ color: 'green', fontWeight: 'bold' }}>Working</span></li>
          <li>JavaScript: <span style={{ color: 'green', fontWeight: 'bold' }}>Working</span></li>
          <li>DOM Events: <span style={{ color: 'green', fontWeight: 'bold' }}>Working</span></li>
        </ul>
      </div>
    </div>
  );
}

// Directly render to DOM with no dependencies on project files
const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <TestApp />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found! DOM mounting failed.');
  // Add visible error element to body if container doesn't exist
  const errorElement = document.createElement('div');
  errorElement.style.color = 'red';
  errorElement.style.padding = '20px';
  errorElement.style.margin = '20px';
  errorElement.style.border = '2px solid red';
  errorElement.textContent = 'ERROR: Could not find #root element for mounting React app!';
  document.body.appendChild(errorElement);
}