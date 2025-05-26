import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, LayoutDashboard, UserCircle, LogIn, LogOut, Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FcGoogle } from 'react-icons/fc';
import { useToast } from '@/hooks/use-toast';

// Define login form schema
const loginFormSchema = z.object({
  username: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

// OAuth completion form schema
const oauthCompletionSchema = z.object({
  organizationName: z.string().min(2, "Organization name is required"),
  role: z.enum(["client", "technician", "manager", "admin"]),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type OAuthCompletionValues = z.infer<typeof oauthCompletionSchema>;

export const UserManagementCard = () => {
  const { user, isAuthenticated, isLoading, login, logout, googleLogin, register } = useAuth();
  const [location, setLocation] = useLocation();
  const [loginLoading, setLoginLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showOAuthCompletion, setShowOAuthCompletion] = React.useState(false);
  const { toast } = useToast();

  // Check for OAuth completion needed
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1] || '');
    const isOAuth = searchParams.get('oauth') === 'true';
    const isNewUser = searchParams.get('new') === 'true';
    
    if (isOAuth && isNewUser && user && (user as any).isNewOAuthUser) {
      setShowOAuthCompletion(true);
    }
  }, [location, user]);

  // Define login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Define OAuth completion form
  const oauthForm = useForm<OAuthCompletionValues>({
    resolver: zodResolver(oauthCompletionSchema),
    defaultValues: {
      organizationName: "",
      role: "client",
      phone: "",
      address: "",
    },
  });

  async function onLoginSubmit(data: LoginFormValues) {
    try {
      setLoginLoading(true);
      setError(null);
      
      console.log("Login form submitted from dashboard");
      
      const success = await login(data.username, data.password);
      
      if (!success) {
        setError("Invalid username or password");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred during login. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      console.log("Initiating Google OAuth login flow from dashboard");
      setLoginLoading(true);
      
      // Clear any previous error state
      setError(null);
      
      // Clear any stored state from localStorage (previous failed attempts)
      if (localStorage.getItem('oauth_client_state')) {
        console.log("Clearing previous oauth state from localStorage");
        localStorage.removeItem('oauth_client_state');
        localStorage.removeItem('oauth_server_state');
        localStorage.removeItem('oauth_timestamp');
      }
      
      // Call the enhanced googleLogin function
      await googleLogin();
    } catch (error) {
      console.error("Google login error:", error);
      setError("An error occurred preparing for Google login. Please try again.");
      setLoginLoading(false);
    }
  }

  const handleLogout = async () => {
    await logout();
  };

  async function onOAuthCompletionSubmit(data: OAuthCompletionValues) {
    try {
      setLoginLoading(true);
      setError(null);
      
      console.log("Completing OAuth registration with organization details");
      
      const success = await register({
        email: user?.email,
        name: user?.name,
        organizationName: data.organizationName,
        role: data.role,
        phone: data.phone,
        address: data.address,
      });
      
      if (success) {
        setShowOAuthCompletion(false);
        // Clear URL parameters
        setLocation('/dashboard');
        toast({
          title: "Registration completed",
          description: "Your account has been set up successfully!",
        });
      }
    } catch (error) {
      console.error("OAuth completion error:", error);
      setError("An error occurred completing your registration. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg">
          <UserCircle className="mr-2 h-5 w-5 text-primary" />
          User Management
        </CardTitle>
        <CardDescription>
          {isAuthenticated 
            ? "Manage your account and system access" 
            : "Login to access the pool management system"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Checking authentication...</span>
          </div>
        ) : isAuthenticated && user ? (
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="font-medium">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground capitalize">Role: {user.role}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="flex items-center">
                <LayoutDashboard className="mr-1 h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="outline" size="sm" className="flex items-center">
                <UserCircle className="mr-1 h-4 w-4" />
                Profile
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-1 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        ) : showOAuthCompletion ? (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="font-medium text-green-600">Welcome to SmartWater Pools!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Please provide your organization details to complete your account setup
              </p>
            </div>
            
            {error && (
              <div className="p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded">
                {error}
              </div>
            )}
            
            <Form {...oauthForm}>
              <form onSubmit={oauthForm.handleSubmit(onOAuthCompletionSubmit)} className="space-y-3">
                <FormField
                  control={oauthForm.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your organization name" {...field} disabled={loginLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={oauthForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select disabled={loginLoading} onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="technician">Technician</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={oauthForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your phone number" {...field} disabled={loginLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing Setup...
                    </>
                  ) : (
                    "Complete Registration"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded">
                {error}
              </div>
            )}
            
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center" 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loginLoading}
            >
              <FcGoogle className="mr-2 h-5 w-5" />
              Sign in with Google
            </Button>
            
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-3">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username or Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </CardContent>
      {isAuthenticated && (
        <CardFooter className="bg-muted/20 py-2 px-6 border-t text-xs text-muted-foreground">
          Last login: {new Date().toLocaleString()}
        </CardFooter>
      )}
    </Card>
  );
};