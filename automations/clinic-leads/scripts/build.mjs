#!/usr/bin/env node
/**
 * בונה את קבצי ה-workflow של n8n מתוך אותו קוד שנמצא ב-lib/.
 *
 * למה: nodes מסוג Code ב-n8n רצים בארגז חול בלי גישה לקבצים מקומיים, ולכן
 * הלוגיקה חייבת להיות מוטמעת בתוך ה-JSON. במקום להחזיק שני עותקים שמתפצלים
 * זה מזה, הקוד נבנה כאן מ-lib/ ונבדק ב-node --test.
 *
 * הרצה: npm run build:automation
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
/** בסיס הכתיבה — נדרס בבדיקה שמוודאת שהקבצים ב-git מעודכנים. */
const outBase = process.env.CLINIC_BUILD_OUT || root;

/** סדר הטעינה — לפי תלויות. */
const MODULES = [
  'config.js',
  'statuses.js',
  'phone.js',
  'normalize.js',
  'validate.js',
  'classify.js',
  'record.js',
  'messages.js',
  'pipeline.js',
  'followup.js',
];

/** השמות שמיוצאים מ-messages.js ומשמשים דרך המרחב `messages.` */
const MESSAGE_EXPORTS = [
  'formatAppointment', 'greeting', 'handoffToHuman', 'followupReminder',
  'appointmentConfirmation', 'appointmentReminder', 'newLeadAlert', 'handoffAlert',
  'invalidLeadAlert', 'noAnswerAlert', 'returningLeadAlert',
];

function bundleLib() {
  const parts = MODULES.map((file) => {
    const source = readFileSync(join(root, 'lib', file), 'utf8');
    const flattened = source
      .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*$/gm, '')
      .replace(/^export\s+\*[\s\S]*?;\s*$/gm, '')
      .replace(/^export\s+/gm, '');
    return `// ---- lib/${file} ----\n${flattened.trim()}`;
  });

  parts.push(`// ---- מרחב השמות messages ----\nconst messages = { ${MESSAGE_EXPORTS.join(', ')} };`);

  const bundle = parts.join('\n\n');
  if (/^\s*(import|export)\s/m.test(bundle)) {
    throw new Error('נשארו הצהרות import/export בחבילה — n8n לא יריץ אותה');
  }
  // אימות תחביר לפני כתיבה, כדי שלא ייווצר workflow שבור
  new Function(`${bundle}\nreturn typeof processInbound === 'function' && typeof planHourlyScan === 'function';`);
  return bundle;
}

const LIB = bundleLib();

let nodeId = 0;
const node = (name, type, parameters, extra = {}) => ({
  parameters,
  id: `node-${String(++nodeId).padStart(3, '0')}`,
  name,
  type,
  typeVersion: extra.typeVersion ?? 1,
  position: extra.position ?? [0, 0],
  ...(extra.credentials ? { credentials: extra.credentials } : {}),
  ...(extra.webhookId ? { webhookId: extra.webhookId } : {}),
  ...(extra.alwaysOutputData ? { alwaysOutputData: true } : {}),
  ...(extra.onError ? { onError: extra.onError } : {}),
});

const code = (name, body, position) =>
  node(name, 'n8n-nodes-base.code', { mode: 'runOnceForAllItems', jsCode: `${LIB}\n\n// ---- ${name} ----\n${body}` }, { typeVersion: 2, position });

const connect = (pairs) => {
  const connections = {};
  for (const [from, to, outputIndex = 0] of pairs) {
    connections[from] ??= { main: [] };
    while (connections[from].main.length <= outputIndex) connections[from].main.push([]);
    connections[from].main[outputIndex].push({ node: to, type: 'main', index: 0 });
  }
  return connections;
};

/* ---------------- nodes משותפים לביצוע הפעולות ---------------- */

const SHEET_DOC = '={{ $env.CLINIC_LEADS_SHEET_ID }}';
const SHEET_NAME = '={{ $env.CLINIC_LEADS_SHEET_NAME || "לידים" }}';

const sheetsAppend = (position) => node('הוספת שורה בגיליון', 'n8n-nodes-base.googleSheets', {
  operation: 'append',
  documentId: SHEET_DOC,
  sheetName: SHEET_NAME,
  columns: { mappingMode: 'autoMapInputData', value: {} },
  options: {},
}, { typeVersion: 4.5, position });

