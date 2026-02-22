import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, basename } from "path";

function publish(videoDir) {
  const metaPath = join(videoDir, "meta.json");
  if (!existsSync(metaPath)) {
    console.error(`No meta.json found in ${videoDir}`);
    return false;
  }

  const meta = JSON.parse(readFileSync(metaPath, "utf-8"));

  if (meta.status !== "APPROVED") {
    console.log(`Skipping ${basename(videoDir)} — status is ${meta.status}`);
    return false;
  }

  const fakeId = "yt_" + Math.random().toString(36).slice(2, 13);
  const fakeUrl = `https://www.youtube.com/watch?v=${fakeId}`;

  const upload = {
    videoId: fakeId,
    url: fakeUrl,
    uploadedAt: new Date().toISOString(),
    title: meta.title || basename(videoDir),
  };

  writeFileSync(join(videoDir, "upload.json"), JSON.stringify(upload, null, 2), "utf-8");

  meta.status = "UPLOADED";
  meta.uploadUrl = fakeUrl;
  meta.uploadedAt = upload.uploadedAt;
  writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");

  console.log(`[UPLOADED] ${meta.title || basename(videoDir)}`);
  console.log(`  URL: ${fakeUrl}`);
  return true;
}

// Can be called directly or imported
const videoDir = process.argv[2];
if (videoDir) {
  publish(videoDir);
}

export { publish };
