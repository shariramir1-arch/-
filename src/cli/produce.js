import { readdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { getWeekPath } from "../lib/paths.js";

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--week" && args[i + 1]) {
      result.week = args[i + 1];
      i++;
    }
  }
  return result;
}

const { week } = parseArgs(process.argv.slice(2));

if (!week) {
  console.error("Usage: node src/cli/produce.js --week <week>");
  process.exit(1);
}

const weekDir = getWeekPath(week);
const configPath = join(process.cwd(), "config.json");
const config = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, "utf-8"))
  : {};

const width = config.videoWidth || 1920;
const height = config.videoHeight || 1080;
const duration = config.videoDurationSec || 10;
const fontSize = config.fontSize || 48;
const fontColor = config.fontColor || "white";
const bgColor = config.bgColor || "#1a1a2e";

// Iterate over topic folders in the week directory
const topicDirs = readdirSync(weekDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

if (topicDirs.length === 0) {
  console.log(`No topic folders found in ${weekDir}`);
  console.log("Run plan first: npm run plan -- --topic <topic> --week <week>");
  process.exit(0);
}

let produced = 0;

for (const topicSlug of topicDirs) {
  const topicDir = join(weekDir, topicSlug);
  const planPath = join(topicDir, "plan.json");

  if (!existsSync(planPath)) {
    console.log(`Skipping ${topicSlug} — no plan.json`);
    continue;
  }

  const plan = JSON.parse(readFileSync(planPath, "utf-8"));

  for (const video of plan.videos) {
    const videoDir = join(topicDir, video.id);
    const { mkdirSync } = await import("fs");
    mkdirSync(videoDir, { recursive: true });

    const voicePath = join(videoDir, "voice.mp3");
    const captionsPath = join(videoDir, "captions.srt");
    const draftPath = join(videoDir, "draft.mp4");
    const metaPath = join(videoDir, "meta.json");

    // Create dummy voice.mp3 (silent audio)
    if (!existsSync(voicePath)) {
      try {
        execSync(
          `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${duration} "${voicePath}"`,
          { stdio: "pipe" }
        );
      } catch {
        // Fallback: create an empty file
        writeFileSync(voicePath, Buffer.alloc(0));
      }
    }

    // Create dummy captions.srt
    if (!existsSync(captionsPath)) {
      const srt = [
        "1",
        "00:00:00,000 --> 00:00:05,000",
        video.title,
        "",
        "2",
        "00:00:05,000 --> 00:00:10,000",
        video.description || "Auto-generated video",
        "",
      ].join("\n");
      writeFileSync(captionsPath, srt, "utf-8");
    }

    // Create draft.mp4 using ffmpeg
    if (!existsSync(draftPath)) {
      const safeTitle = video.title.replace(/'/g, "'\\''");
      const drawtext = `drawtext=text='${safeTitle}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2:y=(h-text_h)/2`;
      const cmd = [
        "ffmpeg -y",
        `-f lavfi -i color=c=${bgColor.replace("#", "0x")}:s=${width}x${height}:d=${duration}`,
        `-f lavfi -i anullsrc=r=44100:cl=mono`,
        `-t ${duration}`,
        `-vf "${drawtext}"`,
        `-c:v libx264 -pix_fmt yuv420p`,
        `-c:a aac -shortest`,
        `"${draftPath}"`,
      ].join(" ");

      try {
        execSync(cmd, { stdio: "pipe" });
        console.log(`[OK] ${video.id}: ${video.title} — draft.mp4 created`);
      } catch (e) {
        console.error(`[FAIL] ${video.id}: ffmpeg error — ${e.message}`);
        continue;
      }
    } else {
      console.log(`[SKIP] ${video.id}: draft.mp4 already exists`);
    }

    // Create/update meta.json
    const meta = existsSync(metaPath)
      ? JSON.parse(readFileSync(metaPath, "utf-8"))
      : {};

    meta.id = video.id;
    meta.title = video.title;
    meta.description = video.description || "";
    meta.week = week;
    meta.topic = topicSlug;
    meta.status = meta.status || "NEEDS_REVIEW";
    meta.createdAt = meta.createdAt || new Date().toISOString();
    meta.updatedAt = new Date().toISOString();

    writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");
    produced++;
  }
}

console.log(`\nDone. Produced ${produced} video(s) for week ${week}.`);
console.log("Run npm run approve to review them in the browser.");
