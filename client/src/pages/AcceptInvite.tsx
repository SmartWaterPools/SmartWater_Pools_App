import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Mail, Shield, Building2, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface InvitationDetails {
  name: string;
  email: string;
  role: string;
  organization: {
    id: number;
    name: string;
  };
  expiresAt: string;
}

export default function AcceptInvite() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    setToken(tokenParam);

    if (!tokenParam) {
      setVerifyError("No invitation token provided.");
      setIsVerifying(false);
      return;
    }

    async function verifyToken() {
      try {
        const response = await fetch(`/api/invitations/verify?token=${tokenParam}`);
        const data = await response.json();

        if (data.success) {
          setInvitation(data.invitation);
        } else {
          setVerifyError(data.message || "Invalid or expired invitation.");
        }
      } catch (err) {
        setVerifyError("Failed to verify invitation. Please try again.");
      } finally {
        setIsVerifying(false);
      }
    }

    verifyToken();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 6) {
      setSubmitError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/invitations/accept", {
        token,
        password,
      });
      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setSubmitError(data.message || "Failed to create account.");
      }
    } catch (err) {
      setSubmitError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrator",
      manager: "Manager",
      technician: "Technician",
      client: "Client",
    };
    return labels[role] || role;
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying your invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verifyError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-xl">Invalid Invitation</CardTitle>
            <CardDescription>{verifyError}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => setLocation("/login")}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-xl">Account Created!</CardTitle>
            <CardDescription>
              Your account has been created successfully. You can now log in with your email and password.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => setLocation("/login")}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Accept Invitation
          </CardTitle>
          <CardDescription className="text-center">
            You've been invited to join SmartWater Pool Systems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {invitation && (
            <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{invitation.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{invitation.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium">{roleLabel(invitation.role)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Organization</p>
                  <p className="font-medium">{invitation.organization.name}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            {submitError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="link" className="px-0" onClick={() => setLocation("/login")}>
            Already have an account? Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
