import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, UserCheck, XCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Validation schema for the registration form
const inviteRegistrationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email').min(1, 'Email is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

type InviteRegistrationFormData = z.infer<typeof inviteRegistrationSchema>;

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

const InvitePage = () => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize form
  const form = useForm<InviteRegistrationFormData>({
    resolver: zodResolver(inviteRegistrationSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Extract token from URL on component mount
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const inviteToken = queryParams.get('token');
    
    if (!inviteToken) {
      setError('No invitation token provided');
      setVerifying(false);
      setLoading(false);
      return;
    }
    
    setToken(inviteToken);
    verifyInvitation(inviteToken);
  }, []);

  // Verify the invitation token
  const verifyInvitation = async (inviteToken: string) => {
    try {
      setVerifying(true);
      const response = await apiRequest('GET', `/api/invitations/verify?token=${inviteToken}`);
      
      if (response.success && response.invitation) {
        setInvitation(response.invitation);
        
        // Pre-fill form with invitation data
        form.setValue('name', response.invitation.name);
        form.setValue('email', response.invitation.email);
      } else {
        setError(response.message || 'Invalid or expired invitation');
      }
    } catch (error: any) {
      setError(error.message || 'Error verifying invitation');
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  // Handle form submission
  const onSubmit = async (data: InviteRegistrationFormData) => {
    if (!token || !invitation) {
      setError('Invalid invitation state');
      return;
    }
    
    try {
      setRegistering(true);
      
      const response = await apiRequest('POST', '/api/auth/register-invitation', {
        name: data.name,
        email: data.email,
        password: data.password,
        token: token,
        organizationId: invitation.organization.id,
        role: invitation.role,
      });
      
      if (response.success) {
        setSuccess(true);
        toast({
          title: 'Registration successful!',
          description: 'Your account has been created. You can now log in.',
        });
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(response.message || 'Failed to register');
        toast({
          title: 'Registration failed',
          description: response.message || 'An error occurred during registration',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
      toast({
        title: 'Error',
        description: error.message || 'Failed to register',
        variant: 'destructive',
      });
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Verifying Invitation</CardTitle>
            <CardDescription>Please wait while we verify your invitation...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive flex items-center justify-center">
              <XCircle className="mr-2 h-6 w-6" />
              Invitation Error
            </CardTitle>
            <CardDescription>We couldn't verify your invitation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-destructive font-semibold">{error}</p>
              <p className="mt-4">If you believe this is an error, please contact your organization administrator.</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-primary flex items-center justify-center">
              <CheckCircle className="mr-2 h-6 w-6" />
              Registration Complete!
            </CardTitle>
            <CardDescription>Your account has been created successfully</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p>You have successfully joined {invitation?.organization.name}.</p>
              <p className="mt-2">You will be redirected to the login page in a moment...</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Complete Your Registration</CardTitle>
          <CardDescription>
            You've been invited to join {invitation?.organization.name} as a {invitation?.role}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled placeholder="Your name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" disabled placeholder="Your email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Create a password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Confirm your password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={registering}
              >
                {registering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating your account...
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Complete Registration
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center text-sm text-muted-foreground">
          <p>This invitation expires on {new Date(invitation?.expiresAt || '').toLocaleDateString()}</p>
          <p className="mt-2">
            Already have an account?{' '}
            <a
              href="/login"
              className="text-primary hover:underline"
            >
              Log in
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default InvitePage;