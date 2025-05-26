// Restore original imports with better error handling
import { createRoot } from "react-dom/client";
import ReplitApp from "./ReplitApp";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Main application initialization with error handling
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired, attempting to render React app');
  
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error("Cannot find #root element to mount React application!");
    
    // Create a visible error message in the DOM if root element is missing
    const errorDiv = document.createElement('div');
    errorDiv.style.padding = '20px';
    errorDiv.style.margin = '20px';
    errorDiv.style.backgroundColor = '#ffeeee';
    errorDiv.style.border = '2px solid red';
    errorDiv.style.borderRadius = '4px';
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
    const queryClient = new QueryClient();
    const root = createRoot(rootElement);
    root.render(
      <QueryClientProvider client={queryClient}>
        <ReplitApp />
      </QueryClientProvider>
    );
    console.log('React app successfully rendered');
  } catch (error) {
    console.error('Error rendering React application:', error);
    
    // Show error in UI
    const errorMessage = document.createElement('div');
    errorMessage.style.color = 'red';
    errorMessage.style.padding = '20px';
    errorMessage.style.margin = '20px';
    errorMessage.style.border = '2px solid red';
    errorMessage.innerHTML = `
      <h2>React Rendering Error</h2>
      <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
      <pre>${error instanceof Error ? error.stack : 'No stack trace available'}</pre>
    `;
    rootElement.appendChild(errorMessage);
  }
});
