@echo off
REM Next.js on Windows (not WSL) — avoids WSL2 bind EACCES on /mnt/c/ projects.
cd /d "%~dp0"
npm run dev:windows