const sheetsUpdate = (position) => node('עדכון שורה בגיליון', 'n8n-nodes-base.googleSheets', {
  operation: 'update',
  documentId: SHEET_DOC,
  sheetName: SHEET_NAME,
  columns: { mappingMode: 'autoMapInputData', matchingColumns: ['מפתח ליד'], value: {} },
  options: {},
}, { typeVersion: 4.5, position });

const whatsappSend = (name, toExpression, textExpression, position) =>
  node(name, 'n8n-nodes-base.httpRequest', {
    method: 'POST',
    url: '={{ "https://graph.facebook.com/v21.0/" + $env.WHATSAPP_PHONE_NUMBER_ID + "/messages" }}',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({ messaging_product: "whatsapp", to: ${toExpression}, type: "text", text: { preview_url: false, body: ${textExpression} } }) }}`,
    options: {},
  }, { typeVersion: 4.2, position });

const instagramSend = (position) =>
  node('שליחה באינסטגרם', 'n8n-nodes-base.httpRequest', {
    method: 'POST',
    url: '={{ "https://graph.facebook.com/v21.0/" + $env.INSTAGRAM_USER_ID + "/messages" }}',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendBody: true,
    specifyBody: 'json',
    jsonBody: '={{ JSON.stringify({ recipient: { id: $json.to }, message: { text: $json.text } }) }}',
    options: {},
  }, { typeVersion: 4.2, position });

const actionSwitch = (position) => node('ניתוב לפי סוג פעולה', 'n8n-nodes-base.switch', {
  rules: {
    values: [
      { conditions: { options: { caseSensitive: true, version: 2 }, conditions: [{ leftValue: '={{ $json.type }}', rightValue: 'create_record', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'יצירת רשומה' },
      { conditions: { options: { caseSensitive: true, version: 2 }, conditions: [{ leftValue: '={{ $json.type }}', rightValue: 'update_record', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'עדכון רשומה' },
      { conditions: { options: { caseSensitive: true, version: 2 }, conditions: [{ leftValue: '={{ $json.type }}', rightValue: 'send_message', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'הודעה ללקוח' },
      { conditions: { options: { caseSensitive: true, version: 2 }, conditions: [{ leftValue: '={{ $json.type }}', rightValue: 'notify_staff', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'התראה למזכירה' },
    ],
  },
  options: {},
}, { typeVersion: 3, position });

const channelSwitch = (position) => node('ניתוב לפי ערוץ', 'n8n-nodes-base.switch', {
  rules: {
    values: [
      { conditions: { options: { caseSensitive: true, version: 2 }, conditions: [{ leftValue: '={{ $json.channel }}', rightValue: 'whatsapp', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'וואטסאפ' },
      { conditions: { options: { caseSensitive: true, version: 2 }, conditions: [{ leftValue: '={{ $json.channel }}', rightValue: 'instagram', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'אינסטגרם' },
    ],
  },
  options: { fallbackOutput: 'extra', renameFallbackOutput: 'ללא ערוץ' },
}, { typeVersion: 3, position });

const noChannelAlert = (position) => node('אין ערוץ לענות בו', 'n8n-nodes-base.noOp', {}, { position });

/** הקוד שממיר פעולות לשורות גיליון — זהה בכל ה-workflows. */
const ACTIONS_TO_ITEMS = `
const items = [];
for (const action of actions) {
  if (action.type === ACTION.CREATE_RECORD) {
    items.push({ json: { ...action, row: toSheetObject(action.record) } });
  } else if (action.type === ACTION.UPDATE_RECORD) {
    items.push({ json: { ...action, row: { ...toSheetObject(action.updates), 'מפתח ליד': action.key } } });
  } else {
    items.push({ json: action });
  }
}
return items;
`.trim();

/* ---------------- Workflow 1: קליטה ---------------- */

function buildIntake() {
  nodeId = 0;
  const webhook = node('Webhook — קליטת לידים', 'n8n-nodes-base.webhook', {
    httpMethod: 'POST',
    path: 'clinic-leads',
    responseMode: 'lastNode',
    options: {},
  }, { typeVersion: 2, position: [-820, 300], webhookId: 'clinic-leads-intake' });

  const prepare = code('הכנה — נרמול, תקינות ופרומפט', `
const payload = $input.first().json.body ?? $input.first().json;
const now = new Date().toISOString();
const lead = normalizeInbound(payload, { now });
const validation = validateInbound(lead);
const prompt = buildClassifierPrompt(lead);

