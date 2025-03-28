import { createRoot } from "react-dom/client";

// A completely standalone React component that doesn't use any project styles
function StandaloneTestApp() {
  return (
    <div style={{ 
      padding: '20px',
      backgroundColor: 'white', 
      color: 'black',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '20px auto',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    }}>
      <h1 style={{ 
        fontSize: '28px',
        fontWeight: 'bold',
        marginBottom: '16px',
        color: '#0047AB',
        borderBottom: '2px solid #0047AB',
        paddingBottom: '8px'
      }}>
        Standalone Test Application
      </h1>
      <p style={{ marginBottom: '16px', lineHeight: '1.5' }}>
        If you can see this, the React application is rendering correctly.
        The main app might have rendering issues with the authentication flow or component dependencies.
      </p>
      <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
        <button 
          style={{
            padding: '12px 24px',
            backgroundColor: '#0047AB',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
          onClick={() => alert('Test button clicked!')}
        >
          Test Button
        </button>
        <button 
          style={{
            padding: '12px 24px',
            backgroundColor: '#FFFFFF',
            color: '#0047AB',
            border: '1px solid #0047AB',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
          onClick={() => {
            document.body.style.backgroundColor = 
              document.body.style.backgroundColor === 'black' ? 'white' : 'black';
          }}
        >
          Toggle Background
        </button>
      </div>
    </div>
  );
}

// Direct render without any context providers or other dependencies
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<StandaloneTestApp />);
} else {
  console.error("Root element not found!");
}