import { google } from 'googleapis';

/**
 * Fetches recent emails from a user's Gmail account.
 * @param {string} accessToken The user's Google OAuth2 access token.
 * @returns {Promise<Array<{id: string, snippet: string, content: string}>>} A promise that resolves to an array of email objects.
 */
export async function syncGmailEmails(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth });

  try {
    // 1. Get a list of recent message IDs
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10, // Fetch the last 10 emails for now
      q: 'is:unread', // Optional: only fetch unread emails
    });

    const messages = response.data.messages;
    if (!messages || messages.length === 0) {
      console.log('No new messages found.');
      return [];
    }

    // 2. Fetch the full content of each message
    const emailPromises = messages.map(async (message) => {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });

      // 3. Decode the email body
      const payload = msg.data.payload;
      let encodedBody = '';
      if (payload.parts) {
        // Find the plain text part
        const part = payload.parts.find((part) => part.mimeType === 'text/plain');
        encodedBody = part?.body?.data || '';
      } else {
        encodedBody = payload.body?.data || '';
      }

      const decodedBody = Buffer.from(encodedBody, 'base64').toString('utf-8');

      return {
        id: msg.data.id,
        snippet: msg.data.snippet,
        content: decodedBody,
      };
    });

    const emails = await Promise.all(emailPromises);
    return emails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw new Error('Failed to fetch Gmail emails.');
  }
}