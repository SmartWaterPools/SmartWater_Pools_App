import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, XCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const errorTestCases = [
  { 
    param: "google-auth-failed",
    title: "Google Authentication Failed",
    type: "error" as const,
    icon: XCircle
  },
  {
    param: "no-organization",
    title: "Organization Setup Required",
    type: "warning" as const,
    icon: AlertCircle
  },
  {
    param: "no-subscription",
    title: "Subscription Required",
    type: "warning" as const,
    icon: AlertCircle
  },
  {
    param: "invalid-subscription",
    title: "Subscription Issue",
    type: "error" as const,
    icon: XCircle
  },
  {
    param: "inactive-subscription",
    title: "Subscription Expired",
    type: "warning" as const,
    icon: AlertCircle
  },
  {
    param: "authentication-timeout",
    title: "Authentication Timeout",
    type: "error" as const,
    icon: XCircle
  },
  {
    param: "state-mismatch",
    title: "Security Check Failed",
    type: "error" as const,
    icon: XCircle
  },
  {
    param: "network-error",
    title: "Connection Problem",
    type: "error" as const,
    icon: XCircle
  },
  {
    param: "access-denied",
    title: "Access Denied",
    type: "warning" as const,
    icon: AlertCircle
  },
  {
    param: "server-error",
    title: "Server Error",
    type: "error" as const,
    icon: XCircle
  }
];

export default function LoginErrorTest() {
  const handleDirectNavigation = (errorParam: string) => {
    // Navigate directly using window.location to ensure query parameters are included
    window.location.href = `/login?error=${errorParam}`;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Login Error Testing Page</CardTitle>
          <CardDescription>
            Click any button below to test different error messages on the login page.
            Each button will navigate to /login with a specific error parameter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {errorTestCases.map((testCase) => {
              const Icon = testCase.icon;
              return (
                <div key={testCase.param} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${
                      testCase.type === 'error' ? 'text-red-500' :
                      testCase.type === 'warning' ? 'text-yellow-500' :
                      'text-blue-500'
                    }`} />
                    <span className="font-semibold">{testCase.title}</span>
                    <Badge 
                      variant={testCase.type === 'error' ? 'destructive' : 'secondary'}
                      className="ml-auto"
                    >
                      {testCase.type}
                    </Badge>
                  </div>
                  <code className="text-xs text-muted-foreground block bg-muted px-2 py-1 rounded">
                    ?error={testCase.param}
                  </code>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDirectNavigation(testCase.param)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      data-testid={`test-error-${testCase.param}`}
                    >
                      Test with window.location
                    </Button>
                    <Link href={`/login?error=${testCase.param}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        data-testid={`test-error-link-${testCase.param}`}
                      >
                        Test with Link
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Testing Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Click any test button above to navigate to the login page with that error</li>
              <li>Verify that the error message appears prominently at the top of the login form</li>
              <li>Check that the error styling matches the type (error=red, warning=yellow)</li>
              <li>Confirm that the error message is clear and informative</li>
              <li>Notice that the URL parameters are cleared after a few seconds</li>
              <li>Some subscription errors will auto-redirect to the pricing page after 4 seconds</li>
            </ol>
          </div>

          <div className="flex justify-center gap-4 mt-6">
            <Link href="/login">
              <Button variant="secondary" data-testid="go-to-login">
                Go to Login (No Error)
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary" data-testid="go-to-dashboard">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}