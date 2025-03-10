
// API utilities for making requests to the server
// Use the configured port for the Replit environment
const API_BASE_URL = '';  // Empty string for same-origin requests

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`Fetching data from: ${url}`);
  
  try {
    // Log more detailed information about the request for debugging
    console.log(`Making API request to: ${url}`);
    console.log(`Request options:`, options);
    
    const response = await fetch(url, options);
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Response data received`, data);
    return data;
  } catch (error) {
    console.error(`API request failed:`, error);
    throw error;
  }
}

export default {
  get: <T>(endpoint: string) => fetchApi<T>(endpoint),
  
  post: <T>(endpoint: string, data: any) => 
    fetchApi<T>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  
  patch: <T>(endpoint: string, data: any) => 
    fetchApi<T>(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  
  delete: <T>(endpoint: string) => 
    fetchApi<T>(endpoint, {
      method: 'DELETE'
    })
};
