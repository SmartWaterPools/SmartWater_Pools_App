import { google, gmail_v1 } from 'googleapis';

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

export async function getGmailClient(): Promise<gmail_v1.Gmail> {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function getGmailProfile(): Promise<gmail_v1.Schema$Profile | null> {
  try {
    const gmail = await getGmailClient();
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
  query?: string
): Promise<{ messages: gmail_v1.Schema$Message[]; nextPageToken?: string }> {
  const gmail = await getGmailClient();
  
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

export async function getGmailMessage(messageId: string): Promise<gmail_v1.Schema$Message | null> {
  try {
    const gmail = await getGmailClient();
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
  isHtml: boolean = false
): Promise<gmail_v1.Schema$Message | null> {
  try {
    const gmail = await getGmailClient();
    
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

    return response.data;
  } catch (error) {
    console.error('Failed to send Gmail message:', error);
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

export async function isGmailConnected(): Promise<boolean> {
  try {
    const profile = await getGmailProfile();
    return profile !== null && !!profile.emailAddress;
  } catch {
    return false;
  }
}
