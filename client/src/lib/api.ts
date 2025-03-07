
// API utilities for making requests to the server
const API_BASE_URL = '';  // Empty string for same-origin requests

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`Fetching data from: ${url}`);
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${error}`);
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
