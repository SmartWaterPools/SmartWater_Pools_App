import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">SmartWater Pools</CardTitle>
          <CardDescription>
            Professional pool service management platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Sign in with your Replit account to access the dashboard
            </p>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="w-full"
              size="lg"
            >
              Sign in with Replit
            </Button>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Secure authentication powered by Replit Auth
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}