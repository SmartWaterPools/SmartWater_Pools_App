/**
 * Email Service using Gmail API
 * 
 * This service implements email functionality for the app, including:
 * - Email-based two-factor authentication
 * - Password reset emails
 * - User creation notifications
 * - Service reminders
 * 
 * Note: This requires 'googleapis' and 'nodemailer' packages to be installed,
 * along with proper Gmail API credentials.
 */

import { User, Client, communicationProviders } from '../shared/schema.js';
import { db } from './db.js';
import { EmailCredentials, emailTemplates, getDefaultEmailCredentials } from './email-config.js';
import { GmailService, createGmailService, EmailOptions } from './gmail-service.js';
import { eq } from 'drizzle-orm';

// Email configuration constants
const EMAIL_FROM = 'Smart Water Pools <noreply@smartwaterpools.com>';
const PASSWORD_RESET_EXPIRY_HOURS = 24;

// In-memory token storage for password reset and 2FA
// In a production environment, this should be stored in a database
interface TokenRecord {
  token: string;
  userId: number;
  email: string;
  expires: Date;
  used: boolean;
  type: 'password-reset' | '2fa';
}

// In-memory storage (temporary solution)
const tokenStore: TokenRecord[] = [];

/**
 * Email Service class to handle all email-related functionality
 */
export class EmailService {
  private credentials: EmailCredentials | null = null;
  private gmailService: GmailService | null = null;
  
  /**
   * Initialize the email service with credentials
   */
  constructor(credentials?: EmailCredentials) {
    if (credentials) {
      this.setCredentials(credentials);
    } else {
      // Try to load from environment variables
      const defaultCredentials = getDefaultEmailCredentials();
      if (defaultCredentials) {
        this.setCredentials(defaultCredentials);
      }
    }
  }

  /**
   * Set credentials and initialize the appropriate email service
   */
  setCredentials(credentials: EmailCredentials): void {
    this.credentials = credentials;
    
    // Initialize the appropriate email service based on provider
    if (credentials.provider === 'gmail') {
      this.gmailService = createGmailService(credentials);
      console.log('Gmail API service initialized for:', credentials.user);
    } else {
      console.log(`${credentials.provider} email service initialized for:`, credentials.user);
    }
  }

  /**
   * Check if credentials are configured
   */
  hasCredentials(): boolean {
    return !!this.credentials;
  }
  
  /**
   * Test the email connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.credentials) {
      console.error('Email credentials not configured');
      return false;
    }
    
    if (this.credentials.provider === 'gmail' && this.gmailService) {
      return await this.gmailService.testConnection();
    }
    
    console.warn('No email service configured for provider:', this.credentials.provider);
    return false;
  }

  /**
   * Generate a random token for password reset or 2FA
   */
  private generateToken(length = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Store a token in the token store
   */
  private storeToken(userId: number, email: string, type: 'password-reset' | '2fa'): string {
    const token = this.generateToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + PASSWORD_RESET_EXPIRY_HOURS);
    
    // Remove any existing tokens for this user and type
    const existingIndex = tokenStore.findIndex(t => t.userId === userId && t.type === type);
    if (existingIndex !== -1) {
      tokenStore.splice(existingIndex, 1);
    }
    
    // Add new token
    tokenStore.push({
      token,
      userId,
      email,
      expires,
      used: false,
      type
    });
    
    return token;
  }

  /**
   * Verify a token from the token store
   */
  verifyToken(token: string, type: 'password-reset' | '2fa'): number | null {
    const now = new Date();
    const record = tokenStore.find(t => 
      t.token === token && 
      t.type === type &&
      !t.used &&
      t.expires > now
    );
    
    if (record) {
      record.used = true;
      return record.userId;
    }
    
    return null;
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user: User): Promise<boolean> {
    // Check if we're in development mode - this will affect our fallback behavior
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (!this.credentials) {
      console.error('Email credentials not configured');
      // In development, we'll simulate successful sending
      if (isDevelopment) {
        console.log('DEVELOPMENT MODE: Continuing without email credentials');
      } else {
        return false;
      }
    }
    
    if (!user.email) {
      console.error('User email not provided');
      return false;
    }
    
    try {
      const token = this.storeToken(user.id, user.email, 'password-reset');
      
      // Always use the production URL for password reset
      let baseUrl = 'https://smartwaterpools.replit.app';
      
      // If APP_URL is explicitly set, use that
      if (process.env.APP_URL) {
        baseUrl = process.env.APP_URL;
      } else if (process.env.NODE_ENV !== 'production') {
        // Only use localhost in explicit development mode
        baseUrl = 'http://localhost:5000';
        console.log('Using localhost URL for password reset in development');
      }
      
      // Make sure baseUrl doesn't end with a slash
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      
      const resetLink = `${baseUrl}/reset-password?token=${token}`;
      console.log('Generated password reset link:', resetLink);
      
      const userName = user.name || user.username;
      
      // Create email content from template
      const emailOptions: EmailOptions = {
        to: user.email,
        subject: emailTemplates.passwordReset.subject,
        text: emailTemplates.passwordReset.text(userName, resetLink),
        html: emailTemplates.passwordReset.html(userName, resetLink)
      };
      
      // If Gmail service is available and configured
      if (this.credentials?.provider === 'gmail' && this.gmailService) {
        return await this.gmailService.sendEmail(emailOptions);
      } else {
        console.log(`----------------------------------------`);
        console.log(`[EMAIL] Password reset email would be sent to ${user.email}`);
        console.log(`Reset link: ${resetLink}`);
        console.log(`----------------------------------------`);
        
        return isDevelopment ? true : false;
      }
    } catch (error) {
      console.error('Error sending password reset email:', error);
      
      // In development, we want to simulate success even if there was an error
      if (isDevelopment) {
        console.log('DEVELOPMENT MODE: Simulating successful email sending despite error');
        return true;
      }
      
      return false;
    }
  }

