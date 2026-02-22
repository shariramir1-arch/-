import { mkdirSync } from "fs";
import { join } from "path";
import slugify from "slugify";

const DATA_DIR = join(process.cwd(), "data", "weeks");

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getWeekPath(week) {
  const dir = join(DATA_DIR, week);
  return ensureDir(dir);
}

export function slugifyTopic(topic) {
  // Replace filesystem-unsafe characters with hyphens, keep Unicode letters/digits
  const safe = topic
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  // Use slugify for Latin parts, but if input has non-Latin text, use safe version
  const slug = slugify(topic, { lower: true, strict: true });
  return safe || slug || "untitled";
}

export function getTopicPath(week, topic) {
  const slug = slugifyTopic(topic);
  const dir = join(DATA_DIR, week, slug);
  return ensureDir(dir);
}

export function getVideoPath(week, topic, videoId) {
  const topicDir = getTopicPath(week, topic);
  const dir = join(topicDir, videoId);
  return ensureDir(dir);
}
