@echo off
echo Starting ZenMeat Backend...
echo.

cd /d "%~dp0backend"

if not exist "node_modules" (
  echo Installing dependencies...
  npm install
  echo.
)

echo Starting server on http://localhost:3001
npm start
pause