return [{ json: { payload, lead, validation, prompt, leadKey: leadKey(lead), now } }];
`.trim(), [-600, 300]);

  const lookup = node('חיפוש ליד קיים לפי מפתח', 'n8n-nodes-base.googleSheets', {
    operation: 'read',
    documentId: SHEET_DOC,
    sheetName: SHEET_NAME,
    filtersUI: { values: [{ lookupColumn: 'מפתח ליד', lookupValue: '={{ $json.leadKey }}' }] },
    options: { returnAllMatches: false },
  }, { typeVersion: 4.5, position: [-380, 300], alwaysOutputData: true, onError: 'continueRegularOutput' });

  const isValid = node('פנייה תקינה?', 'n8n-nodes-base.if', {
    conditions: {
      options: { caseSensitive: true, version: 2 },
      conditions: [{
        leftValue: "={{ $('הכנה — נרמול, תקינות ופרומפט').first().json.validation.valid }}",
        rightValue: true,
        operator: { type: 'boolean', operation: 'true', singleValue: true },
      }],
      combinator: 'and',
    },
    options: {},
  }, { typeVersion: 2, position: [-160, 300] });

  const gemini = node('סיווג AI (JSON בלבד)', 'n8n-nodes-base.httpRequest', {
    method: 'POST',
    url: '=https://generativelanguage.googleapis.com/v1beta/models/{{ $env.CLINIC_AI_MODEL || "gemini-2.5-flash" }}:generateContent',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({
      system_instruction: { parts: [{ text: $('הכנה — נרמול, תקינות ופרומפט').first().json.prompt.system }] },
      contents: [{ role: "user", parts: [{ text: $('הכנה — נרמול, תקינות ופרומפט').first().json.prompt.user }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
    }) }}`,
    options: { timeout: 20000 },
  }, { typeVersion: 4.2, position: [60, 200], onError: 'continueRegularOutput' });

  const process = code('עיבוד הצינור', `
const prepared = $('הכנה — נרמול, תקינות ופרומפט').first().json;
const lookupRow = $('חיפוש ליד קיים לפי מפתח').first()?.json ?? {};
const existingRecord = lookupRow['מפתח ליד'] ? fromSheetObject(lookupRow) : null;

// פלט Gemini מגיע רק אם עברנו בענף התקין
let aiOutput = null;
const incoming = $input.first()?.json ?? {};
if (incoming.candidates) {
  aiOutput = incoming.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

const result = processInbound({
  payload: prepared.payload,
  existingRecord,
  aiOutput,
  now: new Date().toISOString(),
  sheetUrl: $env.CLINIC_LEADS_SHEET_URL,
});

const actions = result.actions;
${ACTIONS_TO_ITEMS}
`.trim(), [280, 300]);

  const nodes = [
    webhook, prepare, lookup, isValid, gemini, process,
    actionSwitch([500, 300]),
    sheetsAppend([760, 60]),
    sheetsUpdate([760, 220]),
    channelSwitch([760, 400]),
    whatsappSend('שליחה בוואטסאפ', '$json.to', '$json.text', [1000, 340]),
    instagramSend([1000, 460]),
    noChannelAlert([1000, 580]),
    whatsappSend('התראה למזכירה', '$env.CLINIC_SECRETARY_PHONE', '$json.text', [760, 700]),
  ];

  const connections = connect([
    ['Webhook — קליטת לידים', 'הכנה — נרמול, תקינות ופרומפט'],
    ['הכנה — נרמול, תקינות ופרומפט', 'חיפוש ליד קיים לפי מפתח'],
    ['חיפוש ליד קיים לפי מפתח', 'פנייה תקינה?'],
    ['פנייה תקינה?', 'סיווג AI (JSON בלבד)', 0],
    ['פנייה תקינה?', 'עיבוד הצינור', 1],
    ['סיווג AI (JSON בלבד)', 'עיבוד הצינור'],
    ['עיבוד הצינור', 'ניתוב לפי סוג פעולה'],
    ['ניתוב לפי סוג פעולה', 'הוספת שורה בגיליון', 0],
    ['ניתוב לפי סוג פעולה', 'עדכון שורה בגיליון', 1],
    ['ניתוב לפי סוג פעולה', 'ניתוב לפי ערוץ', 2],
    ['ניתוב לפי סוג פעולה', 'התראה למזכירה', 3],
    ['ניתוב לפי ערוץ', 'שליחה בוואטסאפ', 0],
    ['ניתוב לפי ערוץ', 'שליחה באינסטגרם', 1],
    ['ניתוב לפי ערוץ', 'אין ערוץ לענות בו', 2],
  ]);

  return { name: 'קליניקה — קליטת לידים', nodes, connections, settings: { executionOrder: 'v1' }, pinData: {} };
}

