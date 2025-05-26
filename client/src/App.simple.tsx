import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { GoogleMapsProvider } from "./contexts/GoogleMapsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";
import { Loader2 } from "lucide-react";

// Simple Dashboard component to test
function SimpleDashboard() {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Please Log In</h2>
          <p className="text-gray-600 mb-4">You need to log in to access the dashboard.</p>
          <a 
            href="/api/auth/google" 
            className="inline-block bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Login with Google
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">SmartWater Pools Dashboard</h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Welcome, {user?.name || 'User'}!</h2>
          <p className="text-gray-600 mb-4">You are successfully logged in.</p>
          <div className="space-y-2">
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> {user?.role}</p>
            <p><strong>Organization:</strong> {user?.organizationName}</p>
          </div>
          <div className="mt-6">
            <a 
              href="/api/auth/logout" 
              className="inline-block bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// App Content component
function AppContent() {
  return (
    <Switch>
      <Route path="/" component={SimpleDashboard} />
      <Route path="/dashboard" component={SimpleDashboard} />
      <Route>
        <SimpleDashboard />
      </Route>
    </Switch>
  );
}

// Main App component
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleMapsProvider>
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </GoogleMapsProvider>
    </QueryClientProvider>
  );
}

export default App;