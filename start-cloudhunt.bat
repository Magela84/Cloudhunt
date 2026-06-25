@echo off
REM Double-click this file to start CloudHunt's dev server.
REM It jumps to the project folder, ensures Node is on PATH, and runs the app.
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
echo Starting CloudHunt dev server...
echo Open http://localhost:3000 (or 3001) in your browser once it says "Ready".
echo Press Ctrl+C in this window to stop the server.
echo.
call npm run dev
pause
