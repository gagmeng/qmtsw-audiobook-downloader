@echo off
cd /d "%~dp0"
title QMTSW Audio Downloader Web
if not defined QMTSW_PORT set QMTSW_PORT=3211

echo ============================================
echo   QMTSW Audio Downloader - Web Edition
echo ============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js v14+ from https://nodejs.org/
    pause
    exit /b 1
)

echo Starting server at http://localhost:%QMTSW_PORT%
echo.

echo Opening browser...
start http://localhost:%QMTSW_PORT%
node server.js

pause
