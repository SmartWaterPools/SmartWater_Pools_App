import { google, gmail_v1 } from 'googleapis';
import { storage } from '../storage';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export interface UserTokens {
  userId: number;
  gmailAccessToken?: string | null;
  gmailRefreshToken?: string | null;
  gmailTokenExpiresAt?: Date | null;
  gmailConnectedEmail?: string | null;
}

async function refreshUserAccessToken(userId: number, refreshToken: string): Promise<string> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth not configured');
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  
  await storage.updateUser(userId, {
    gmailAccessToken: credentials.access_token,
    gmailTokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null
  });

  return credentials.access_token!;
}

async function getUserAccessToken(userTokens: UserTokens): Promise<string> {
  if (!userTokens.gmailAccessToken) {
    throw new Error('No Gmail access token available');
  }

  if (userTokens.gmailTokenExpiresAt && new Date(userTokens.gmailTokenExpiresAt).getTime() < Date.now()) {
    if (userTokens.gmailRefreshToken) {
      console.log('Gmail token expired, refreshing...');
      return refreshUserAccessToken(userTokens.userId, userTokens.gmailRefreshToken);
    }
    throw new Error('Gmail token expired and no refresh token available');
  }

  return userTokens.gmailAccessToken;
}

export async function getGmailClient(userTokens?: UserTokens): Promise<gmail_v1.Gmail> {
  if (!userTokens || !userTokens.gmailAccessToken) {
    throw new Error('Gmail not connected. Please connect your Gmail account in Settings to use email features.');
  }
  
  const accessToken = await getUserAccessToken(userTokens);

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function getGmailProfile(userTokens?: UserTokens): Promise<gmail_v1.Schema$Profile | null> {
  try {
    const gmail = await getGmailClient(userTokens);
    const response = await gmail.users.getProfile({ userId: 'me' });
    return response.data;
  } catch (error) {
    console.error('Failed to get Gmail profile:', error);
    return null;
  }
}

export async function listGmailMessages(
  maxResults: number = 50,
  pageToken?: string,
  query?: string,
  userTokens?: UserTokens
): Promise<{ messages: gmail_v1.Schema$Message[]; nextPageToken?: string }> {
  const gmail = await getGmailClient(userTokens);
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    pageToken,
    q: query
  });

  const messages: gmail_v1.Schema$Message[] = [];
  
  if (response.data.messages) {
    for (const msg of response.data.messages) {
      if (msg.id) {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });
        messages.push(fullMessage.data);
      }
    }
  }

  return {
    messages,
    nextPageToken: response.data.nextPageToken || undefined
  };
}

export async function getGmailMessage(messageId: string, userTokens?: UserTokens): Promise<gmail_v1.Schema$Message | null> {
  try {
    const gmail = await getGmailClient(userTokens);
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get Gmail message:', error);
    return null;
  }
}

export async function sendGmailMessage(
  to: string,
  subject: string,
  body: string,
  isHtml: boolean = false,
  userTokens?: UserTokens
): Promise<gmail_v1.Schema$Message | null> {
  try {
    console.log(`[Gmail Send] Sending email to: ${to}, subject: ${subject.substring(0, 50)}...`);
    const gmail = await getGmailClient(userTokens);
    
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=utf-8`,
      '',
      body
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log(`[Gmail Send] Email sent successfully, messageId: ${response.data.id}`);
    return response.data;
  } catch (error) {
    console.error('[Gmail Send] Failed to send Gmail message:', error);
    return null;
  }
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  if (!headers) return '';
  const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function getEmailBody(payload: gmail_v1.Schema$MessagePart | undefined): { text: string; html: string } {
  let text = '';
  let html = '';

  if (!payload) return { text, html };

  function extractParts(part: gmail_v1.Schema$MessagePart) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      html = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.parts) {
      for (const subpart of part.parts) {
        extractParts(subpart);
      }
    }
  }

  extractParts(payload);
  return { text, html };
}

export function parseGmailMessage(message: gmail_v1.Schema$Message) {
  const headers = message.payload?.headers;
  const { text, html } = getEmailBody(message.payload);

  return {
    externalId: message.id || '',
    threadId: message.threadId || null,
    subject: getHeader(headers, 'Subject'),
    fromEmail: getHeader(headers, 'From'),
    toEmail: getHeader(headers, 'To'),
    ccEmail: getHeader(headers, 'Cc') || null,
    bccEmail: getHeader(headers, 'Bcc') || null,
    bodyText: text,
    bodyHtml: html || null,
    receivedAt: message.internalDate 
      ? new Date(parseInt(message.internalDate)) 
      : new Date(),
    isRead: !message.labelIds?.includes('UNREAD'),
    isStarred: message.labelIds?.includes('STARRED') || false,
    labels: message.labelIds || [],
    hasAttachments: message.payload?.parts?.some(p => p.filename && p.filename.length > 0) || false
  };
}

export async function isGmailConnected(userTokens?: UserTokens): Promise<boolean> {
  try {
    const profile = await getGmailProfile(userTokens);
    return profile !== null && !!profile.emailAddress;
  } catch {
    return false;
  }
}

export async function downloadGmailAttachment(
  messageId: string,
  attachmentId: string,
  userTokens?: UserTokens
): Promise<Buffer> {
  console.log(`[Gmail] Downloading attachment: messageId=${messageId}, attachmentId=${attachmentId.substring(0, 30)}...`);
  
  const gmail = await getGmailClient(userTokens);
  
  const response = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId,
  });
  
  if (!response.data.data) {
    throw new Error('Gmail API returned empty attachment data');
  }
  
  // Gmail returns base64url encoding - convert to standard base64
  let base64Data = response.data.data.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed (base64 must be multiple of 4)
  const paddingNeeded = (4 - (base64Data.length % 4)) % 4;
  base64Data += '='.repeat(paddingNeeded);
  
  const buffer = Buffer.from(base64Data, 'base64');
  
  console.log(`[Gmail] Downloaded attachment: ${buffer.length} bytes`);
  
  // Validate that we got a proper PDF
  const header = buffer.slice(0, 5).toString('ascii');
  if (!header.startsWith('%PDF')) {
    console.error(`[Gmail] WARNING: Attachment doesn't appear to be a valid PDF. Header: ${header}`);
  }
  
  return buffer;
}
