#!/usr/bin/env node

/**
 * Video Producer CLI (Scaffold)
 *
 * Future: auto-generate videos for a series/topic.
 * This is a placeholder that prepares the pipeline infrastructure.
 *
 * Usage:
 *   node src/cli/produce.js --topic "AI Tutorials" --count 3
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const VIDEOS_DIR = path.join(ROOT, 'videos');
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
  const topic = args.topic || 'Default Topic';
  const count = parseInt(args.count || '3', 10);

  console.log('=== Video Producer (Scaffold) ===');
  console.log(`Topic: ${topic}`);
  console.log(`Videos to produce: ${count}`);
  console.log(`Output directory: ${VIDEOS_DIR}`);
  console.log('');

  // Ensure directories exist
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Save series plan to data/series.json
  const seriesPath = path.join(DATA_DIR, 'series.json');
  let series = [];
  if (fs.existsSync(seriesPath)) {
    try {
      series = JSON.parse(fs.readFileSync(seriesPath, 'utf-8'));
    } catch {
      series = [];
    }
  }

  const newSeries = {
    id: `series_${Date.now()}`,
    topic,
    count,
    createdAt: new Date().toISOString(),
    status: 'planned',
    episodes: Array.from({ length: count }, (_, i) => ({
      episode: i + 1,
      title: `${topic} - Episode ${i + 1}`,
      status: 'pending',
      file: null,
    })),
  };

  series.push(newSeries);
  fs.writeFileSync(seriesPath, JSON.stringify(series, null, 2));

  console.log(`Series plan saved to ${seriesPath}`);
  console.log(`Series ID: ${newSeries.id}`);
  console.log('');
  console.log('Episodes planned:');
  newSeries.episodes.forEach((ep) => {
    console.log(`  ${ep.episode}. ${ep.title} [${ep.status}]`);
  });

  console.log('');
  console.log('TODO: Implement video generation pipeline.');
  console.log('Place generated .mp4 files in the videos/ directory,');
  console.log('then use "npm run approve" to review and upload them.');
}

main();
