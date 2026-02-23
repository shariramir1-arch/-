'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

// --- Paths ---
const ROOT = path.resolve(__dirname, '..', '..');
const SECRETS_DIR = path.join(ROOT, 'secrets');
const CLIENT_SECRET_PATH = path.join(SECRETS_DIR, 'client_secret.json');
const TOKEN_PATH = path.join(SECRETS_DIR, 'token.json');

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

// --- CLI arg parsing ---
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '';
      args[key] = val;
      if (val) i++;
    }
  }
  return args;
}

// --- Helpers ---
function loadClientCredentials() {
  if (!fs.existsSync(CLIENT_SECRET_PATH)) {
    console.error('שגיאה: קובץ credentials לא נמצא ב-' + CLIENT_SECRET_PATH);
    console.error('יש להוריד את הקובץ מ-Google Cloud Console ולשמור אותו בתיקיית secrets/');
    process.exit(1);
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf8'));
  } catch (e) {
    console.error('שגיאה: הקובץ client_secret.json אינו JSON תקין.');
    process.exit(1);
  }

  // Support both "installed" and "web" credential shapes
  const creds = raw.installed || raw.web;
  if (!creds || !creds.client_id || !creds.client_secret) {
    console.error('שגיאה: מבנה לא תקין של client_secret.json — חסרים client_id או client_secret.');
    process.exit(1);
  }

  return creds;
}

function askQuestion(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function authorize() {
  const creds = loadClientCredentials();
  const oauth2Client = new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    creds.redirect_uris ? creds.redirect_uris[0] : 'urn:ietf:wg:oauth:2.0:oob'
  );

  // Try to load existing token
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oauth2Client.setCredentials(token);

      // Check if token needs refresh
      if (token.expiry_date && token.expiry_date < Date.now() && token.refresh_token) {
        console.log('טוקן פג תוקף, מרענן...');
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2), 'utf8');
        console.log('טוקן חודש בהצלחה.');
      }

      return oauth2Client;
    } catch (e) {
      console.log('טוקן שמור לא תקין, מתחיל אימות מחדש...');
    }
  }

  // Interactive OAuth flow
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n===== אימות YouTube OAuth2 =====');
  console.log('פתח את הקישור הבא בדפדפן:');
  console.log(authUrl);
  console.log('=================================\n');

  const code = await askQuestion('הדבק כאן את קוד האישור: ');
  if (!code) {
    console.error('שגיאה: לא הוזן קוד אישור.');
    process.exit(1);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf8');
    console.log('טוקן נשמר בהצלחה ב-secrets/token.json');
    return oauth2Client;
  } catch (e) {
    console.error('שגיאה בקבלת טוקן:', e.message);
    process.exit(1);
  }
}

async function uploadVideo(auth, filePath, title, description, tags, privacyStatus) {
  const youtube = google.youtube({ version: 'v3', auth });

  const fileSize = fs.statSync(filePath).size;
  console.log(`מעלה את "${path.basename(filePath)}" (${(fileSize / 1024 / 1024).toFixed(1)} MB)...`);

  const res = await youtube.videos.insert({
    part: 'snippet,status',
    requestBody: {
      snippet: {
        title: title,
        description: description,
        tags: tags.length ? tags : undefined,
      },
      status: {
        privacyStatus: privacyStatus,
      },
    },
    media: {
      body: fs.createReadStream(filePath),
    },
  });

  return res.data;
}

function handleApiError(err) {
  if (!err.response) {
    console.error('שגיאת רשת:', err.message);
    return;
  }

  const status = err.response.status;
  const data = err.response.data;
  const errorReason = data && data.error && data.error.errors && data.error.errors[0]
    ? data.error.errors[0].reason
    : '';

  switch (status) {
    case 401:
      console.error('שגיאה 401: הטוקן פג תוקף או לא תקין. מחק את secrets/token.json והרץ שוב.');
      break;
    case 403:
      if (errorReason === 'quotaExceeded') {
        console.error('שגיאה 403: חריגה ממכסת ה-API היומית של YouTube. נסה שוב מחר.');
      } else if (errorReason === 'forbidden') {
        console.error('שגיאה 403: אין הרשאה. ודא ש-YouTube Data API v3 מופעל ב-Google Cloud Console.');
      } else {
        console.error('שגיאה 403:', data.error ? data.error.message : 'גישה נדחתה.');
      }
      break;
    case 404:
      console.error('שגיאה 404: API endpoint לא נמצא. ודא ש-YouTube Data API v3 מופעל.');
      break;
    default:
      console.error(`שגיאת API (${status}):`, data.error ? data.error.message : err.message);
  }
}

// --- Main ---
async function main() {
  const args = parseArgs(process.argv);

  if (!args.file) {
    console.error('שגיאה: חובה לציין --file <path>');
    console.error('שימוש: node src/cli/upload.js --file "videos/test.mp4" --title "כותרת" [--description "..."] [--tags "tag1,tag2"] [--privacyStatus unlisted|public|private]');
    process.exit(1);
  }

  const filePath = path.resolve(ROOT, args.file);
  if (!fs.existsSync(filePath)) {
    console.error('שגיאה: הקובץ לא נמצא — ' + filePath);
    process.exit(1);
  }

  const title = args.title || path.basename(filePath, path.extname(filePath));
  const description = args.description || '';
  const tags = args.tags ? args.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const privacyStatus = args.privacyStatus || 'unlisted';

  if (!['public', 'private', 'unlisted'].includes(privacyStatus)) {
    console.error('שגיאה: privacyStatus חייב להיות public, private או unlisted.');
    process.exit(1);
  }

  try {
    const auth = await authorize();
    const video = await uploadVideo(auth, filePath, title, description, tags, privacyStatus);
    console.log('\n✓ הסרטון הועלה בהצלחה!');
    console.log('  Video ID: ' + video.id);
    console.log('  URL: https://youtu.be/' + video.id);
    console.log('  סטטוס: ' + video.status.privacyStatus);
  } catch (err) {
    handleApiError(err);
    process.exit(1);
  }
}

// Allow importing authorize + uploadVideo for use in other modules (e.g. approve UI)
module.exports = { authorize, uploadVideo, parseArgs };

// Run if called directly
if (require.main === module) {
  main();
}