  /**
   * Send 2FA verification code
   */
  async send2FACode(user: User): Promise<string | null> {
    // Check if we're in development mode - this will affect our fallback behavior
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (!this.credentials) {
      console.error('Email credentials not configured');
      // In development, we'll continue without credentials
      if (!isDevelopment) {
        return null;
      }
      console.log('DEVELOPMENT MODE: Continuing without email credentials');
    }
    
    if (!user.email) {
      console.error('User email not provided');
      return null;
    }
    
    try {
      // Generate a 6-digit 2FA code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const userName = user.name || user.username;
      
      // Create email content from template
      const emailOptions: EmailOptions = {
        to: user.email,
        subject: emailTemplates.twoFactorAuth.subject,
        text: emailTemplates.twoFactorAuth.text(userName, code),
        html: emailTemplates.twoFactorAuth.html(userName, code)
      };
      
      // If Gmail service is available and configured
      if (this.credentials?.provider === 'gmail' && this.gmailService) {
        const sent = await this.gmailService.sendEmail(emailOptions);
        if (!sent) {
          console.error('Failed to send 2FA code email');
          // In development, we want to continue despite the error
          if (!isDevelopment) {
            return null;
          }
        }
      } else {
        console.log(`----------------------------------------`);
        console.log(`[EMAIL] 2FA verification code would be sent to ${user.email}`);
        console.log(`Verification code: ${code}`);
        console.log(`----------------------------------------`);
      }
      
      // In development or if email sent successfully, return the code
      return code;
    } catch (error) {
      console.error('Error sending 2FA code:', error);
      
      // In development, we want to simulate success even if there was an error
      if (isDevelopment) {
        console.log('DEVELOPMENT MODE: Simulating successful 2FA email despite error');
        // Generate a fallback code for development
        const fallbackCode = '123456';
        return fallbackCode;
      }
      
      return null;
    }
  }

  /**
   * Send user creation notification
   */
  async sendUserCreationEmail(user: User, temporaryPassword: string): Promise<boolean> {
    // Check if we're in development mode - this will affect our fallback behavior
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (!this.credentials) {
      console.error('Email credentials not configured');
      // In development, we'll simulate successful sending
      if (isDevelopment) {
        console.log('DEVELOPMENT MODE: Continuing without email credentials');
      } else {
        return false;
      }
    }
    
    if (!user.email) {
      console.error('User email not provided');
      return false;
    }
    
    try {
      const userName = user.name || user.username;
      
      // Create email content from template
      const emailOptions: EmailOptions = {
        to: user.email,
        subject: emailTemplates.newUser.subject,
        text: emailTemplates.newUser.text(userName, user.username, temporaryPassword),
        html: emailTemplates.newUser.html(userName, user.username, temporaryPassword)
      };
      
      // If Gmail service is available and configured
      if (this.credentials?.provider === 'gmail' && this.gmailService) {
        return await this.gmailService.sendEmail(emailOptions);
      } else {
        console.log(`----------------------------------------`);
        console.log(`[EMAIL] New user account email would be sent to ${user.email}`);
        console.log(`Username: ${user.username}`);
        console.log(`Temporary password: ${temporaryPassword}`);
        console.log(`----------------------------------------`);
        
        return isDevelopment ? true : false;
      }
    } catch (error) {
      console.error('Error sending user creation email:', error);
      
      // In development, we want to simulate success even if there was an error
      if (isDevelopment) {
        console.log('DEVELOPMENT MODE: Simulating successful email sending despite error');
        return true;
      }
      
      return false;
    }
  }

