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
set GEMINI_API_KEY=AIzaSyAexfrE6NnY7bjb-3pID5VzbSUPxkIX7t4

echo.
echo === ההתקנה הושלמה ===
echo.
echo להרצה מלאה:
echo   venv\Scripts\activate.bat
echo   set GEMINI_API_KEY=AIzaSyAexfrE6NnY7bjb-3pID5VzbSUPxkIX7t4
echo   python main.py run-once
echo.
echo לממשק אישור:
echo   python main.py approve
echo.
pause
