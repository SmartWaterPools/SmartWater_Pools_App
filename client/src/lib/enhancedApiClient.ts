import { QueryClient } from "@tanstack/react-query";

// Enhanced error class with status code
export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Enhanced API request function that handles common errors
 * and provides better error information
 */
export async function enhancedApiRequest<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  try {
    // Start request timer for logging
    const startTime = performance.now();
    
    // Add default headers and credentials
    const res = await fetch(url, {
      method: options?.method || 'GET',
      headers: options?.body ? { "Content-Type": "application/json", ...options?.headers } : options?.headers || {},
      body: options?.body,
      credentials: "include",
    });
    
    // Calculate request time for logging
    const requestTime = performance.now() - startTime;
    console.log(`API Request to ${url} completed in ${requestTime.toFixed(2)}ms with status ${res.status}`);
    
    // Handle common HTTP error statuses
    if (!res.ok) {
      let errorMessage = '';
      try {
        // Try to parse error response as JSON
        const errorData = await res.json();
        errorMessage = errorData.error || errorData.message || res.statusText || 'Unknown error';
      } catch (e) {
        // If not JSON, get text or use status text
        errorMessage = await res.text() || res.statusText || 'Unknown error';
      }
      
      // Create ApiError with status code and message
      throw new ApiError(`${res.status}: ${errorMessage}`, res.status);
    }
    
    // For empty responses (like 204 No Content)
    if (res.status === 204) {
      return {} as T;
    }
    
    // Parse JSON response
    return await res.json() as T;
  } catch (error) {
    // If it's already an ApiError, rethrow it
    if (error instanceof ApiError) {
      throw error;
    }
    
    // If it's a fetch error (network error), create custom error
    console.error(`API Request to ${url} failed:`, error);
    throw new ApiError(
      `Network error when accessing ${url}: ${(error as Error).message || 'Unknown error'}`,
      0 // 0 status code indicates network/client error
    );
  }
}

/**
 * Create a query client with enhanced error handling
 */
export function createEnhancedQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Don't retry on 401 Unauthorized or 403 Forbidden
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            return false;
          }
          
          // Only retry other errors up to 3 times
          return failureCount < 3;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Create enhanced query client instance
export const enhancedQueryClient = createEnhancedQueryClient();