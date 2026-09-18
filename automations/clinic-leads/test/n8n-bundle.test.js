import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * ה-workflows של n8n נבנים מ-lib/. הבדיקות כאן מוודאות שני דברים:
 * שהקוד המוטמע באמת רץ, ושהקבצים שב-git מעודכנים מול הקוד.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflow = (file) => JSON.parse(readFileSync(join(root, 'n8n', file), 'utf8'));
const codeOf = (file, nodeName) => {
  const found = workflow(file).nodes.find((item) => item.name === nodeName);
  assert.ok(found, `לא נמצא node בשם ${nodeName}`);
  return found.parameters.jsCode;
};

/** הרצה של jsCode מתוך n8n עם תחליפים ל-$input/$()/$env. */
function runNodeCode(jsCode, { items = [], byNode = {}, env = {} } = {}) {
  const $input = {
    all: () => items,
    first: () => items[0],
  };
  const $ = (name) => {
    const data = byNode[name];
    assert.ok(data !== undefined, `הקוד ביקש node שלא הוגדר בבדיקה: ${name}`);
    return { first: () => ({ json: data }), all: () => [{ json: data }] };
  };
  const runner = new Function('$input', '$', '$env', 'console', jsCode);
  return runner($input, $, env, { log: () => {} });
}

test('הקוד המוטמע ב-workflow הקליטה מייצר פעולות אמיתיות', () => {
  const prepareCode = codeOf('clinic-leads-intake.json', 'הכנה — נרמול, תקינות ופרומפט');
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ value: {
      contacts: [{ profile: { name: 'דנה לוי' }, wa_id: '972501234567' }],
      messages: [{ from: '972501234567', id: 'wamid.1', timestamp: '1758186000', text: { body: 'היי, מעוניינת בבוטוקס' } }],
    } }] }],
  };

  const prepared = runNodeCode(prepareCode, { items: [{ json: { body: payload } }] });
  assert.equal(prepared[0].json.leadKey, '+972501234567');
  assert.equal(prepared[0].json.validation.valid, true);
  assert.match(prepared[0].json.prompt.user, /מעוניינת בבוטוקס/);

  const processCode = codeOf('clinic-leads-intake.json', 'עיבוד הצינור');
  const geminiResponse = {
    candidates: [{ content: { parts: [{ text: JSON.stringify({
      requestedTreatment: 'בוטוקס', urgency: 'בינונית', requiresHuman: false,
      escalationReasons: [], summary: 'מתעניינת בבוטוקס', confidence: 0.9,
    }) }] } }],
  };

  const actions = runNodeCode(processCode, {
    items: [{ json: geminiResponse }],
    byNode: {
      'הכנה — נרמול, תקינות ופרומפט': prepared[0].json,
      'חיפוש ליד קיים לפי מפתח': {},
    },
    env: { CLINIC_LEADS_SHEET_URL: 'https://sheet' },
  });

  const types = actions.map((item) => item.json.type);
  assert.deepEqual(types, ['create_record', 'send_message', 'update_record', 'notify_staff']);
  // השורה שנשלחת לגיליון משתמשת בכותרות העבריות
  assert.equal(actions[0].json.row['שם מלא'], 'דנה לוי');
  assert.equal(actions[0].json.row['סטטוס'], 'חדש');
  assert.equal(actions[2].json.row['מפתח ליד'], '+972501234567');
});

test('הקוד המוטמע ב-workflow המעקב סורק שורות גיליון', () => {
  const planCode = codeOf('clinic-leads-followup.json', 'תכנון הסריקה השעתית');
  const row = {
    'מפתח ליד': '+972501234567', 'שם מלא': 'דנה לוי', 'טלפון': '+972501234567', 'מקור הפנייה': 'וואטסאפ',
    'טיפול מבוקש': 'בוטוקס', 'סטטוס': 'נוצר קשר', 'מועד מעקב הבא': '2020-01-01T00:00:00.000Z',
    'ניסיונות מעקב': '0', 'הערות': 'התחלה',
  };
  const actions = runNodeCode(planCode, { items: [{ json: row }], env: {} });
  assert.deepEqual(actions.map((item) => item.json.type), ['send_message', 'update_record']);
  assert.equal(actions[1].json.row['סטטוס'], 'ממתין לתשובה');
  assert.equal(actions[1].json.row['ניסיונות מעקב'], 1);
});

test('התוצרים שב-git תואמים לקוד ב-lib', () => {
  const temp = mkdtempSync(join(tmpdir(), 'clinic-build-'));
  execFileSync(process.execPath, [join(root, 'scripts', 'build.mjs')], {
    env: { ...process.env, CLINIC_BUILD_OUT: temp },
    stdio: 'pipe',
  });

  const generated = readdirSync(temp, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name).replace(`${temp}/`, ''));

  assert.ok(generated.length >= 5, 'הבנייה לא ייצרה את כל התוצרים');
  for (const file of generated) {
    assert.equal(
      readFileSync(join(temp, file), 'utf8'),
      readFileSync(join(root, file), 'utf8'),
      `${file} לא מעודכן — הריצו npm run build:automation`,
    );
  }
});
