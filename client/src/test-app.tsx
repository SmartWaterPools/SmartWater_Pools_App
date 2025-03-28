import { createRoot } from "react-dom/client";

function SimpleTestApp() {
  return (
    <div className="p-8" style={{ 
      backgroundColor: 'white', 
      color: 'black',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '16px',
        color: '#0047AB'
      }}>
        Simple Test Application
      </h1>
      <p style={{ marginBottom: '16px' }}>
        If you can see this, the React application is rendering correctly.
        The main app might have rendering issues with the authentication flow.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          style={{
            padding: '8px 16px',
            backgroundColor: '#0047AB',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => alert('Button clicked!')}
        >
          Test Button
        </button>
      </div>
    </div>
  );
}

// Create a new entry point for testing
createRoot(document.getElementById("root")!).render(<SimpleTestApp />);