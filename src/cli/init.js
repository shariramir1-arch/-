import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

function check(label, fn) {
  try {
    fn();
    console.log(`[OK]   ${label}`);
    return true;
  } catch (e) {
    console.log(`[FAIL] ${label} — ${e.message}`);
    return false;
  }
}

let allOk = true;

allOk =
  check("ffmpeg", () => {
    execSync("ffmpeg -version", { stdio: "pipe" });
  }) && allOk;

allOk =
  check("python", () => {
    try {
      execSync("python --version", { stdio: "pipe" });
    } catch {
      execSync("python3 --version", { stdio: "pipe" });
    }
  }) && allOk;

allOk =
  check("config.json", () => {
    const configPath = join(process.cwd(), "config.json");
    if (!existsSync(configPath)) {
      throw new Error("config.json not found in project root");
    }
  }) && allOk;

allOk =
  check("data/weeks directory", () => {
    const weeksDir = join(process.cwd(), "data", "weeks");
    if (!existsSync(weeksDir)) {
      throw new Error("data/weeks directory not found");
    }
  }) && allOk;

console.log();
if (allOk) {
  console.log("All checks passed. System is ready.");
} else {
  console.log("Some checks failed. Please fix the issues above.");
  process.exit(1);
}
