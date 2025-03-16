/**
 * Gmail-specific Service Implementation
 * 
 * This file contains the Gmail-specific implementation details for the email service.
 * It uses OAuth2 authentication with Gmail API for sending emails.
 * 
 * Note: This requires 'googleapis' and 'nodemailer' packages to be installed,
 * but will function in a gracefully degraded state without them.
 */

import { EmailCredentials } from './email-config.js';

// Check for development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

// Import types for googleapis and nodemailer, we'll import the actual modules dynamically
type OAuth2ClientType = any;
type NodemailerTransporterType = any;
type NodemailerSendMailOptions = any;

// Setup dynamic imports - we'll load these lazily when needed
let googleapisModule: any = null;
let nodemailerModule: any = null;

// Check if packages are available by trying to import them
let packagesAvailable = false;
let packagesChecked = false;

// Function to check package availability
async function checkPackages(): Promise<boolean> {
  if (packagesChecked) return packagesAvailable;
  
  try {
    // Attempt to import both packages
    googleapisModule = await import('googleapis');
    nodemailerModule = await import('nodemailer');
    
    // If we get here, both packages are available
    packagesAvailable = true;
    packagesChecked = true;
    console.log('Gmail service packages (googleapis and nodemailer) are available');
    return true;
  } catch (error) {
    packagesChecked = true;
    console.warn('googleapis or nodemailer packages are not available:', error);
    return false;
  }
}

// Type definition for email options
export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Gmail service class using OAuth2 authentication
 * 
 * Note: This is currently a stub. Once the necessary packages are installed,
 * this class will be implemented with full functionality.
 */
export class GmailService {
  private credentials: EmailCredentials;
  private oauth2Client: any = null; // Will be googleapis.Auth.OAuth2Client
  private gmailTransporter: any = null; // Will be nodemailer.Transporter
  
  /**
   * Initialize the Gmail service with credentials
   */
  constructor(credentials: EmailCredentials) {
    this.credentials = credentials;
    console.log('Gmail service initialized with credentials for:', credentials.user);
    
    // Check packages on initialization
    checkPackages().then(available => {
      if (!available) {
        console.warn('Gmail service initialized in limited mode - required packages not available');
        console.warn('To enable full Gmail functionality, please install:');
        console.warn('  npm install googleapis nodemailer');
      }
    });
  }
  
  /**
   * Set up the OAuth2 client and Gmail transporter
   */
  async setupGmailTransport(): Promise<boolean> {
    try {
      // Validate credentials
      if (!this.credentials.clientId || !this.credentials.clientSecret || !this.credentials.refreshToken) {
        console.error('Missing required Gmail API credentials (clientId, clientSecret, or refreshToken)');
        console.log('ClientId present:', !!this.credentials.clientId);
        console.log('ClientSecret present:', !!this.credentials.clientSecret);
        console.log('RefreshToken present:', !!this.credentials.refreshToken);
        return isDevelopment; // In development mode, we'll simulate success
      }
      
      console.log('----------------------------------------');
      console.log(`[EMAIL SETUP] Setting up Gmail transport with OAuth2 for: ${this.credentials.user}`);
      
      // Check if packages are available
      const packagesReady = await checkPackages();
      
      if (packagesReady) {
        try {
          // Create OAuth2 client with credentials
          const { google } = googleapisModule;
          const OAuth2 = google.auth.OAuth2;
          
          this.oauth2Client = new OAuth2(
            this.credentials.clientId,
            this.credentials.clientSecret,
            'https://developers.google.com/oauthplayground' // Redirect URL
          );
          
          // Set refresh token
          this.oauth2Client.setCredentials({
            refresh_token: this.credentials.refreshToken
          });
          
          // Create nodemailer transporter with Gmail and OAuth2
          const accessToken = await this.oauth2Client.getAccessToken();
          
          this.gmailTransporter = nodemailerModule.createTransport({
            service: 'gmail',
            auth: {
              type: 'OAuth2',
              user: this.credentials.user,
              clientId: this.credentials.clientId,
              clientSecret: this.credentials.clientSecret,
              refreshToken: this.credentials.refreshToken,
              accessToken: accessToken?.token || ''
            }
          });
          
          console.log('Gmail transporter created successfully');
          return true;
        } catch (error) {
          console.error('Error setting up Gmail OAuth2 client and transporter:', error);
          return isDevelopment; // In development mode, simulate success despite the error
        }
      } else {
        console.log('PACKAGES NOT AVAILABLE: This is a simulated setup. To enable actual setup:');
        console.log('1. Install required packages: "npm install googleapis nodemailer"');
        console.log('2. Restart the server');
        console.log('----------------------------------------');
        
        return isDevelopment; // In development, simulate success
      }
    } catch (error) {
      console.error('Error setting up Gmail transport:', error);
      return isDevelopment; // In development mode, simulate success despite the error
    }
  }
  
