// Restore original imports with better error handling
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Enhanced error tracking for mobile debugging
function logToScreen(message: string, type: 'info' | 'error' | 'warn' = 'info') {
  const logDiv = document.getElementById('debug-log') || (() => {
    const div = document.createElement('div');
    div.id = 'debug-log';
    div.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; 
      background: rgba(0,0,0,0.9); color: white; 
      font-size: 12px; padding: 10px; z-index: 9999;
      max-height: 30vh; overflow-y: auto;
      font-family: monospace;
    `;
    document.body.appendChild(div);
    return div;
  })();
  
  const timestamp = new Date().toTimeString().slice(0, 8);
  const color = type === 'error' ? '#ff6b6b' : type === 'warn' ? '#ffd93d' : '#51cf66';
  logDiv.innerHTML += `<div style="color: ${color}">[${timestamp}] ${message}</div>`;
  logDiv.scrollTop = logDiv.scrollHeight;
}

// Main application initialization with enhanced mobile debugging
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired, attempting to render React app');
  logToScreen('DOM loaded, starting React app');
  
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    const errorMsg = "Cannot find #root element to mount React application!";
    console.error(errorMsg);
    logToScreen(errorMsg, 'error');
    
    // Create a visible error message in the DOM if root element is missing
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      padding: 20px; margin: 20px; background: #ffeeee; 
      border: 2px solid red; border-radius: 4px;
    `;
    errorDiv.innerHTML = `
      <h2 style="color: red;">React Mounting Error</h2>
      <p>Could not find the #root element to mount the React application.</p>
      <p>This could be due to:</p>
      <ul>
        <li>HTML template missing the root element</li>
        <li>Script running before DOM is fully loaded</li>
        <li>A network or loading issue with the HTML</li>
      </ul>
    `;
    document.body.appendChild(errorDiv);
    return;
  }

  try {
    logToScreen('Creating React root...');
    const root = createRoot(rootElement);
    
    logToScreen('Rendering App component...');
    root.render(<App />);
    
    console.log('React app successfully rendered');
    logToScreen('React app successfully rendered', 'info');
    
    // Hide debug log after 5 seconds if successful
    setTimeout(() => {
      const debugLog = document.getElementById('debug-log');
      if (debugLog) {
        debugLog.style.display = 'none';
      }
    }, 5000);
    
  } catch (error) {
    const errorMsg = `Error rendering React application: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg, error);
    logToScreen(errorMsg, 'error');
    
    // Show error in UI
    const errorMessage = document.createElement('div');
    errorMessage.style.cssText = `
      color: red; padding: 20px; margin: 20px; 
      border: 2px solid red; background: #ffeeee;
    `;
    errorMessage.innerHTML = `
      <h2>React Rendering Error</h2>
      <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
      <pre style="overflow: auto; font-size: 11px;">${error instanceof Error ? error.stack : 'No stack trace available'}</pre>
    `;
    rootElement.appendChild(errorMessage);
  }
});
