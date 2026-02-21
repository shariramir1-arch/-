#!/bin/bash
# === סקריפט התקנה למערכת סרטונים אוטומטית ===

echo "=== התקנת מערכת סרטונים אוטומטית ==="
echo ""

# בדיקת Python
if ! command -v python3 &> /dev/null; then
    echo "שגיאה: Python 3 לא מותקן"
    exit 1
fi

echo "Python version: $(python3 --version)"

# יצירת סביבה וירטואלית
echo ""
echo "יוצר סביבה וירטואלית..."
python3 -m venv venv
source venv/bin/activate

# התקנת תלויות
echo ""
echo "מתקין תלויות..."
pip install --upgrade pip
pip install -r requirements.txt

# התקנת ffmpeg (נדרש לוידאו)
echo ""
echo "בודק ffmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    echo "ffmpeg לא מותקן. מתקין..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y ffmpeg
    elif command -v brew &> /dev/null; then
        brew install ffmpeg
    else
        echo "אנא התקן ffmpeg ידנית: https://ffmpeg.org/download.html"
    fi
else
    echo "ffmpeg מותקן: $(ffmpeg -version | head -1)"
fi

# יצירת תיקיות
echo ""
echo "יוצר תיקיות..."
mkdir -p output/{scripts,narrations,videos,thumbnails,logs}
mkdir -p data
mkdir -p config

# בדיקת משתנה סביבה
echo ""
if [ -z "$GROQ_API_KEY" ]; then
    echo "אזהרה: GROQ_API_KEY לא מוגדר!"
    echo "צור מפתח חינמי ב: https://console.groq.com/keys"
    echo "הגדר אותו עם: export GROQ_API_KEY='your-api-key'"
else
    echo "GROQ_API_KEY מוגדר."
fi

echo ""
echo "=== ההתקנה הושלמה ==="
echo ""
echo "שימוש:"
echo "  source venv/bin/activate           # הפעלת סביבה וירטואלית"
echo "  export GROQ_API_KEY='your-key'     # הגדרת מפתח API (https://console.groq.com/keys)"
echo "  python main.py create              # יצירת תוכן שבועי"
echo "  python main.py produce             # הפקת סרטונים"
echo "  python main.py approve             # ממשק אישור"
echo "  python main.py upload              # העלאה ליוטיוב"
echo "  python main.py run-once            # הרצה מלאה"
echo "  python main.py daily               # בדיקה יומית"
echo "  python main.py status              # סטטוס"
