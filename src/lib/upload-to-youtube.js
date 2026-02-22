import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

/**
 * Upload a video to YouTube.
 *
 * @param {OAuth2Client} auth - Authenticated OAuth2 client
 * @param {object} opts
 * @param {string} opts.file - Path to the video file
 * @param {string} opts.title - Video title
 * @param {string} [opts.description] - Video description
 * @param {string} [opts.tags] - Comma-separated tags
 * @param {string} [opts.privacyStatus] - "unlisted" | "private" | "public"
 * @returns {Promise<{videoId: string, url: string}>}
 */
export async function uploadToYouTube(auth, opts) {
  const {
    file,
    title,
    description = '',
    tags = '',
    privacyStatus = 'unlisted',
  } = opts;

  if (!fs.existsSync(file)) {
    throw new Error(`Video file not found: ${file}`);
  }

  const youtube = google.youtube({ version: 'v3', auth });

  const fileSize = fs.statSync(file).size;
  console.log(`Uploading: ${path.basename(file)} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`Title: ${title}`);
  console.log(`Privacy: ${privacyStatus}`);

  let response;
  try {
    response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title,
          description,
          tags: tags ? tags.split(',').map(t => t.trim()) : [],
        },
        status: {
          privacyStatus,
        },
      },
      media: {
        body: fs.createReadStream(file),
      },
    });
  } catch (err) {
    handleYouTubeError(err);
  }

  const videoId = response.data.id;
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  return { videoId, url };
}

/**
 * Log upload result to data/uploads.jsonl
 */
export function logUpload(dataDir, entry) {
  const logPath = path.join(dataDir, 'uploads.jsonl');
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry,
  });
  fs.appendFileSync(logPath, line + '\n');
}

/**
 * Handle YouTube API errors with clear messages
 */
function handleYouTubeError(err) {
  const status = err?.response?.status || err?.code;
  const message = err?.response?.data?.error?.message || err.message;

  if (status === 401) {
    throw new Error(
      `Authentication failed (401). Your token may be expired.\n` +
      `Delete secrets/token.json and run again to re-authenticate.`
    );
  }

  if (status === 403) {
    if (message.includes('quotaExceeded')) {
      throw new Error(
        `YouTube API quota exceeded (403).\n` +
        `Daily upload quota resets at midnight Pacific Time.\n` +
        `Check your quota: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas`
      );
    }
    if (message.includes('youtubeSignupRequired')) {
      throw new Error(
        `The authenticated Google account doesn't have a YouTube channel.\n` +
        `Create a channel at: https://www.youtube.com/create_channel`
      );
    }
    throw new Error(
      `YouTube API access denied (403): ${message}\n` +
      `Make sure YouTube Data API v3 is enabled:\n` +
      `https://console.cloud.google.com/apis/library/youtube.googleapis.com`
    );
  }

  if (status === 404) {
    throw new Error(
      `YouTube API not found (404). Enable YouTube Data API v3:\n` +
      `https://console.cloud.google.com/apis/library/youtube.googleapis.com`
    );
  }

  throw new Error(`YouTube upload failed: ${message}`);
}
