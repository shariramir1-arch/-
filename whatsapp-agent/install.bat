@echo off
rem Windows: double-click to install and run the bot
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Installing with winget...
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  if errorlevel 1 (
    echo.
    echo Please install Node.js from https://nodejs.org ^(LTS button^) and run this file again.
    start https://nodejs.org
    pause
    exit /b 1
  )
  echo.
  echo Node.js installed. Close this window and double-click install.bat again.
  pause
  exit /b 0
)

for /f %%v in ('node -p "process.versions.node.split('.')[0]"') do set NODEMAJOR=%%v
if %NODEMAJOR% LSS 20 (
  echo Node.js 20 or newer is required. Update it from https://nodejs.org
  start https://nodejs.org
  pause
  exit /b 1
)

echo Installing packages...
call npm install --no-audit --no-fund || goto :fail

set NEEDSETUP=0
if not exist .env set NEEDSETUP=1
if exist .env findstr /b /c:"ANTHROPIC_API_KEY=sk-ant-..." .env >nul && set NEEDSETUP=1
if "%NEEDSETUP%"=="1" call npm run setup || goto :fail

echo.
echo Test chat - type a message, "exit" to quit.
call npm run chat
pause
exit /b 0

:fail
echo Something failed - see the message above.
pause
exit /b 1
