import { createRoot } from "react-dom/client";

function SimpleTestApp() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Application Test Page</h1>
      <p className="mb-4">If you can see this, the React application is rendering correctly.</p>
      <div className="flex space-x-4">
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => alert('Button clicked!')}
        >
          Test Button
        </button>
      </div>
    </div>
  );
}

// Create a new entry point
createRoot(document.getElementById("root")!).render(<SimpleTestApp />);