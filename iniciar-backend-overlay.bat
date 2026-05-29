@echo off
REM Backend Klivo — processa overlay de equipas/sponsors no PC (FFmpeg).
REM Telemovel e PC na mesma Wi-Fi.

cd /d "%~dp0"

where ffmpeg >nul 2>&1
if errorlevel 1 (
  echo FFmpeg nao encontrado. Instala: winget install Gyan.FFmpeg
  pause
  exit /b 1
)

echo.
echo === Klivo backend (overlay no PC) ===
echo URL: http://localhost:4000
echo Health: http://localhost:4000/health
echo.
echo No telemovel, config.ts:
echo   ENABLE_SERVER_CLIP_OVERLAY = true
echo   API_BASE_URL = "http://TEU_IP:4000"
echo.

npm start