/* ---------------- Workflow 2: מעקב שעתי ---------------- */

function buildFollowup() {
  nodeId = 0;
  const trigger = node('כל שעה', 'n8n-nodes-base.scheduleTrigger', {
    rule: { interval: [{ field: 'hours', hoursInterval: 1 }] },
  }, { typeVersion: 1.2, position: [-600, 300] });

  const read = node('קריאת כל הלידים', 'n8n-nodes-base.googleSheets', {
    operation: 'read',
    documentId: SHEET_DOC,
    sheetName: SHEET_NAME,
    options: {},
  }, { typeVersion: 4.5, position: [-380, 300] });

  const plan = code('תכנון הסריקה השעתית', `
const records = $input.all().map((item) => fromSheetObject(item.json));
const { actions, summary } = planHourlyScan(records, new Date().toISOString(), $env.CLINIC_LEADS_SHEET_URL);
console.log('סריקת מעקב:', JSON.stringify(summary));
${ACTIONS_TO_ITEMS}
`.trim(), [-160, 300]);

  const nodes = [
    trigger, read, plan,
    actionSwitch([60, 300]),
    sheetsAppend([320, 60]),
    sheetsUpdate([320, 220]),
    channelSwitch([320, 400]),
    whatsappSend('שליחה בוואטסאפ', '$json.to', '$json.text', [560, 340]),
    instagramSend([560, 460]),
    noChannelAlert([560, 580]),
    whatsappSend('התראה למזכירה', '$env.CLINIC_SECRETARY_PHONE', '$json.text', [320, 700]),
  ];

  const connections = connect([
    ['כל שעה', 'קריאת כל הלידים'],
    ['קריאת כל הלידים', 'תכנון הסריקה השעתית'],
    ['תכנון הסריקה השעתית', 'ניתוב לפי סוג פעולה'],
    ['ניתוב לפי סוג פעולה', 'הוספת שורה בגיליון', 0],
    ['ניתוב לפי סוג פעולה', 'עדכון שורה בגיליון', 1],
    ['ניתוב לפי סוג פעולה', 'ניתוב לפי ערוץ', 2],
    ['ניתוב לפי סוג פעולה', 'התראה למזכירה', 3],
    ['ניתוב לפי ערוץ', 'שליחה בוואטסאפ', 0],
    ['ניתוב לפי ערוץ', 'שליחה באינסטגרם', 1],
    ['ניתוב לפי ערוץ', 'אין ערוץ לענות בו', 2],
  ]);

  return { name: 'קליניקה — מעקב שעתי', nodes, connections, settings: { executionOrder: 'v1' }, pinData: {} };
}

/* ---------------- Workflow 3: נקבע תור ---------------- */

function buildAppointment() {
  nodeId = 0;
  const trigger = node('שינוי שורה בגיליון', 'n8n-nodes-base.googleSheetsTrigger', {
    documentId: SHEET_DOC,
    sheetName: SHEET_NAME,
    event: 'rowUpdate',
    pollTimes: { item: [{ mode: 'everyMinute' }] },
    options: {},
  }, { typeVersion: 1, position: [-600, 300] });

  const plan = code('תכנון אישור התור', `
const now = new Date().toISOString();
const items = [];
for (const item of $input.all()) {
  const record = fromSheetObject(item.json);
  if (record.status !== STATUS.BOOKED) continue;
  // תור שכבר אושר לא מאשרים שוב
  if (String(record.notes || '').includes('נשלח אישור')) continue;

  const plan = planAppointmentBooked(record, now, $env.CLINIC_LEADS_SHEET_URL);
  for (const action of plan.actions) {
    if (action.type === ACTION.UPDATE_RECORD) {
      items.push({ json: { ...action, row: { ...toSheetObject(action.updates), 'מפתח ליד': action.key } } });
    } else {
      items.push({ json: action });
    }
  }
}
return items;
`.trim(), [-380, 300]);

  const nodes = [
    trigger, plan,
    actionSwitch([-160, 300]),
    sheetsAppend([100, 60]),
    sheetsUpdate([100, 220]),
    channelSwitch([100, 400]),
    whatsappSend('שליחה בוואטסאפ', '$json.to', '$json.text', [340, 340]),
    instagramSend([340, 460]),
    noChannelAlert([340, 580]),
    whatsappSend('התראה למזכירה', '$env.CLINIC_SECRETARY_PHONE', '$json.text', [100, 700]),
  ];

  const connections = connect([
    ['שינוי שורה בגיליון', 'תכנון אישור התור'],
    ['תכנון אישור התור', 'ניתוב לפי סוג פעולה'],
    ['ניתוב לפי סוג פעולה', 'הוספת שורה בגיליון', 0],
    ['ניתוב לפי סוג פעולה', 'עדכון שורה בגיליון', 1],
    ['ניתוב לפי סוג פעולה', 'ניתוב לפי ערוץ', 2],
    ['ניתוב לפי סוג פעולה', 'התראה למזכירה', 3],
    ['ניתוב לפי ערוץ', 'שליחה בוואטסאפ', 0],
    ['ניתוב לפי ערוץ', 'שליחה באינסטגרם', 1],
    ['ניתוב לפי ערוץ', 'אין ערוץ לענות בו', 2],
  ]);

  return { name: 'קליניקה — קביעת תור', nodes, connections, settings: { executionOrder: 'v1' }, pinData: {} };
}

