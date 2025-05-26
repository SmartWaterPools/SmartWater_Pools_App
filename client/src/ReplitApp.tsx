import { useQuery } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import { Loader2 } from "lucide-react";

function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
        </>
      )}
      <Route>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
            <p className="text-muted-foreground">
              The page you're looking for doesn't exist.
            </p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

export default function ReplitApp() {
  return <Router />;
}