import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

/**
 * Load client secrets from secrets/client_secret.json
 * Returns OAuth2 client ready for use.
 */
export function loadClientSecrets(secretsDir) {
  const secretPath = path.join(secretsDir, 'client_secret.json');

  if (!fs.existsSync(secretPath)) {
    throw new Error(
      `Missing ${secretPath}\n` +
      `Download OAuth 2.0 Client ID (Desktop app) from:\n` +
      `https://console.cloud.google.com/apis/credentials\n` +
      `Save it as: secrets/client_secret.json`
    );
  }

  const content = fs.readFileSync(secretPath, 'utf-8');
  let credentials;
  try {
    credentials = JSON.parse(content);
  } catch {
    throw new Error(
      `Invalid JSON in ${secretPath}.\n` +
      `Make sure the file is valid JSON (not .json.json double extension).`
    );
  }

  // Support both "installed" and "web" credential types
  const creds = credentials.installed || credentials.web;
  if (!creds) {
    throw new Error(
      `Invalid credential format in ${secretPath}.\n` +
      `Expected "installed" or "web" key. Download a Desktop app OAuth client.`
    );
  }

  return new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    creds.redirect_uris ? creds.redirect_uris[0] : 'urn:ietf:wg:oauth:2.0:oob'
  );
}

/**
 * Get or create a valid token for YouTube API.
 * If token.json exists and is valid, use it.
 * Otherwise, run interactive OAuth flow.
 */
export async function authorize(secretsDir) {
  const oauth2Client = loadClientSecrets(secretsDir);
  const tokenPath = path.join(secretsDir, 'token.json');

  // Try loading existing token
  if (fs.existsSync(tokenPath)) {
    try {
      const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
      oauth2Client.setCredentials(tokenData);

      // Check if token needs refresh
      if (tokenData.expiry_date && tokenData.expiry_date < Date.now()) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        fs.writeFileSync(tokenPath, JSON.stringify(credentials, null, 2));
      }

      return oauth2Client;
    } catch {
      // Token file is corrupt or expired, re-auth
    }
  }

  // Interactive OAuth flow
  return await getNewToken(oauth2Client, tokenPath);
}

/**
 * Interactive OAuth: print URL, user pastes code.
 */
async function getNewToken(oauth2Client, tokenPath) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n=== YouTube OAuth Authorization ===');
  console.log('Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\nAfter granting access, paste the authorization code below.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) => {
    rl.question('Authorization code: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Save token securely
  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
  console.log('Token saved to', tokenPath);

  return oauth2Client;
}
