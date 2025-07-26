import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Store CSRF token in memory
let csrfToken: string | null = null;

// Fetch CSRF token if not available
async function ensureCsrfToken() {
  if (!csrfToken) {
    try {
      const response = await fetch('/api/csrf-token', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        csrfToken = data.csrfToken;
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  }
  return csrfToken;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  // Get CSRF token for state-changing requests
  const method = options?.method || 'GET';
  const headers: HeadersInit = options?.body 
    ? { "Content-Type": "application/json", ...options?.headers } 
    : options?.headers || {};
  
  // Add CSRF token for non-safe methods
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = await ensureCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: options?.body,
    credentials: "include",
  });

  // If we get a 403 with CSRF error, try to refresh token and retry once
  if (res.status === 403) {
    const text = await res.text();
    if (text.includes('CSRF')) {
      csrfToken = null; // Clear cached token
      const newToken = await ensureCsrfToken();
      if (newToken) {
        headers['X-CSRF-Token'] = newToken;
        const retryRes = await fetch(url, {
          method,
          headers,
          body: options?.body,
          credentials: "include",
        });
        await throwIfResNotOk(retryRes);
        return await retryRes.json() as T;
      }
    }
  }

  await throwIfResNotOk(res);
  return await res.json() as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Construct proper URL from queryKey
    let url = queryKey[0] as string;
    
    // If we have a numeric ID as the second parameter, append it to the URL
    if (queryKey.length > 1 && queryKey[1] !== null && queryKey[1] !== undefined) {
      url = `${url}/${queryKey[1]}`;
    }
    
    console.log(`Fetching data from: ${url}`);
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