  /**
   * Send service reminder to client
   */
  async sendServiceReminder(client: Client, serviceDate: Date, serviceType: string): Promise<boolean> {
    // Check if we're in development mode - this will affect our fallback behavior
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (!this.credentials) {
      console.error('Email credentials not configured');
      // In development, we'll simulate successful sending
      if (isDevelopment) {
        console.log('DEVELOPMENT MODE: Continuing without email credentials');
      } else {
        return false;
      }
    }
    
    try {
      // Get user associated with client to get email
      const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, client.userId)
      });
      
      if (!user || !user.email) {
        console.error('Client user email not found');
        return false;
      }
      
      const formattedDate = serviceDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const userName = user.name || user.username;
      
      // Create email content from template
      const emailOptions: EmailOptions = {
        to: user.email,
        subject: emailTemplates.serviceReminder.subject,
        text: emailTemplates.serviceReminder.text(userName, formattedDate, serviceType),
        html: emailTemplates.serviceReminder.html(userName, formattedDate, serviceType)
      };
      
      // If Gmail service is available and configured
      if (this.credentials?.provider === 'gmail' && this.gmailService) {
        return await this.gmailService.sendEmail(emailOptions);
      } else {
        console.log(`----------------------------------------`);
        console.log(`[EMAIL] Service reminder would be sent to ${user.email}`);
        console.log(`Service: ${serviceType} on ${formattedDate}`);
        console.log(`----------------------------------------`);
        
        return isDevelopment ? true : false;
      }
    } catch (error) {
      console.error('Error sending service reminder:', error);
      
      // In development, we want to simulate success even if there was an error
      if (isDevelopment) {
        console.log('DEVELOPMENT MODE: Simulating successful email sending despite error');
        return true;
      }
      
      return false;
    }
  }

  /**
   * Send invitation email to join an organization
   */
  async sendUserInvitation(
    recipientName: string, 
    recipientEmail: string, 
    companyName: string, 
    role: string, 
    invitationToken: string
  ): Promise<boolean> {
    // Check if we're in development mode - this will affect our fallback behavior
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (!this.credentials) {
      console.error('Email credentials not configured');
      // In development, we'll simulate successful sending
      if (isDevelopment) {
        console.log('DEVELOPMENT MODE: Continuing without email credentials');
      } else {
        return false;
      }
    }

    try {
      // Create invitation link using the invitation token
      // Always use the production URL for invitations
      let baseUrl = 'https://smartwaterpools.replit.app';
      
      // If APP_URL is explicitly set, use that
      if (process.env.APP_URL) {
        baseUrl = process.env.APP_URL;
      } else if (process.env.NODE_ENV !== 'production') {
        // Only use localhost in explicit development mode
        baseUrl = 'http://localhost:5000';
        console.log('Using localhost URL for email in development');
      }
      
      console.log('Using base URL for invitation emails:', baseUrl);
      
      // Make sure baseUrl doesn't end with a slash
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      
      const inviteLink = `${baseUrl}/invite?token=${invitationToken}`;
      console.log('Generated invitation link:', inviteLink);
      
      // Create email content from template
      const emailOptions: EmailOptions = {
        to: recipientEmail,
        subject: emailTemplates.userInvitation.subject,
        text: emailTemplates.userInvitation.text(recipientName, companyName, inviteLink, role),
        html: emailTemplates.userInvitation.html(recipientName, companyName, inviteLink, role)
      };
      
      // If Gmail service is available and configured
      if (this.credentials?.provider === 'gmail' && this.gmailService) {
        return await this.gmailService.sendEmail(emailOptions);
      } else {
        console.log(`----------------------------------------`);
        console.log(`[EMAIL] Invitation email would be sent to ${recipientEmail}`);
        console.log(`Company: ${companyName}`);
        console.log(`Role: ${role}`);
        console.log(`Invitation link: ${inviteLink}`);
        console.log(`----------------------------------------`);
        
        return isDevelopment ? true : false;
      }
    } catch (error) {
      console.error('Error sending invitation email:', error);
      
      // In development, we want to simulate success even if there was an error
      if (isDevelopment) {
        console.log('DEVELOPMENT MODE: Simulating successful email sending despite error');
        return true;
      }
      
      return false;
    }
  }
}

/**
 * Load communication provider from database and configure email service
 * 
 * This function attempts to load a Gmail provider from the database and 
 * configure the email service with those credentials.
 */
export async function loadEmailConfigFromDatabase(): Promise<boolean> {
  try {
    // Look for Gmail provider in the database
    const gmailProvider = await db.query.communicationProviders.findFirst({
      where: (provider, { eq, and }) => and(
        eq(provider.type, 'gmail'),
        eq(provider.isActive, true)
      )
    });

    if (!gmailProvider) {
      console.log('No active Gmail provider found in database');
      return false;
    }

    // Convert to EmailCredentials format
    const credentials: EmailCredentials = {
      provider: 'gmail',
      user: gmailProvider.email || '',
      clientId: gmailProvider.clientId || undefined,
      clientSecret: gmailProvider.clientSecret || undefined,
      refreshToken: gmailProvider.settings || undefined // RefreshToken might be stored in settings
    };

    // Only use if we have essential credentials
    if (!credentials.user || !credentials.clientId || !credentials.clientSecret) {
      console.log('Gmail provider found but missing essential credentials');
      return false;
    }

    // Configure email service with database credentials
    configureEmailService(credentials);
    
    console.log(`Email service configured with Gmail provider from database: ${credentials.user}`);
    return true;
  } catch (error) {
    console.error('Error loading email configuration from database:', error);
    return false;
  }
}

// Create a singleton instance of the email service
export const emailService = new EmailService();

// Export function to configure email service
export function configureEmailService(credentials: EmailCredentials): void {
  emailService.setCredentials(credentials);
}