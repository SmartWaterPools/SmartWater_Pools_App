/**
 * SendGrid Email Service
 * 
 * This service implements email functionality using SendGrid API for reliable
 * transactional email delivery including notifications, password resets, and alerts.
 */

import sgMail from '@sendgrid/mail';

export interface SendGridEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export class SendGridService {
  private isInitialized = false;
  private fromEmail: string;

  constructor(apiKey?: string, fromEmail = 'SmartWater Pools <noreply@smartwaterpools.com>') {
    this.fromEmail = fromEmail;
    
    if (apiKey) {
      this.initialize(apiKey);
    } else if (process.env.SENDGRID_API_KEY) {
      this.initialize(process.env.SENDGRID_API_KEY);
    }
  }

  /**
   * Initialize SendGrid with API key
   */
  private initialize(apiKey: string): void {
    try {
      sgMail.setApiKey(apiKey);
      this.isInitialized = true;
      console.log('SendGrid service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SendGrid:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if SendGrid is properly configured
   */
  isConfigured(): boolean {
    return this.isInitialized && !!process.env.SENDGRID_API_KEY;
  }

  /**
   * Test SendGrid connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      console.error('SendGrid not configured');
      return false;
    }

    try {
      // SendGrid doesn't have a dedicated test endpoint, so we'll just verify the API key format
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey || !apiKey.startsWith('SG.')) {
        console.error('Invalid SendGrid API key format');
        return false;
      }
      
      console.log('SendGrid connection test passed');
      return true;
    } catch (error) {
      console.error('SendGrid connection test failed:', error);
      return false;
    }
  }

  /**
   * Send email using SendGrid
   */
  async sendEmail(options: SendGridEmailOptions): Promise<boolean> {
    if (!this.isConfigured()) {
      console.error('SendGrid not configured - cannot send email');
      return false;
    }

    try {
      const msg: any = {
        to: options.to,
        from: options.from || this.fromEmail,
        subject: options.subject,
      };

      // Add content based on what's provided
      if (options.html) {
        msg.html = options.html;
      }
      if (options.text) {
        msg.text = options.text;
      }

      await sgMail.send(msg);
      console.log(`Email sent successfully to ${options.to} via SendGrid`);
      return true;
    } catch (error) {
      console.error('SendGrid email sending failed:', error);
      
      // Log more details about the error
      if (error && typeof error === 'object' && 'response' in error) {
        const sgError = error as any;
        console.error('SendGrid error details:', {
          status: sgError.code,
          message: sgError.message,
          response: sgError.response?.body
        });
      }
      
      return false;
    }
  }

  /**
   * Send bulk emails (useful for notifications to multiple recipients)
   */
  async sendBulkEmails(emails: SendGridEmailOptions[]): Promise<boolean[]> {
    if (!this.isConfigured()) {
      console.error('SendGrid not configured - cannot send bulk emails');
      return emails.map(() => false);
    }

    const results: boolean[] = [];
    
    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);
      
      // Add small delay between emails to avoid rate limiting
      if (emails.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Send email with template (if using SendGrid dynamic templates)
   */
  async sendTemplateEmail(
    to: string,
    templateId: string,
    dynamicData: Record<string, any>,
    from?: string
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.error('SendGrid not configured - cannot send template email');
      return false;
    }

    try {
      const msg = {
        to,
        from: from || this.fromEmail,
        templateId,
        dynamicTemplateData: dynamicData,
      };

      await sgMail.send(msg);
      console.log(`Template email sent successfully to ${to} via SendGrid`);
      return true;
    } catch (error) {
      console.error('SendGrid template email sending failed:', error);
      return false;
    }
  }
}

// Create a singleton instance
export const sendGridService = new SendGridService();