
// API utilities for making requests to the server with enhanced resilience
// Use the configured port for the Replit environment
const API_BASE_URL = '';  // Empty string for same-origin requests

// Configuration for fetch retries
const RETRY_COUNT = 3;        // Maximum number of retry attempts
const RETRY_DELAY = 1000;     // Base delay between retries in ms (will be increased exponentially)
const TIMEOUT = 10000;        // Request timeout in ms (10 seconds)

/**
 * Sleep for a specified duration
 * @param ms Milliseconds to sleep
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enhanced fetch API with automatic retries, timeouts, and cache prevention
 * @param endpoint API endpoint to fetch
 * @param options Fetch request options
 * @param retries Number of retries remaining (internal use)
 * @returns Promise with the parsed response data
 */
export async function fetchApi<T>(
  endpoint: string, 
  options?: RequestInit, 
  retries = RETRY_COUNT
): Promise<T> {
  // Add cache-busting timestamp to GET requests
  const url = `${API_BASE_URL}${endpoint}${
    !options || options.method === 'GET' || !options.method 
      ? (endpoint.includes('?') ? '&' : '?') + '_t=' + Date.now() 
      : ''
  }`;
  
  console.log(`Fetching data from:`, url);
  
  // Set up fetch with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    // Enhanced headers for all requests
    const enhancedOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        // Prevent caching
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...(options?.headers || {})
      }
    };
    
    // Attempt the fetch with the configured timeout
    const response = await fetch(url, enhancedOptions);
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      
      // Handle specific HTTP status codes
      if (response.status === 503 || response.status === 504 || response.status === 429) {
        // Server overloaded or gateway timeout - good candidates for retry
        if (retries > 0) {
          const delay = RETRY_DELAY * (RETRY_COUNT - retries + 1); // Exponential backoff
          console.log(`Retrying in ${delay}ms... (${retries} retries left)`);
          await sleep(delay);
          return fetchApi(endpoint, options, retries - 1);
        }
      }
      
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response as JSON
    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle fetch abort/timeout and network errors with retry logic
    if (
      (error instanceof DOMException && error.name === 'AbortError') || 
      (error instanceof TypeError && error.message.includes('network')) ||
      (error instanceof Error && error.message.includes('Failed to fetch'))
    ) {
      if (retries > 0) {
        const delay = RETRY_DELAY * (RETRY_COUNT - retries + 1); // Exponential backoff
        console.log(`Connection issue, retrying in ${delay}ms... (${retries} retries left)`);
        await sleep(delay);
        return fetchApi(endpoint, options, retries - 1);
      } else {
        console.error('API connection test failed:', {});
      }
    }
    
    console.error(`API request failed after ${RETRY_COUNT} retries:`, error);
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
