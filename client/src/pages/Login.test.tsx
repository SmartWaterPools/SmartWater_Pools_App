import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';

// Mock the dependencies
vi.mock('wouter', () => ({
  useLocation: () => ['/login', vi.fn()],
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    login: vi.fn(),
    register: vi.fn(),
    googleLogin: vi.fn(),
    isAuthenticated: false,
  })),
}));

describe('Login Component - OAuth Error Handling', () => {
  beforeEach(() => {
    // Clear any existing error parameters from window location
    delete (window as any).location;
    (window as any).location = {
      pathname: '/login',
      search: '',
      href: 'http://localhost:3000/login',
      replace: vi.fn(),
    };
    
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('URL Parameter Error Handling', () => {
    it('should display error message for no-organization error', () => {
      window.location.search = '?error=no-organization';
      
      render(<Login />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toContain('Organization Setup Required');
      expect(alert.textContent).toContain('complete the subscription process');
    });

    it('should display error message for no-subscription error', () => {
      window.location.search = '?error=no-subscription';
      
      render(<Login />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toContain('Subscription Required');
      expect(alert.textContent).toContain('active subscription');
    });

    it('should display error message for google-auth-failed error', () => {
      window.location.search = '?error=google-auth-failed';
      
      render(<Login />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toContain('Google Authentication Failed');
      expect(alert.textContent).toContain('try again');
    });

    it('should display error message for authentication-timeout error', () => {
      window.location.search = '?error=authentication-timeout';
      
      render(<Login />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toContain('Authentication Timeout');
      expect(alert.textContent).toContain('took too long');
    });

    it('should display error message for state-mismatch error', () => {
      window.location.search = '?error=state-mismatch';
      
      render(<Login />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toContain('Security Check Failed');
      expect(alert.textContent).toContain('Please try again');
    });

    it('should display error message for network-error', () => {
      window.location.search = '?error=network-error';
      
      render(<Login />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toContain('Connection Problem');
      expect(alert.textContent).toContain('internet connection');
    });

    it('should display error message for access-denied error', () => {
      window.location.search = '?error=access-denied';
      
      render(<Login />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toContain('Access Denied');
      expect(alert.textContent).toContain('cancelled the authentication');
    });

    it('should display error message for server-error', () => {
      window.location.search = '?error=server-error';
      
      render(<Login />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toContain('Server Error');
      expect(alert.textContent).toContain('try again in a few moments');
    });

    it('should display generic error for unknown error codes', () => {
      window.location.search = '?error=unknown-error-code';
      
      render(<Login />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toContain('Authentication Error');
      expect(alert.textContent).toContain('unknown error code');
    });
  });

  describe('Google OAuth Button Behavior', () => {
    it('should show loading state when Google login is clicked', async () => {
      render(<Login />);
      
      const googleButton = screen.getByTestId('button-google-signin');
      expect(googleButton).toBeInTheDocument();
      expect(googleButton.textContent).toContain('Sign in with Google');
      
      fireEvent.click(googleButton);
      
      await waitFor(() => {
        expect(googleButton.textContent).toContain('Connecting to Google');
      });
    });

    it('should clear previous OAuth state from localStorage when initiating new login', async () => {
      localStorage.setItem('oauth_client_state', 'old-state');
      localStorage.setItem('oauth_server_state', 'old-server-state');
      localStorage.setItem('oauth_timestamp', '1234567890');
      
      render(<Login />);
      
      const googleButton = screen.getByTestId('button-google-signin');
      fireEvent.click(googleButton);
      
      await waitFor(() => {
        expect(localStorage.getItem('oauth_client_state')).toBeNull();
        expect(localStorage.getItem('oauth_server_state')).toBeNull();
        expect(localStorage.getItem('oauth_timestamp')).toBeNull();
      });
    });

    it('should disable Google button when other forms are loading', async () => {
      render(<Login />);
      
      const googleButton = screen.getByTestId('button-google-signin');
      const loginButton = screen.getByTestId('button-login');
      
      // Fill in login form
      const usernameInput = screen.getByTestId('input-username');
      const passwordInput = screen.getByTestId('input-password');
      
      await userEvent.type(usernameInput, 'testuser');
      await userEvent.type(passwordInput, 'password123');
      
      // Submit login form
      fireEvent.click(loginButton);
      
      // Google button should be disabled while login is in progress
      expect(googleButton).toBeDisabled();
    });
  });

  describe('Autocomplete Attributes', () => {
    it('should have proper autocomplete attributes on login form inputs', () => {
      render(<Login />);
      
      const usernameInput = screen.getByTestId('input-username');
      const passwordInput = screen.getByTestId('input-password');
      
      expect(usernameInput).toHaveAttribute('autocomplete', 'username');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('should have proper autocomplete attributes on signup form inputs', () => {
      render(<Login />);
      
      // Switch to signup tab
      const signupTab = screen.getByTestId('tab-signup');
      fireEvent.click(signupTab);
      
      const fullnameInput = screen.getByTestId('input-fullname');
      const emailInput = screen.getByTestId('input-email');
      const newUsernameInput = screen.getByTestId('input-new-username');
      const newPasswordInput = screen.getByTestId('input-new-password');
      const confirmPasswordInput = screen.getByTestId('input-confirm-password');
      
      expect(fullnameInput).toHaveAttribute('autocomplete', 'name');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(newUsernameInput).toHaveAttribute('autocomplete', 'username');
      expect(newPasswordInput).toHaveAttribute('autocomplete', 'new-password');
      expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password');
    });
  });

  describe('Error Display Styling', () => {
    it('should display error alerts with appropriate styling', () => {
      window.location.search = '?error=google-auth-failed';
      
      render(<Login />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-red-500');
      expect(alert).toHaveClass('bg-red-50');
    });

    it('should display warning alerts with appropriate styling', () => {
      window.location.search = '?error=no-organization';
      
      render(<Login />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-yellow-500');
      expect(alert).toHaveClass('bg-yellow-50');
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner on login button when submitting', async () => {
      render(<Login />);
      
      const usernameInput = screen.getByTestId('input-username');
      const passwordInput = screen.getByTestId('input-password');
      const loginButton = screen.getByTestId('button-login');
      
      await userEvent.type(usernameInput, 'testuser');
      await userEvent.type(passwordInput, 'password123');
      
      fireEvent.click(loginButton);
      
      expect(loginButton.textContent).toContain('Logging in...');
      expect(loginButton).toBeDisabled();
    });

    it('should show loading spinner on signup button when submitting', async () => {
      render(<Login />);
      
      // Switch to signup tab
      const signupTab = screen.getByTestId('tab-signup');
      fireEvent.click(signupTab);
      
      const fullnameInput = screen.getByTestId('input-fullname');
      const emailInput = screen.getByTestId('input-email');
      const usernameInput = screen.getByTestId('input-new-username');
      const passwordInput = screen.getByTestId('input-new-password');
      const confirmPasswordInput = screen.getByTestId('input-confirm-password');
      const signupButton = screen.getByTestId('button-signup');
      
      await userEvent.type(fullnameInput, 'Test User');
      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(usernameInput, 'testuser');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.type(confirmPasswordInput, 'password123');
      
      fireEvent.click(signupButton);
      
      expect(signupButton.textContent).toContain('Creating account...');
      expect(signupButton).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty login fields', async () => {
      render(<Login />);
      
      const loginButton = screen.getByTestId('button-login');
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText('Email or username is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });

    it('should show validation errors for invalid signup fields', async () => {
      render(<Login />);
      
      // Switch to signup tab
      const signupTab = screen.getByTestId('tab-signup');
      fireEvent.click(signupTab);
      
      const signupButton = screen.getByTestId('button-signup');
      fireEvent.click(signupButton);
      
      await waitFor(() => {
        expect(screen.getByText('Full name is required')).toBeInTheDocument();
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
        expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
      });
    });

    it('should show error for mismatched passwords in signup', async () => {
      render(<Login />);
      
      // Switch to signup tab
      const signupTab = screen.getByTestId('tab-signup');
      fireEvent.click(signupTab);
      
      const passwordInput = screen.getByTestId('input-new-password');
      const confirmPasswordInput = screen.getByTestId('input-confirm-password');
      const signupButton = screen.getByTestId('button-signup');
      
      await userEvent.type(passwordInput, 'password123');
      await userEvent.type(confirmPasswordInput, 'password456');
      
      fireEvent.click(signupButton);
      
      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });
  });
});

// Integration tests for OAuth error flow
describe('OAuth Error Flow Integration', () => {
  it('should handle complete OAuth failure flow', async () => {
    const mockSetLocation = vi.fn();
    const mockToast = vi.fn();
    
    // Mock useLocation to capture redirects
    vi.mock('wouter', () => ({
      useLocation: () => ['/login?error=google-auth-failed', mockSetLocation],
    }));
    
    // Mock useToast to capture toast calls
    vi.mock('@/hooks/use-toast', () => ({
      useToast: () => ({
        toast: mockToast,
      }),
    }));
    
    render(<Login />);
    
    // Should show error alert
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    
    // Should have called toast
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Google Authentication Failed',
        variant: 'destructive',
      })
    );
    
    // Should clear URL parameters after showing error
    await waitFor(() => {
      expect(window.history.replaceState).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should redirect to pricing page for subscription errors', async () => {
    const mockSetLocation = vi.fn();
    
    vi.mock('wouter', () => ({
      useLocation: () => ['/login?error=no-subscription', mockSetLocation],
    }));
    
    render(<Login />);
    
    // Should show error alert
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain('Subscription Required');
    
    // Should redirect to pricing page after delay
    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/pricing');
    }, { timeout: 5000 });
  });
});