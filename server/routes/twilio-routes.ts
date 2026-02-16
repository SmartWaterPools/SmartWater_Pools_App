import express, { Request, Response } from 'express';
import { twilioService } from '../twilio-service';
import { storage } from '../storage';
import { db } from '../db';
import { isAuthenticated } from '../auth';
import { type User, callLogs } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import twilio from 'twilio';

const router = express.Router();

router.get('/connection-status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const status = await twilioService.getConnectionStatus(user.organizationId);
    res.json(status);
  } catch (error) {
    console.error('Error checking Twilio connection status:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

const sendSMSSchema = z.object({
  to: z.string().min(10, 'Phone number is required'),
  message: z.string().min(1, 'Message is required').max(1600, 'Message too long'),
  clientId: z.number().optional(),
  maintenanceId: z.number().optional(),
  repairId: z.number().optional(),
  projectId: z.number().optional(),
  messageType: z.enum(['on_the_way', 'job_complete', 'reminder', 'verification', 'custom']).optional(),
});

router.post('/send-sms', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const validation = sendSMSSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors
      });
    }

    const { to, message, clientId, maintenanceId, repairId, projectId, messageType } = validation.data;

    const result = await twilioService.sendSMS(
      user.organizationId,
      to,
      message,
      {
        clientId,
        maintenanceId,
        repairId,
        projectId,
        messageType,
        sentBy: user.id,
      }
    );

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        externalId: result.externalId,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        messageId: result.messageId,
      });
    }
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

router.get('/messages', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ success: false, messages: [], error: 'Organization not found' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const messages = await twilioService.getMessages(user.organizationId, limit, offset);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching Twilio SMS messages:', error);
    res.status(500).json({ success: false, messages: [], error: 'Failed to fetch messages' });
  }
});

const initiateCallSchema = z.object({
  customerPhone: z.string().min(10, 'Customer phone number is required'),
  callerPhone: z.string().min(10, 'Caller phone number is required'),
  clientId: z.number().optional(),
  vendorId: z.number().optional(),
  projectId: z.number().optional(),
  notes: z.string().optional(),
});

router.post('/call', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const validation = initiateCallSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors
      });
    }

    const { customerPhone, callerPhone, clientId, vendorId, projectId, notes } = validation.data;

    const result = await twilioService.initiateCall(
      user.organizationId,
      user.id,
      callerPhone,
      customerPhone,
      { clientId, vendorId, projectId, notes }
    );

    if (result.success) {
      res.json({
        success: true,
        callLogId: result.callLogId,
        callSid: result.callSid,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error initiating Twilio call:', error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

router.get('/call-logs', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ success: false, callLogs: [], error: 'Organization not found' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await twilioService.getCallLogs(user.organizationId, limit, offset);
    res.json({ success: true, callLogs: logs });
  } catch (error) {
    console.error('Error fetching Twilio call logs:', error);
    res.status(500).json({ success: false, callLogs: [], error: 'Failed to fetch call logs' });
  }
});

router.post('/voice/connect', async (req: Request, res: Response) => {
  try {
    const customerPhone = req.query.customerPhone as string;

    if (!customerPhone) {
      res.status(400).send('Missing customerPhone parameter');
      return;
    }

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say({ voice: 'alice' }, 'Connecting you now.');
    twiml.dial(customerPhone);

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Error generating TwiML for voice connect:', error);
    res.status(500).send('Internal server error');
  }
});

router.post('/voice/status', async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;

    if (CallSid && CallStatus) {
      const statusMap: Record<string, string> = {
        'completed': 'completed',
        'busy': 'busy',
        'no-answer': 'no-answer',
        'failed': 'failed',
        'canceled': 'cancelled',
      };

      const mappedStatus = statusMap[CallStatus] || CallStatus;

      await twilioService.updateCallStatus(
        CallSid,
        mappedStatus,
        parseInt(CallDuration) || undefined
      );
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing Twilio voice status callback:', error);
    res.status(200).send('OK');
  }
});

router.post('/disconnect', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const result = await twilioService.disconnectProvider(user.organizationId);

    if (result) {
      res.json({ success: true, message: 'Twilio provider disconnected successfully' });
    } else {
      res.status(400).json({ success: false, error: 'No active Twilio provider found' });
    }
  } catch (error) {
    console.error('Error disconnecting Twilio provider:', error);
    res.status(500).json({ error: 'Failed to disconnect Twilio provider' });
  }
});

router.get('/call-logs/client/:clientId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    if (!user?.organizationId) {
      return res.status(400).json({ success: false, callLogs: [], error: 'Organization not found' });
    }
    const clientId = parseInt(req.params.clientId);
    const logs = await db.select()
      .from(callLogs)
      .where(and(
        eq(callLogs.organizationId, user.organizationId),
        eq(callLogs.clientId, clientId)
      ))
      .orderBy(desc(callLogs.createdAt))
      .limit(20);
    res.json({ success: true, callLogs: logs });
  } catch (error) {
    console.error('Error fetching client call logs:', error);
    res.status(500).json({ success: false, callLogs: [], error: 'Failed to fetch call logs' });
  }
});

export default router;
