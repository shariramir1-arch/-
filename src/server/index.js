import express from "express";
import { readdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join, relative } from "path";
import cors from "cors";
import open from "open";
import { publish } from "../cli/publish.js";

const PORT = 3210;
const DATA_DIR = join(process.cwd(), "data", "weeks");

const app = express();
app.use(cors());
app.use(express.json());

// Serve video files statically
app.use("/videos", express.static(DATA_DIR));

// Collect all video folders with draft.mp4
function collectVideos() {
  const videos = [];
  if (!existsSync(DATA_DIR)) return videos;

  for (const week of readdirSync(DATA_DIR, { withFileTypes: true })) {
    if (!week.isDirectory()) continue;
    const weekDir = join(DATA_DIR, week.name);

    for (const topic of readdirSync(weekDir, { withFileTypes: true })) {
      if (!topic.isDirectory()) continue;
      const topicDir = join(weekDir, topic.name);

      for (const vid of readdirSync(topicDir, { withFileTypes: true })) {
        if (!vid.isDirectory()) continue;
        const videoDir = join(topicDir, vid.name);
        const draftPath = join(videoDir, "draft.mp4");
        const metaPath = join(videoDir, "meta.json");

        if (!existsSync(draftPath)) continue;

        const meta = existsSync(metaPath)
          ? JSON.parse(readFileSync(metaPath, "utf-8"))
          : { status: "UNKNOWN" };

        const relPath = relative(DATA_DIR, videoDir).replace(/\\/g, "/");

        videos.push({
          week: week.name,
          topic: topic.name,
          videoId: vid.name,
          relPath,
          videoUrl: `/videos/${relPath}/draft.mp4`,
          meta,
        });
      }
    }
  }
  return videos;
}

// API: list all videos
app.get("/api/videos", (req, res) => {
  res.json(collectVideos());
});

// API: approve a video
app.post("/api/videos/:week/:topic/:videoId/approve", (req, res) => {
  const { week, topic, videoId } = req.params;
  const videoDir = join(DATA_DIR, week, topic, videoId);
  const metaPath = join(videoDir, "meta.json");

  if (!existsSync(metaPath)) {
    return res.status(404).json({ error: "Video not found" });
  }

  const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
  meta.status = "APPROVED";
  meta.updatedAt = new Date().toISOString();
  writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");

  // Run publish
  publish(videoDir);

  const updatedMeta = JSON.parse(readFileSync(metaPath, "utf-8"));
  res.json({ message: "Approved and published", meta: updatedMeta });
});

// API: reject a video
app.post("/api/videos/:week/:topic/:videoId/reject", (req, res) => {
  const { week, topic, videoId } = req.params;
  const videoDir = join(DATA_DIR, week, topic, videoId);
  const metaPath = join(videoDir, "meta.json");

  if (!existsSync(metaPath)) {
    return res.status(404).json({ error: "Video not found" });
  }

  const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
  meta.status = "REJECTED";
  meta.updatedAt = new Date().toISOString();
  writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");

  res.json({ message: "Rejected", meta });
});

// HTML dashboard
app.get("/", (req, res) => {
  const videos = collectVideos();

  const videoCards = videos
    .map(
      (v) => `
    <div class="card" data-status="${v.meta.status}">
      <h3>${v.meta.title || v.videoId}</h3>
      <p class="info">Week: ${v.week} | Topic: ${v.topic} | Status:
        <span class="status status-${v.meta.status}">${v.meta.status}</span>
      </p>
      <video width="480" controls>
        <source src="${v.videoUrl}" type="video/mp4">
      </video>
      <div class="actions">
        <button class="btn approve" onclick="action('${v.week}','${v.topic}','${v.videoId}','approve')">
          Approve
        </button>
        <button class="btn reject" onclick="action('${v.week}','${v.topic}','${v.videoId}','reject')">
          Reject
        </button>
      </div>
      ${v.meta.uploadUrl ? `<p class="upload-url">Uploaded: <a href="${v.meta.uploadUrl}" target="_blank">${v.meta.uploadUrl}</a></p>` : ""}
    </div>`
    )
    .join("\n");

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auto Video System — Review</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f0f23; color: #e0e0e0; padding: 2rem; }
    h1 { margin-bottom: 1.5rem; color: #fff; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(520px, 1fr)); gap: 1.5rem; }
    .card { background: #1a1a2e; border-radius: 12px; padding: 1.5rem; border: 1px solid #333; }
    .card h3 { margin-bottom: 0.5rem; }
    .info { color: #999; font-size: 0.9rem; margin-bottom: 0.75rem; }
    video { border-radius: 8px; margin-bottom: 0.75rem; max-width: 100%; }
    .actions { display: flex; gap: 0.75rem; }
    .btn { padding: 0.5rem 1.5rem; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 600; }
    .btn.approve { background: #22c55e; color: #000; }
    .btn.approve:hover { background: #16a34a; }
    .btn.reject { background: #ef4444; color: #fff; }
    .btn.reject:hover { background: #dc2626; }
    .status { font-weight: 700; }
    .status-NEEDS_REVIEW { color: #f59e0b; }
    .status-APPROVED { color: #22c55e; }
    .status-REJECTED { color: #ef4444; }
    .status-UPLOADED { color: #3b82f6; }
    .upload-url { margin-top: 0.75rem; font-size: 0.85rem; color: #3b82f6; }
    .upload-url a { color: #60a5fa; }
    .empty { text-align: center; padding: 4rem; color: #666; }
  </style>
</head>
<body>
  <h1>Auto Video System — Review Dashboard</h1>
  ${videos.length > 0 ? `<div class="grid">${videoCards}</div>` : '<div class="empty"><p>No videos found. Run <code>npm run produce</code> first.</p></div>'}
  <script>
    async function action(week, topic, videoId, type) {
      const res = await fetch(\`/api/videos/\${week}/\${topic}/\${videoId}/\${type}\`, { method: 'POST' });
      const data = await res.json();
      alert(data.message + (data.meta.uploadUrl ? '\\nURL: ' + data.meta.uploadUrl : ''));
      location.reload();
    }
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`Review server running at http://localhost:${PORT}`);
  open(`http://localhost:${PORT}`).catch(() => {});
});
