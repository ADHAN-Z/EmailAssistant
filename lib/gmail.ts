// lib/gmail.ts - Updated with proper token management
import { google } from 'googleapis';
import { logger } from './logger';
import { prisma } from './prisma';

export interface GmailSyncOptions {
  maxEmails?: number;
  onlyUnread?: boolean;
}

export interface GmailMessage {
  id: string;
  snippet: string;
  content: string;
}

interface TokenInfo {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

/**
 * Get fresh tokens for a user, refreshing if necessary
 */
async function getFreshTokens(userId: string): Promise<TokenInfo> {
  const account = await prisma.account.findFirst({
    where: {
      userId: userId,
      provider: 'google'
    }
  });

  if (!account) {
    throw new Error('No Google account found for user');
  }

  if (!account.access_token || !account.refresh_token) {
    throw new Error('No valid tokens found for user');
  }

  const now = Date.now();
  const expiresAt = account.expires_at ? account.expires_at * 1000 : 0;
  const isExpired = now > (expiresAt - 5 * 60 * 1000);

  if (isExpired) {
    logger.info('Access token expired, refreshing...', { userId });
    
    try {
      const refreshedTokens = await refreshAccessToken(account.refresh_token);
      
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: refreshedTokens.access_token,
          expires_at: Math.floor(refreshedTokens.expires_at / 1000),
          ...(refreshedTokens.refresh_token && { refresh_token: refreshedTokens.refresh_token })
        }
      });

      return {
        access_token: refreshedTokens.access_token,
        refresh_token: refreshedTokens.refresh_token || account.refresh_token,
        expires_at: refreshedTokens.expires_at
      };
    } catch (error) {
      logger.error('Failed to refresh access token', error as Error, { userId });
      throw new Error('Failed to refresh access token');
    }
  }

  return {
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expires_at: account.expires_at ? account.expires_at * 1000 : undefined
  };
}

/**
 * Refresh an expired access token
 */
async function refreshAccessToken(refreshToken: string) {
  const url = "https://oauth2.googleapis.com/token";
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(url, {
    method: "POST",
    body: params,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
  }

  return {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in * 1000),
    refresh_token: data.refresh_token, // may be undefined if not rotating
  };
}

/**
 * Fetches recent emails from a user's Gmail account using stored tokens
 */
export async function syncGmailEmails(
  userId: string,
  options: GmailSyncOptions = {}
): Promise<GmailMessage[]> {
  const { maxEmails = 10, onlyUnread = true } = options;

  try {
    const tokens = await getFreshTokens(userId);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expires_at
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    logger.info('Fetching Gmail messages', { maxEmails, onlyUnread, userId });

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: maxEmails,
      q: onlyUnread ? 'is:unread' : undefined,
    });

    const messages = response.data.messages;

    if (!messages || messages.length === 0) {
      return [];
    }

    const emailPromises = messages.map(async (message) => {
      try {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
        });

        const messageData = msg.data;
        const payload = messageData.payload;
        let encodedBody = '';

        if (payload?.parts) {
          const part = payload.parts.find((part) => part.mimeType === 'text/plain');
          encodedBody = part?.body?.data || '';
        } else {
          encodedBody = payload?.body?.data || '';
        }

        const decodedBody = encodedBody 
          ? Buffer.from(encodedBody, 'base64').toString('utf-8')
          : messageData.snippet || '';

        return {
          id: messageData.id!,
          snippet: messageData.snippet!,
          content: decodedBody,
        };
      } catch (error) {
        logger.error(`Failed to fetch message ${message.id}`, error as Error, { userId });
        throw error;
      }
    });

    return await Promise.all(emailPromises);

  } catch (error) {
    logger.error('Error fetching emails from Gmail', error as Error, { userId });
    throw new Error('Failed to fetch Gmail emails.');
  }
}
