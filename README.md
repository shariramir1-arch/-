<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Auto Video System

End-to-end system: video approval UI + automatic YouTube upload (unlisted).

## Quick Start

```bash
npm install
npm run approve
# Open http://localhost:3000
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run approve` | Start approval server at http://localhost:3000 |
| `npm run upload -- --file "video.mp4" --title "Title"` | Upload video to YouTube directly |
| `npm run produce -- --topic "AI Tutorials" --count 3` | Plan a video series (scaffold) |

## Upload CLI Usage

```bash
node src/cli/upload.js \
  --file "videos/my-video.mp4" \
  --title "My Video Title" \
  --description "Video description" \
  --tags "tag1, tag2, tag3" \
  --privacyStatus "unlisted"
```

## YouTube Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use existing)
3. Enable **YouTube Data API v3**
4. Create **OAuth 2.0 Client ID** (Desktop app)
5. Download the JSON and save as `secrets/client_secret.json`
6. First run will open an OAuth flow — paste the code when prompted
7. Token is saved in `secrets/token.json` for subsequent runs

## Workflow

1. Place `.mp4` files in `videos/`
2. Run `npm run approve` and open http://localhost:3000
3. Preview each video, set title/description/tags
4. Click **Approve & Upload** → file moves to `approved/`, uploads to YouTube as unlisted
5. Click **Reject** → file moves to `rejected/`, no upload
6. Upload history is logged to `data/uploads.jsonl`

## Directory Structure

```
videos/      → pending videos (place .mp4 here)
approved/    → approved & uploaded videos
rejected/    → rejected videos
secrets/     → client_secret.json + token.json (gitignored)
data/        → uploads.jsonl log + series plans
src/server.js       → Express approval server + UI
src/cli/upload.js   → YouTube upload CLI
src/cli/produce.js  → Video series planner (scaffold)
src/lib/youtube-auth.js     → OAuth2 helper
src/lib/upload-to-youtube.js → YouTube upload logic
```

## Run the existing frontend (AI Studio app)

```bash
npm run dev
```
