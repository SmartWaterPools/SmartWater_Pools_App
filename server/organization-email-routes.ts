/**
 * Organization Email Settings API Routes
 * 
 * This file contains API routes for managing organization-specific email settings,
 * allowing org admins to configure their company's email branding and reply-to addresses.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from './db.js';
import { organizations } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { isAuthenticated } from './auth.js';
import { emailService } from './email-service.js';

const router = Router();

// Validation schema for organization email settings
const organizationEmailSettingsSchema = z.object({
  emailFromName: z.string().min(1, "Company name is required"),
  emailFromAddress: z.string().email("Please enter a valid email address"),
  emailSignature: z.string().optional()
});

/**
 * Update organization email settings
 * PUT /api/organizations/:id/email-settings
 */
router.put('/:id/email-settings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate request body
    const validationResult = organizationEmailSettingsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validationResult.error.errors
      });
    }

    // Check if user has permission to update this organization
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      with: {
        organization: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is org admin and belongs to the organization
    if (user.role !== 'org_admin' || user.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this organization\'s email settings'
      });
    }

    const { emailFromName, emailFromAddress, emailSignature } = validationResult.data;

    // Update organization email settings
    const updatedOrganization = await db
      .update(organizations)
      .set({
        emailFromName,
        emailFromAddress,
        emailSignature: emailSignature || null
      })
      .where(eq(organizations.id, organizationId))
      .returning();

    if (updatedOrganization.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    return res.json({
      success: true,
      message: 'Email settings updated successfully',
      data: {
        emailFromName: updatedOrganization[0].emailFromName,
        emailFromAddress: updatedOrganization[0].emailFromAddress,
        emailSignature: updatedOrganization[0].emailSignature
      }
    });

  } catch (error) {
    console.error('Error updating organization email settings:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating email settings'
    });
  }
});

/**
 * Test organization email settings
 * POST /api/organizations/:id/email-settings/test
 */
router.post('/:id/email-settings/test', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate request body
    const validationResult = organizationEmailSettingsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email settings',
        errors: validationResult.error.errors
      });
    }

    // Check if user has permission to test this organization's email
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      with: {
        organization: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'org_admin' || user.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to test this organization\'s email settings'
      });
    }

    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: 'Your user account must have an email address to receive the test email'
      });
    }

    // Check if email service is configured
    if (!emailService.hasCredentials()) {
      return res.status(400).json({
        success: false,
        message: 'Email service is not configured. Please check server settings.'
      });
    }

    const { emailFromName, emailFromAddress, emailSignature } = validationResult.data;

    // Send a test email using the provided settings
    const testEmailOptions = {
      to: user.email,
      subject: `Test Email from ${emailFromName}`,
      text: `Hello ${user.name || user.username},

This is a test email to verify your organization's email configuration is working correctly.

Email settings being tested:
- From Name: ${emailFromName}
- From Address: ${emailFromAddress}
- Signature: ${emailSignature ? 'Configured' : 'Not configured'}

If you received this email, your email configuration is working properly!

${emailSignature || ''}

Best regards,
SmartWater Pools System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0284c7;">Test Email from ${emailFromName}</h2>
          
          <p>Hello ${user.name || user.username},</p>
          
          <p>This is a test email to verify your organization's email configuration is working correctly.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Email settings being tested:</h3>
            <ul>
              <li><strong>From Name:</strong> ${emailFromName}</li>
              <li><strong>From Address:</strong> ${emailFromAddress}</li>
              <li><strong>Signature:</strong> ${emailSignature ? 'Configured' : 'Not configured'}</li>
            </ul>
          </div>
          
          <p>If you received this email, your email configuration is working properly!</p>
          
          ${emailSignature ? `<div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; white-space: pre-line;">${emailSignature}</div>` : ''}
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            SmartWater Pools System
          </p>
        </div>
      `,
      from: `${emailFromName} <${emailFromAddress}>`
    };

    // Send the test email
    const emailSent = await emailService.sendTestEmail(testEmailOptions);

    if (emailSent) {
      return res.json({
        success: true,
        message: `Test email sent successfully to ${user.email}. Please check your inbox to verify the configuration.`
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send test email. Please check your email configuration.'
      });
    }

  } catch (error) {
    console.error('Error testing organization email settings:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while testing email settings'
    });
  }
});

export default router;