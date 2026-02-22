#!/usr/bin/env node

/**
 * Video Approval Server
 *
 * Serves a UI at http://localhost:3000 to approve/reject videos.
 * On approve: moves file to approved/, uploads to YouTube (unlisted).
 * On reject: moves file to rejected/.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authorize } from './lib/youtube-auth.js';
import { uploadToYouTube, logUpload } from './lib/upload-to-youtube.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VIDEOS_DIR = path.join(ROOT, 'videos');
const APPROVED_DIR = path.join(ROOT, 'approved');
const REJECTED_DIR = path.join(ROOT, 'rejected');
const SECRETS_DIR = path.join(ROOT, 'secrets');
const DATA_DIR = path.join(ROOT, 'data');

// Ensure directories exist
[VIDEOS_DIR, APPROVED_DIR, REJECTED_DIR, DATA_DIR].forEach(dir =>
  fs.mkdirSync(dir, { recursive: true })
);

const app = express();
app.use(express.json());

// Serve video files for preview
app.use('/video-files', express.static(VIDEOS_DIR));

// ---------- API ----------

// GET /api/videos — list pending videos
app.get('/api/videos', (_req, res) => {
  try {
    const files = fs.readdirSync(VIDEOS_DIR)
      .filter(f => /\.(mp4|mov|avi|mkv|webm)$/i.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(VIDEOS_DIR, f));
        return {
          name: f,
          size: stat.size,
          sizeMB: (stat.size / 1024 / 1024).toFixed(1),
          created: stat.birthtime || stat.ctime,
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    res.json({ videos: files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/approve — approve + upload to YouTube
app.post('/api/approve', async (req, res) => {
  const { filename, title, description, tags } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'Missing filename' });
  }

  const srcPath = path.join(VIDEOS_DIR, filename);
  if (!fs.existsSync(srcPath)) {
    return res.status(404).json({ error: `File not found: ${filename}` });
  }

  // Generate unique destination name
  let destName = filename;
  let destPath = path.join(APPROVED_DIR, destName);
  if (fs.existsSync(destPath)) {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    destName = `${base}_${Date.now()}${ext}`;
    destPath = path.join(APPROVED_DIR, destName);
  }

  try {
    // 1. Move to approved/
    fs.renameSync(srcPath, destPath);
    console.log(`Moved: ${filename} -> approved/${destName}`);

    // 2. Upload to YouTube
    const videoTitle = title || path.basename(filename, path.extname(filename));
    let uploadResult = null;
    let uploadError = null;

    try {
      const auth = await authorize(SECRETS_DIR);
      uploadResult = await uploadToYouTube(auth, {
        file: destPath,
        title: videoTitle,
        description: description || '',
        tags: tags || '',
        privacyStatus: 'unlisted',
      });

      // 3. Log upload
      logUpload(DATA_DIR, {
        file: destPath,
        title: videoTitle,
        videoId: uploadResult.videoId,
        url: uploadResult.url,
        privacyStatus: 'unlisted',
      });

      console.log(`Uploaded: ${uploadResult.url}`);
    } catch (err) {
      uploadError = err.message;
      console.error(`Upload failed: ${uploadError}`);
    }

    res.json({
      success: true,
      filename: destName,
      approved: true,
      upload: uploadResult
        ? { videoId: uploadResult.videoId, url: uploadResult.url }
        : null,
      uploadError,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reject — reject, no upload
app.post('/api/reject', (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'Missing filename' });
  }

  const srcPath = path.join(VIDEOS_DIR, filename);
  if (!fs.existsSync(srcPath)) {
    return res.status(404).json({ error: `File not found: ${filename}` });
  }

  try {
    let destName = filename;
    let destPath = path.join(REJECTED_DIR, destName);
    if (fs.existsSync(destPath)) {
      const ext = path.extname(filename);
      const base = path.basename(filename, ext);
      destName = `${base}_${Date.now()}${ext}`;
      destPath = path.join(REJECTED_DIR, destName);
    }

    fs.renameSync(srcPath, destPath);
    console.log(`Rejected: ${filename} -> rejected/${destName}`);

    res.json({ success: true, filename: destName, rejected: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/uploads — view upload history
app.get('/api/uploads', (_req, res) => {
  const logPath = path.join(DATA_DIR, 'uploads.jsonl');
  if (!fs.existsSync(logPath)) {
    return res.json({ uploads: [] });
  }
  try {
    const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n').filter(Boolean);
    const uploads = lines.map(l => JSON.parse(l)).reverse();
    res.json({ uploads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- UI ----------

app.get('/', (_req, res) => {
  res.send(getHTML());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n=== Video Approval Server ===`);
  console.log(`UI: http://localhost:${PORT}`);
  console.log(`Videos dir: ${VIDEOS_DIR}`);
  console.log(`\nWaiting for videos to approve...\n`);
});

// ---------- HTML UI ----------

function getHTML() {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Approve Videos</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a; color: #e2e8f0; padding: 20px;
    }
    h1 { text-align: center; margin-bottom: 24px; color: #c5a059; font-size: 28px; }
    .container { max-width: 900px; margin: 0 auto; }
    .empty {
      text-align: center; padding: 60px 20px; color: #64748b;
      border: 2px dashed #1e293b; border-radius: 12px; margin: 20px 0;
    }
    .empty p { font-size: 18px; margin-bottom: 8px; }
    .video-card {
      background: #1e293b; border-radius: 12px; padding: 20px;
      margin-bottom: 16px; border: 1px solid #334155;
    }
    .video-card h3 { color: #f1f5f9; margin-bottom: 8px; }
    .video-meta { color: #94a3b8; font-size: 14px; margin-bottom: 12px; }
    .video-preview {
      width: 100%; max-height: 400px; border-radius: 8px;
      background: #000; margin-bottom: 12px;
    }
    .input-row { margin-bottom: 10px; }
    .input-row label { display: block; font-size: 13px; color: #94a3b8; margin-bottom: 4px; }
    .input-row input {
      width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid #334155;
      background: #0f172a; color: #e2e8f0; font-size: 14px;
    }
    .btn-row { display: flex; gap: 12px; margin-top: 14px; }
    .btn {
      flex: 1; padding: 12px; border: none; border-radius: 8px; font-size: 16px;
      font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-approve { background: #16a34a; color: #fff; }
    .btn-approve:hover:not(:disabled) { background: #15803d; }
    .btn-reject { background: #dc2626; color: #fff; }
    .btn-reject:hover:not(:disabled) { background: #b91c1c; }
    .result {
      margin-top: 12px; padding: 12px; border-radius: 8px; font-size: 14px;
    }
    .result.success { background: #052e16; border: 1px solid #16a34a; color: #4ade80; }
    .result.error { background: #350a0a; border: 1px solid #dc2626; color: #fca5a5; }
    .result.rejected { background: #1c1917; border: 1px solid #78716c; color: #d6d3d1; }
    .result a { color: #c5a059; text-decoration: underline; }
    .refresh-btn {
      display: block; margin: 0 auto 20px; padding: 8px 20px;
      background: #334155; color: #e2e8f0; border: none; border-radius: 6px;
      cursor: pointer; font-size: 14px;
    }
    .refresh-btn:hover { background: #475569; }
    .history { margin-top: 40px; }
    .history h2 { color: #c5a059; margin-bottom: 12px; font-size: 20px; }
    .history-item {
      background: #1e293b; padding: 10px 14px; border-radius: 8px;
      margin-bottom: 8px; font-size: 13px; border: 1px solid #334155;
    }
    .history-item a { color: #c5a059; }
    .spinner {
      display: inline-block; width: 16px; height: 16px;
      border: 2px solid #ffffff40; border-top-color: #fff;
      border-radius: 50%; animation: spin 0.6s linear infinite;
      margin-left: 8px; vertical-align: middle;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <h1>Approve Videos</h1>
    <button class="refresh-btn" onclick="loadVideos()">Refresh</button>
    <div id="videos"></div>
    <div class="history" id="history-section" style="display:none">
      <h2>Upload History</h2>
      <div id="history"></div>
    </div>
  </div>
  <script>
    async function loadVideos() {
      const res = await fetch('/api/videos');
      const data = await res.json();
      const container = document.getElementById('videos');

      if (!data.videos || data.videos.length === 0) {
        container.innerHTML = '<div class="empty"><p>No videos waiting for approval</p><p style="font-size:14px">Place .mp4 files in the <code>videos/</code> folder</p></div>';
        loadHistory();
        return;
      }

      container.innerHTML = data.videos.map(v => \`
        <div class="video-card" id="card-\${v.name.replace(/[^a-zA-Z0-9]/g,'_')}">
          <h3>\${v.name}</h3>
          <div class="video-meta">\${v.sizeMB} MB | \${new Date(v.created).toLocaleString('he-IL')}</div>
          <video class="video-preview" controls preload="metadata">
            <source src="/video-files/\${encodeURIComponent(v.name)}" type="video/mp4">
          </video>
          <div class="input-row">
            <label>Title (YouTube)</label>
            <input type="text" id="title-\${v.name.replace(/[^a-zA-Z0-9]/g,'_')}" value="\${v.name.replace(/\\.[^.]+$/, '')}" />
          </div>
          <div class="input-row">
            <label>Description</label>
            <input type="text" id="desc-\${v.name.replace(/[^a-zA-Z0-9]/g,'_')}" placeholder="Video description..." />
          </div>
          <div class="input-row">
            <label>Tags (comma-separated)</label>
            <input type="text" id="tags-\${v.name.replace(/[^a-zA-Z0-9]/g,'_')}" placeholder="tag1, tag2, tag3" />
          </div>
          <div class="btn-row">
            <button class="btn btn-approve" onclick="approve('\${v.name}')">
              Approve & Upload
            </button>
            <button class="btn btn-reject" onclick="reject('\${v.name}')">
              Reject
            </button>
          </div>
          <div id="result-\${v.name.replace(/[^a-zA-Z0-9]/g,'_')}"></div>
        </div>
      \`).join('');

      loadHistory();
    }

    async function approve(filename) {
      const safe = filename.replace(/[^a-zA-Z0-9]/g, '_');
      const titleEl = document.getElementById('title-' + safe);
      const descEl = document.getElementById('desc-' + safe);
      const tagsEl = document.getElementById('tags-' + safe);
      const resultEl = document.getElementById('result-' + safe);
      const card = document.getElementById('card-' + safe);

      // Disable buttons
      card.querySelectorAll('.btn').forEach(b => b.disabled = true);
      resultEl.innerHTML = '<div class="result success">Uploading to YouTube... <span class="spinner"></span></div>';

      try {
        const res = await fetch('/api/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename,
            title: titleEl?.value || '',
            description: descEl?.value || '',
            tags: tagsEl?.value || '',
          }),
        });
        const data = await res.json();

        if (data.upload) {
          resultEl.innerHTML = \`<div class="result success">
            Approved & uploaded!<br>
            Video ID: \${data.upload.videoId}<br>
            <a href="\${data.upload.url}" target="_blank">\${data.upload.url}</a>
          </div>\`;
        } else if (data.uploadError) {
          resultEl.innerHTML = \`<div class="result error">
            Approved (moved to approved/).<br>
            Upload failed: \${data.uploadError}
          </div>\`;
        } else {
          resultEl.innerHTML = '<div class="result success">Approved (moved to approved/)</div>';
        }
      } catch (err) {
        resultEl.innerHTML = \`<div class="result error">Error: \${err.message}</div>\`;
      }

      setTimeout(loadHistory, 500);
    }

    async function reject(filename) {
      const safe = filename.replace(/[^a-zA-Z0-9]/g, '_');
      const resultEl = document.getElementById('result-' + safe);
      const card = document.getElementById('card-' + safe);

      card.querySelectorAll('.btn').forEach(b => b.disabled = true);

      try {
        const res = await fetch('/api/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename }),
        });
        const data = await res.json();
        resultEl.innerHTML = '<div class="result rejected">Rejected and moved to rejected/</div>';
      } catch (err) {
        resultEl.innerHTML = \`<div class="result error">Error: \${err.message}</div>\`;
      }

      setTimeout(() => loadVideos(), 1500);
    }

    async function loadHistory() {
      try {
        const res = await fetch('/api/uploads');
        const data = await res.json();
        const section = document.getElementById('history-section');
        const container = document.getElementById('history');

        if (data.uploads && data.uploads.length > 0) {
          section.style.display = 'block';
          container.innerHTML = data.uploads.map(u => \`
            <div class="history-item">
              <strong>\${u.title}</strong> |
              <a href="\${u.url}" target="_blank">\${u.videoId}</a> |
              \${u.privacyStatus} |
              \${new Date(u.timestamp).toLocaleString('he-IL')}
            </div>
          \`).join('');
        } else {
          section.style.display = 'none';
        }
      } catch {}
    }

    loadVideos();
    setInterval(loadVideos, 15000);
  </script>
</body>
</html>`;
}
