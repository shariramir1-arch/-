#!/usr/bin/env node

/**
 * YouTube Video Uploader CLI
 *
 * Usage:
 *   node src/cli/upload.js --file "path/to/video.mp4" --title "My Video" \
 *     --description "desc" --tags "a,b,c" --privacyStatus "unlisted"
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { authorize } from '../lib/youtube-auth.js';
import { uploadToYouTube, logUpload } from '../lib/upload-to-youtube.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SECRETS_DIR = path.join(ROOT, 'secrets');
const DATA_DIR = path.join(ROOT, 'data');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
      args[key] = val;
      if (val !== 'true') i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.file) {
    console.error('Usage: node src/cli/upload.js --file <path> --title <title> [--description <desc>] [--tags <a,b,c>] [--privacyStatus <unlisted|private|public>]');
    process.exit(1);
  }

  if (!args.title) {
    // Derive title from filename
    args.title = path.basename(args.file, path.extname(args.file));
  }

  const privacyStatus = args.privacyStatus || 'unlisted';

  try {
    console.log('Authenticating with YouTube...');
    const auth = await authorize(SECRETS_DIR);

    const result = await uploadToYouTube(auth, {
      file: path.resolve(args.file),
      title: args.title,
      description: args.description || '',
      tags: args.tags || '',
      privacyStatus,
    });

    console.log('\n=== Upload Successful ===');
    console.log(`Video ID: ${result.videoId}`);
    console.log(`URL:      ${result.url}`);

    // Log to data/uploads.jsonl
    logUpload(DATA_DIR, {
      file: path.resolve(args.file),
      title: args.title,
      videoId: result.videoId,
      url: result.url,
      privacyStatus,
    });
    console.log(`Logged to data/uploads.jsonl`);

  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
}

main();
