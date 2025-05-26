import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from './db';
import { 
  clientCommunications, 
  communicationComments, 
  communicationAttachments,
  insertClientCommunicationSchema,
  insertCommunicationCommentSchema,
  clients,
  users,
  organizations
} from '../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { isAuthenticated } from './auth';

const router = Router();

/**
 * Get all communications for a client
 * GET /api/clients/:clientId/communications
 */
router.get('/:clientId/communications', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user organization
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      with: { organization: true }
    });

    if (!user?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization membership required'
      });
    }

    // Verify client belongs to organization
    const client = await db.query.clients.findFirst({
      where: (clients, { and, eq }) => and(
        eq(clients.id, clientId),
        eq(clients.organizationId, user.organizationId)
      )
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Get communications with related data
    const communications = await db.query.clientCommunications.findMany({
      where: (comms, { eq }) => eq(comms.clientId, clientId),
      with: {
        comments: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: (comments, { asc }) => [asc(comments.createdAt)]
        },
        attachments: true,
        assignedToUser: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        },
        createdByUser: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: (comms, { desc }) => [desc(comms.createdAt)]
    });

    return res.json({
      success: true,
      data: {
        communications,
        clientId,
        clientName: client.name
      }
    });

  } catch (error) {
    console.error('Error fetching client communications:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching communications'
    });
  }
});

/**
 * Import email into client communications
 * POST /api/clients/:clientId/communications/import
 */
router.post('/:clientId/communications/import', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user organization
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      with: { organization: true }
    });

    if (!user?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization membership required'
      });
    }

    // Validate email import data
    const importSchema = z.object({
      subject: z.string().min(1, "Subject is required"),
      fromEmail: z.string().email("Valid from email is required"),
      fromName: z.string().optional(),
      toEmails: z.array(z.string().email()).min(1, "At least one recipient is required"),
      ccEmails: z.array(z.string().email()).optional(),
      bccEmails: z.array(z.string().email()).optional(),
      htmlContent: z.string().optional(),
      textContent: z.string().optional(),
      direction: z.enum(['inbound', 'outbound', 'internal']),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      sentAt: z.string().optional(),
      receivedAt: z.string().optional(),
      emailId: z.string().optional(),
      threadId: z.string().optional(),
      messageId: z.string().optional(),
      inReplyTo: z.string().optional(),
      isSharedWithClient: z.boolean().optional(),
      assignedToUserId: z.number().optional()
    });

    const validationResult = importSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email data',
        errors: validationResult.error.errors
      });
    }

    const emailData = validationResult.data;

    // Verify client belongs to organization
    const client = await db.query.clients.findFirst({
      where: (clients, { and, eq }) => and(
        eq(clients.id, clientId),
        eq(clients.organizationId, user.organizationId)
      )
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Create communication record
    const newCommunication = await db
      .insert(clientCommunications)
      .values({
        clientId,
        organizationId: user.organizationId,
        subject: emailData.subject,
        fromEmail: emailData.fromEmail,
        fromName: emailData.fromName || null,
        toEmails: emailData.toEmails,
        ccEmails: emailData.ccEmails || null,
        bccEmails: emailData.bccEmails || null,
        htmlContent: emailData.htmlContent || null,
        textContent: emailData.textContent || null,
        direction: emailData.direction,
        priority: emailData.priority || 'normal',
        emailId: emailData.emailId || null,
        threadId: emailData.threadId || null,
        messageId: emailData.messageId || null,
        inReplyTo: emailData.inReplyTo || null,
        isSharedWithClient: emailData.isSharedWithClient || false,
        assignedToUserId: emailData.assignedToUserId || null,
        sentAt: emailData.sentAt ? new Date(emailData.sentAt) : null,
        receivedAt: emailData.receivedAt ? new Date(emailData.receivedAt) : null,
        createdByUserId: userId,
        status: 'unread'
      })
      .returning();

    return res.json({
      success: true,
      message: 'Email imported successfully',
      data: newCommunication[0]
    });

  } catch (error) {
    console.error('Error importing email:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while importing the email'
    });
  }
});

/**
 * Add comment to communication
 * POST /api/communications/:communicationId/comments
 */
router.post('/:communicationId/comments', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const communicationId = parseInt(req.params.communicationId);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user organization
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      with: { organization: true }
    });

    if (!user?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization membership required'
      });
    }

    // Validate comment data
    const commentSchema = z.object({
      content: z.string().min(1, "Comment content is required"),
      isInternal: z.boolean().optional()
    });

    const validationResult = commentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid comment data',
        errors: validationResult.error.errors
      });
    }

    // Verify communication exists and belongs to organization
    const communication = await db.query.clientCommunications.findFirst({
      where: (comms, { and, eq }) => and(
        eq(comms.id, communicationId),
        eq(comms.organizationId, user.organizationId)
      )
    });

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'Communication not found'
      });
    }

    // Create comment
    const newComment = await db
      .insert(communicationComments)
      .values({
        communicationId,
        userId,
        organizationId: user.organizationId,
        content: validationResult.data.content,
        isInternal: validationResult.data.isInternal ?? true
      })
      .returning();

    // Get comment with user details
    const commentWithUser = await db.query.communicationComments.findFirst({
      where: (comments, { eq }) => eq(comments.id, newComment[0].id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return res.json({
      success: true,
      message: 'Comment added successfully',
      data: commentWithUser
    });

  } catch (error) {
    console.error('Error adding comment:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while adding the comment'
    });
  }
});

/**
 * Update communication status
 * PATCH /api/communications/:communicationId
 */
router.patch('/:communicationId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const communicationId = parseInt(req.params.communicationId);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user organization
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      with: { organization: true }
    });

    if (!user?.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization membership required'
      });
    }

    // Validate update data
    const updateSchema = z.object({
      status: z.enum(['unread', 'read', 'replied', 'archived']).optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      assignedToUserId: z.number().nullable().optional(),
      isSharedWithClient: z.boolean().optional()
    });

    const validationResult = updateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid update data',
        errors: validationResult.error.errors
      });
    }

    // Verify communication exists and belongs to organization
    const communication = await db.query.clientCommunications.findFirst({
      where: (comms, { and, eq }) => and(
        eq(comms.id, communicationId),
        eq(comms.organizationId, user.organizationId)
      )
    });

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'Communication not found'
      });
    }

    // Update communication
    const updatedCommunication = await db
      .update(clientCommunications)
      .set({
        ...validationResult.data,
        updatedAt: new Date()
      })
      .where(eq(clientCommunications.id, communicationId))
      .returning();

    return res.json({
      success: true,
      message: 'Communication updated successfully',
      data: updatedCommunication[0]
    });

  } catch (error) {
    console.error('Error updating communication:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating the communication'
    });
  }
});

export default router;