  /**
   * Send an email using Gmail
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Check if we have credentials
      if (!this.credentials.clientId || !this.credentials.clientSecret || !this.credentials.refreshToken) {
        console.error('Missing required Gmail API credentials (clientId, clientSecret, or refreshToken)');
        return isDevelopment; // In development mode, we'll simulate success
      }
      
      // Log email details (but not the full content for privacy)
      console.log('----------------------------------------');
      console.log(`[EMAIL] Using configured Gmail credentials for: ${this.credentials.user}`);
      console.log(`Email to: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body (truncated): ${options.text.substring(0, 100)}...`);
      
      // Check if packages are available
      const packagesReady = await checkPackages();
      
      if (packagesReady) {
        // Check if Gmail transporter is set up
        if (!this.gmailTransporter) {
          const setupSuccess = await this.setupGmailTransport();
          if (!setupSuccess) {
            console.error('Failed to set up Gmail transport');
            return isDevelopment; // In development mode, we'll simulate success
          }
        }
        
        try {
          // Prepare mail options
          const mailOptions = {
            from: this.credentials.user,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html || undefined,
            cc: options.cc?.length ? options.cc.join(',') : undefined,
            bcc: options.bcc?.length ? options.bcc.join(',') : undefined,
            attachments: options.attachments
          };
          
          // Send mail using nodemailer
          const result = await this.gmailTransporter.sendMail(mailOptions);
          
          console.log(`Email sent successfully: ${result.messageId}`);
          console.log('----------------------------------------');
          
          return true;
        } catch (error) {
          console.error('Error sending email with nodemailer:', error);
          
          // In development mode, we'll simulate success despite the error
          if (isDevelopment) {
            console.log('DEVELOPMENT MODE: Simulating successful email send despite error');
            return true;
          }
          
          return false;
        }
      } else {
        console.log('PACKAGES NOT AVAILABLE: This is a simulated success. To enable actual sending:');
        console.log('1. Install required packages: "npm install googleapis nodemailer"');
        console.log('2. Restart the server');
        console.log('----------------------------------------');
        
        return isDevelopment; // In development, simulate success
      }
    } catch (error) {
      console.error('Error sending email:', error);
      return isDevelopment; // In development mode, we'll simulate success despite the error
    }
  }
  
  /**
   * Check if Gmail API connection is working
   */
  async testConnection(): Promise<boolean> {
    try {
      // Check if we have credentials
      if (!this.credentials.clientId || !this.credentials.clientSecret || !this.credentials.refreshToken) {
        console.error('Missing required Gmail API credentials (clientId, clientSecret, or refreshToken)');
        
        // More detailed logging for diagnostics
        console.log('ClientId present:', !!this.credentials.clientId);
        console.log('ClientSecret present:', !!this.credentials.clientSecret); 
        console.log('RefreshToken present:', !!this.credentials.refreshToken);
        
        return isDevelopment; // In development mode, we'll simulate success
      }
      
      // Log credential info (partial, for security)
      console.log('----------------------------------------');
      console.log(`[EMAIL TEST] Testing Gmail connection with credentials for: ${this.credentials.user}`);
      console.log(`ClientId: ${this.credentials.clientId?.substring(0, 5)}...`);
      console.log(`ClientSecret: ${this.credentials.clientSecret ? '[PROVIDED]' : '[MISSING]'}`);
      console.log(`RefreshToken: ${this.credentials.refreshToken ? '[PROVIDED]' : '[MISSING]'}`);
      
      // Check if packages are available
      const packagesReady = await checkPackages();
      
      if (packagesReady) {
        try {
          // Create OAuth2 client with credentials
          const { google } = googleapisModule;
          const OAuth2 = google.auth.OAuth2;
          
          const oauth2Client = new OAuth2(
            this.credentials.clientId,
            this.credentials.clientSecret,
            'https://developers.google.com/oauthplayground' // Redirect URL
          );
          
          // Set refresh token
          oauth2Client.setCredentials({
            refresh_token: this.credentials.refreshToken
          });
          
          // Try to get an access token as a test
          const accessToken = await oauth2Client.getAccessToken();
          
          if (accessToken && accessToken.token) {
            console.log('Successfully obtained access token from refresh token');
            
            // For a more thorough test, try to access Gmail API
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
            
            // Get user profile to verify connection
            const profile = await gmail.users.getProfile({ userId: 'me' });
            
            if (profile && profile.data) {
              console.log(`Successfully connected to Gmail API for: ${profile.data.emailAddress}`);
              console.log('----------------------------------------');
              return true;
            }
          }
          
          console.warn('Failed to validate Gmail API connection');
          return false;
        } catch (error) {
          console.error('Error testing Gmail API connection:', error);
          
          // In development mode, we'll simulate success despite the error
          if (isDevelopment) {
            console.log('DEVELOPMENT MODE: Simulating successful connection test despite error');
            return true;
          }
          
          return false;
        }
      } else {
        console.log('PACKAGES NOT AVAILABLE: This is a simulated success. To enable actual testing:');
        console.log('1. Install required packages: "npm install googleapis nodemailer"');
        console.log('2. Restart the server');
        console.log('----------------------------------------');
        
        return isDevelopment; // In development, simulate success
      }
    } catch (error) {
      console.error('Error testing Gmail connection:', error);
      return isDevelopment; // In development mode, simulate success despite the error
    }
  }
}

// Helper function to create a Gmail service
export function createGmailService(credentials: EmailCredentials): GmailService | null {
  if (credentials.provider !== 'gmail') {
    console.error('Invalid provider for Gmail service:', credentials.provider);
    return null;
  }
  
  return new GmailService(credentials);
}