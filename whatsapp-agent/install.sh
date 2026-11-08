#!/usr/bin/env bash
# One-step installer for Mac / Linux: checks Node.js, installs dependencies,
# creates .env (asks for the Claude key) and opens the test chat.
set -e
cd "$(dirname "$0")"

say() { printf '\n%s\n' "$1"; }

node_ok() {
  command -v node >/dev/null 2>&1 && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]
}

if ! node_ok; then
  say "לא נמצא Node.js בגרסה 20 ומעלה. מנסה להתקין..."
  if [ "$(uname)" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
    brew install node
  elif command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi
  if ! node_ok; then
    say "צריך להתקין Node.js ידנית: https://nodejs.org (כפתור LTS), ואז להריץ את הקובץ הזה שוב."
    [ "$(uname)" = "Darwin" ] && open "https://nodejs.org" || true
    exit 1
  fi
fi
say "✅ Node.js $(node -v)"

say "מתקין חבילות (זה לוקח דקה)..."
npm install --no-audit --no-fund

if [ ! -f .env ] || grep -q '^ANTHROPIC_API_KEY=sk-ant-\.\.\.' .env; then
  npm run setup
else
  say "קובץ .env כבר קיים (להחלפת ערכים: npm run setup)"
fi

say "פותח צ'אט בדיקה. כתוב הודעה בעברית, ו-exit כדי לצאת."
npm run chat
