@echo off
echo ========================================
echo Starting JakeBuysIt Services
echo ========================================
echo.

echo [1/3] Starting Python AI Services (port 8000)...
start "Python AI Services" cmd /k "cd services && python main.py"
timeout /t 3 /nobreak > nul

echo [2/3] Starting Backend Node.js (port 8093)...
start "Backend API" cmd /k "cd backend && set PORT=8093 && npm run dev"
timeout /t 3 /nobreak > nul

echo [3/3] Starting Frontend Next.js (port 3013)...
start "Frontend" cmd /k "cd web && set PORT=3013 && npm run dev"

echo.
echo ========================================
echo All services starting...
echo ========================================
echo Python AI:  http://localhost:8000
echo Backend:    http://localhost:8093
echo Frontend:   http://localhost:3013
echo ========================================
echo.
echo Press any key to stop all services...
pause > nul

echo Stopping services...
taskkill /FI "WINDOWTITLE eq Python AI Services*" /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq Backend API*" /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend*" /F > nul 2>&1
echo Services stopped.
