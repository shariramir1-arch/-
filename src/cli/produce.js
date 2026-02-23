'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const PLAN_PATH = path.join(DATA_DIR, 'plan.json');

// --- CLI arg parsing ---
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '';
      args[key] = val;
      if (val) i++;
    }
  }
  return args;
}

function generatePlan(topic, count) {
  const items = [];
  for (let i = 1; i <= count; i++) {
    items.push({
      topic: topic,
      index: i,
      titleIdea: `${topic} — חלק ${i}`,
      hookIdea: `למה ${topic} חשוב? גלה בחלק ${i}`,
      status: 'planned',
    });
  }
  return items;
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.topic) {
    console.error('שגיאה: חובה לציין --topic "..."');
    console.error('שימוש: node src/cli/produce.js --topic "AI Tutorials" --count 3');
    process.exit(1);
  }

  const topic = args.topic;
  const count = parseInt(args.count, 10) || 3;

  if (count < 1 || count > 50) {
    console.error('שגיאה: --count חייב להיות בין 1 ל-50.');
    process.exit(1);
  }

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Load existing plan or start fresh
  let existingPlan = [];
  if (fs.existsSync(PLAN_PATH)) {
    try {
      existingPlan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf8'));
      if (!Array.isArray(existingPlan)) existingPlan = [];
    } catch (e) {
      console.log('אזהרה: plan.json קיים לא תקין, מתחיל מחדש.');
      existingPlan = [];
    }
  }

  const newItems = generatePlan(topic, count);
  const merged = existingPlan.concat(newItems);

  fs.writeFileSync(PLAN_PATH, JSON.stringify(merged, null, 2), 'utf8');

  console.log(`\n✓ תוכנית נוצרה בהצלחה!`);
  console.log(`  נושא: ${topic}`);
  console.log(`  פריטים חדשים: ${count}`);
  console.log(`  סה"כ בתוכנית: ${merged.length}`);
  console.log(`  קובץ: ${PLAN_PATH}`);
  console.log('\nפריטים חדשים:');
  newItems.forEach((item) => {
    console.log(`  [${item.index}] ${item.titleIdea} (${item.status})`);
  });
}

module.exports = { generatePlan, parseArgs };

if (require.main === module) {
  main();
}
