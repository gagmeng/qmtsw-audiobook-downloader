@echo off
cd /d "%~dp0"
title QMTSW Audio Downloader Web

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

echo Starting server at http://localhost:3211
echo.

echo Opening browser...
start http://localhost:3211
node server.js

pause
