import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { getTopicPath, slugifyTopic } from "../lib/paths.js";

const PlanSchema = z.object({
  topic: z.string().min(1),
  week: z.string().min(1),
  videos: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional().default(""),
    })
  ),
});

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--topic" && args[i + 1]) {
      result.topic = args[i + 1];
      i++;
    } else if (args[i] === "--week" && args[i + 1]) {
      result.week = args[i + 1];
      i++;
    }
  }
  return result;
}

const { topic, week } = parseArgs(process.argv.slice(2));

if (!topic || !week) {
  console.error("Usage: node src/cli/plan.js --topic <topic> --week <week>");
  process.exit(1);
}

const topicDir = getTopicPath(week, topic);
const slug = slugifyTopic(topic);
const planPath = join(topicDir, "plan.json");

console.log(`Week:  ${week}`);
console.log(`Topic: ${topic}`);
console.log(`Slug:  ${slug}`);
console.log(`Path:  ${topicDir}`);

if (!existsSync(planPath)) {
  const defaultPlan = {
    topic,
    week,
    videos: [
      { id: "v01", title: `${topic} — Part 1`, description: "" },
    ],
  };
  writeFileSync(planPath, JSON.stringify(defaultPlan, null, 2), "utf-8");
  console.log("\nCreated default plan.json");
} else {
  console.log("\nplan.json already exists");
}

// Validate
const raw = JSON.parse(readFileSync(planPath, "utf-8"));
const parsed = PlanSchema.safeParse(raw);

if (parsed.success) {
  console.log(`[OK] plan.json is valid (${parsed.data.videos.length} video(s))`);
} else {
  console.error("[FAIL] plan.json validation errors:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}
