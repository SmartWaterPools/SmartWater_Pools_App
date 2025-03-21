/**
 * Email Configuration
 * 
 * This file contains the configuration for the email service,
 * including credential management and options.
 */

// Email provider types
export type EmailProvider = 'gmail' | 'outlook' | 'smtp';

// Email credentials interface
export interface EmailCredentials {
  // Common fields
  provider: EmailProvider;
  user: string;
  
  // Gmail OAuth2 fields
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  
  // SMTP fields
  host?: string;
  port?: number;
  secure?: boolean;
  password?: string;
}

// Default credentials loaded from environment variables
export function getDefaultEmailCredentials(): EmailCredentials | null {
  const provider = process.env.EMAIL_PROVIDER as EmailProvider;
  
  // Only proceed if provider is defined
  if (!provider) {
    console.log('No email provider configured. Email functionality will be disabled.');
    return null;
  }
  
  const credentials: EmailCredentials = {
    provider,
    user: process.env.EMAIL_USER || '',
  };
  
  // Add provider-specific fields
  switch (provider) {
    case 'gmail':
      credentials.clientId = process.env.GMAIL_CLIENT_ID;
      credentials.clientSecret = process.env.GMAIL_CLIENT_SECRET;
      credentials.refreshToken = process.env.GMAIL_REFRESH_TOKEN;
      break;
      
    case 'smtp':
      credentials.host = process.env.SMTP_HOST;
      credentials.port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined;
      credentials.secure = process.env.SMTP_SECURE === 'true';
      credentials.password = process.env.SMTP_PASSWORD;
      break;
      
    default:
      console.warn(`Unsupported email provider: ${provider}`);
      return null;
  }
  
  return credentials;
}

// Email templates
export const emailTemplates = {
  userInvitation: {
    subject: 'Invitation to Join Smart Water Pools',
    text: (name: string, company: string, inviteLink: string, role: string) => `
Hello ${name},

You have been invited to join ${company} on the Smart Water Pools platform.
You have been invited as a ${role}.

Please click the link below to create your account:

${inviteLink}

This invitation link will expire in 7 days.

Thank you,
Smart Water Pools Team
    `.trim(),
    html: (name: string, company: string, inviteLink: string, role: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invitation to Join Smart Water Pools</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0284c7; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .button { display: inline-block; background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    .footer { padding: 15px; text-align: center; font-size: 0.8rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You're Invited!</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>You have been invited to join <strong>${company}</strong> on the Smart Water Pools platform as a <strong>${role}</strong>.</p>
      <p>Please click the button below to create your account:</p>
      <p style="text-align: center;">
        <a href="${inviteLink}" class="button">Accept Invitation</a>
      </p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${inviteLink}</p>
      <p>This invitation link will expire in 7 days.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Smart Water Pools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  },
  
  passwordReset: {
    subject: 'Reset Your Password - Smart Water Pools',
    text: (name: string, resetLink: string) => `
Hello ${name},

You recently requested to reset your password for your Smart Water Pools account.
Please click the link below to reset your password:

${resetLink}

If you did not request a password reset, please ignore this email or contact support if you have concerns.

This password reset link will expire in 24 hours.

Thank you,
Smart Water Pools Team
    `.trim(),
    html: (name: string, resetLink: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0284c7; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .button { display: inline-block; background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    .footer { padding: 15px; text-align: center; font-size: 0.8rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>You recently requested to reset your password for your Smart Water Pools account.</p>
      <p>Please click the button below to reset your password:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${resetLink}</p>
      <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      <p>This password reset link will expire in 24 hours.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Smart Water Pools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  },
  
  twoFactorAuth: {
    subject: 'Your Verification Code - Smart Water Pools',
    text: (name: string, code: string) => `
Hello ${name},

Your verification code for Smart Water Pools is:

${code}

This code will expire in 10 minutes.

If you did not request this code, please ignore this email or contact support if you have concerns.

Thank you,
Smart Water Pools Team
    `.trim(),
    html: (name: string, code: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Verification Code</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0284c7; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .code { font-size: 24px; letter-spacing: 5px; text-align: center; margin: 20px 0; font-weight: bold; }
    .footer { padding: 15px; text-align: center; font-size: 0.8rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Verification Code</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>Your verification code for Smart Water Pools is:</p>
      <div class="code">${code}</div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this code, please ignore this email or contact support if you have concerns.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Smart Water Pools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  },
  
  newUser: {
    subject: 'Welcome to Smart Water Pools - Your Account Details',
    text: (name: string, username: string, password: string) => `
Hello ${name},

Your Smart Water Pools account has been created. Here are your account details:

Username: ${username}
Temporary Password: ${password}

Please log in at ${process.env.APP_URL || ''} and change your password as soon as possible.

Thank you,
Smart Water Pools Team
    `.trim(),
    html: (name: string, username: string, password: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Smart Water Pools</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0284c7; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .credentials { background-color: #e0f2fe; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .button { display: inline-block; background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    .footer { padding: 15px; text-align: center; font-size: 0.8rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Smart Water Pools</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>Your Smart Water Pools account has been created. Here are your account details:</p>
      <div class="credentials">
        <p><strong>Username:</strong> ${username}</p>
        <p><strong>Temporary Password:</strong> ${password}</p>
      </div>
      <p style="text-align: center;">
        <a href="${process.env.APP_URL || ''}" class="button">Login to Your Account</a>
      </p>
      <p>Please log in and change your password as soon as possible.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Smart Water Pools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  },
  
  serviceReminder: {
    subject: 'Your Upcoming Pool Service Appointment',
    text: (name: string, serviceDate: string, serviceType: string) => `
Hello ${name},

This is a reminder about your upcoming pool service appointment:

Date: ${serviceDate}
Service: ${serviceType}

If you need to reschedule, please contact us as soon as possible.

Thank you,
Smart Water Pools Team
    `.trim(),
    html: (name: string, serviceDate: string, serviceType: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Upcoming Pool Service Appointment</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0284c7; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .appointment { background-color: #e0f2fe; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .footer { padding: 15px; text-align: center; font-size: 0.8rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Pool Service Appointment</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>This is a reminder about your upcoming pool service appointment:</p>
      <div class="appointment">
        <p><strong>Date:</strong> ${serviceDate}</p>
        <p><strong>Service:</strong> ${serviceType}</p>
      </div>
      <p>If you need to reschedule, please contact us as soon as possible.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Smart Water Pools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }
};