/* ---------------- כתיבת התוצרים ---------------- */

const write = (relativePath, contents) => {
  const target = join(outBase, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, 'utf8');
  console.log(`נכתב: ${relativePath}`);
};

for (const [file, workflow] of [
  ['clinic-leads-intake.json', buildIntake()],
  ['clinic-leads-followup.json', buildFollowup()],
  ['clinic-leads-appointment.json', buildAppointment()],
]) {
  write(join('n8n', file), `${JSON.stringify(workflow, null, 2)}\n`);
}

/* הפרומפט והכותרות נגזרים מהקוד כדי שלא יתפצלו ממנו */
const { CLASSIFIER_SYSTEM_PROMPT, CLASSIFICATION_SCHEMA, TREATMENTS, URGENCY } = await import(join(root, 'lib/classify.js'));
const { HEADERS, COLUMNS } = await import(join(root, 'lib/record.js'));

write(join('prompts', 'classifier.he.md'), [
  '<!-- נוצר אוטומטית מ-lib/classify.js — אין לערוך ידנית. הרצה: npm run build:automation -->',
  '',
  '# פרומפט הסיווג',
  '',
  'המודל מקבל את ההוראה הזו כ-system instruction, ומחזיר JSON בלבד.',
  '',
  '## System',
  '',
  '```text',
  CLASSIFIER_SYSTEM_PROMPT,
  '```',
  '',
  '## סכמת הפלט',
  '',
  '```json',
  JSON.stringify(CLASSIFICATION_SCHEMA, null, 2),
  '```',
  '',
  '## ערכים מותרים',
  '',
  `- טיפולים: ${TREATMENTS.join(' | ')}`,
  `- דחיפות: ${URGENCY.join(' | ')}`,
  '',
  '## מה קורה אחרי התשובה',
  '',
  'הפלט אינו מילה אחרונה. `resolveClassification` ב-`lib/classify.js` מריץ מעליו',
  'כללים דטרמיניסטיים: מילה כמו "בהריון", "החזר כספי" או "הנחה" מעבירה את הליד',
  'לאדם גם אם המודל קבע `requiresHuman: false`, וכך גם ביטחון נמוך מ-0.7 או פלט',
  'שאינו JSON תקין.',
  '',
].join('\n'));

write(join('sheets', 'headers.csv'), `${HEADERS.join(',')}\n`);

write(join('sheets', 'schema.md'), [
  '<!-- נוצר אוטומטית מ-lib/record.js — אין לערוך ידנית. הרצה: npm run build:automation -->',
  '',
  '# מבנה הגיליון',
  '',
  'שורה 1 היא שורת הכותרות, בדיוק בסדר הזה. `מפתח ליד` היא עמודת ההתאמה',
  'שכל פעולות העדכון מסתמכות עליה — אין לשנות את שמה או את מיקומה.',
  '',
  '| # | עמודה | שדה בקוד |',
  '| - | ----- | -------- |',
  ...COLUMNS.map((column, index) => `| ${index + 1} | ${column.header} | \`${column.key}\` |`),
  '',
].join('\n'));
