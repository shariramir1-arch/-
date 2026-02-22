# Auto Video System

Automated video production scaffold — plan, produce, review, and publish videos from the command line.

## Prerequisites (Windows)

1. **Node.js** (v18+): Download from https://nodejs.org
2. **ffmpeg**: Download from https://ffmpeg.org/download.html
   - Extract to a folder (e.g. `C:\ffmpeg`)
   - Add `C:\ffmpeg\bin` to your system PATH
   - Verify: `ffmpeg -version`
3. **Python** (3.x): Download from https://python.org
   - Check "Add to PATH" during installation
   - Verify: `python --version`

## Setup

```bash
cd auto-video-system
npm install
npm run init
```

`npm run init` checks that ffmpeg, python, and config.json are all present.

## Workflow

### 1. Plan a topic

```bash
npm run plan -- --topic "AI וטכנולוגיה" --week "2026-W09"
```

This creates a topic folder under `data/weeks/2026-W09/` with a `plan.json` file containing the video list. Edit `plan.json` to add more videos or change titles.

### 2. Produce video drafts

```bash
npm run produce -- --week "2026-W09"
```

For each video in the plan, this generates:
- `voice.mp3` — silent placeholder audio
- `captions.srt` — placeholder subtitles
- `draft.mp4` — color background with title text overlay
- `meta.json` — status tracking (starts as `NEEDS_REVIEW`)

### 3. Review and approve

```bash
npm run approve
```

Opens a browser dashboard at http://localhost:3210 where you can:
- **Preview** each draft video
- **Approve** — marks as APPROVED and runs fake publish (generates a fake YouTube URL)
- **Reject** — marks as REJECTED

### 4. Manual publish

```bash
npm run publish -- <path-to-video-folder>
```

Publishes a single APPROVED video (creates `upload.json` with fake YouTube URL).

## Project Structure

```
auto-video-system/
├── config.json              # Project configuration
├── data/
│   └── weeks/
│       └── 2026-W09/
│           └── ai-vtknvlvgyh/   # slugified topic
│               ├── plan.json
│               └── v01/
│                   ├── voice.mp3
│                   ├── captions.srt
│                   ├── draft.mp4
│                   ├── meta.json
│                   └── upload.json
├── src/
│   ├── cli/
│   │   ├── init.js          # System checks
│   │   ├── plan.js          # Create topic + plan
│   │   ├── produce.js       # Generate video drafts
│   │   └── publish.js       # Fake upload
│   ├── server/
│   │   └── index.js         # Review dashboard
│   └── lib/
│       └── paths.js         # Path helpers
└── workers/
    └── python/              # Future Python workers
```

## Configuration (config.json)

| Key              | Default     | Description                     |
|------------------|-------------|---------------------------------|
| videoWidth       | 1920        | Draft video width in pixels     |
| videoHeight      | 1080        | Draft video height in pixels    |
| videoDurationSec | 10          | Draft video duration in seconds |
| fontSize         | 48          | Title text font size            |
| fontColor        | white       | Title text color                |
| bgColor          | #1a1a2e     | Video background color          |
| serverPort       | 3210        | Review server port              |
