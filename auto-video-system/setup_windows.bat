@echo off
REM === סקריפט התקנה והרצה ל-Windows ===
echo.
echo === מערכת סרטונים אוטומטית - התקנה ===
echo.

REM יצירת סביבה וירטואלית
python -m venv venv
call venv\Scripts\activate.bat

REM התקנת תלויות
pip install --upgrade pip
pip install -r requirements.txt

REM הגדרת מפתח API
REM צור מפתח חינמי ב: https://console.groq.com/keys
set GROQ_API_KEY=your-groq-api-key-here

echo.
echo === ההתקנה הושלמה ===
echo.
echo להרצה מלאה:
echo   venv\Scripts\activate.bat
echo   set GROQ_API_KEY=your-groq-api-key-here
echo   python main.py run-once
echo.
echo לממשק אישור:
echo   python main.py approve
echo.
pause
