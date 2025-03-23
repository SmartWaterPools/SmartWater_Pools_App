import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface SessionData {
  isAuthenticated: boolean;
  user: any | null;
  sessionID?: string;
  sessionExpires?: Date | null;
}

export const useSession = () => {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  const session: SessionData = {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
  };
  
  // Function to refresh the session data
  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    await auth.checkSession();
    setIsLoading(false);
  }, [auth]);
  
  // Check the session on component mount
  useEffect(() => {
    if (!auth.isLoading) {
      setIsLoading(false);
    }
  }, [auth.isLoading]);
  
  return {
    session,
    isLoading: isLoading || auth.isLoading,
    refreshSession,
  };
};