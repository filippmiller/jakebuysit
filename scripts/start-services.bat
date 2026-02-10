@echo off
REM Start all services properly
echo ========================================
echo Starting JakeBuysIt Services
echo ========================================
echo.

cd %~dp0..

echo [1/3] Starting Python AI Services (port 8000)...
start "JakeBuysIt - Python AI" cmd /k "cd services && call venv\Scripts\activate.bat && python main.py"
timeout /t 5 /nobreak >nul

echo [2/3] Starting Backend API (port 8080)...
start "JakeBuysIt - Backend" cmd /k "cd backend && npm run dev"
timeout /t 5 /nobreak >nul

echo [3/3] Starting Frontend (port 3000)...
start "JakeBuysIt - Frontend" cmd /k "cd web && npm run dev"

echo.
echo ========================================
echo All services starting...
echo ========================================
echo.
echo   Python AI:  http://localhost:8000
echo   Backend:    http://localhost:8080
echo   Frontend:   http://localhost:3000
echo.
echo Wait 30 seconds for services to fully start,
echo then open: http://localhost:3000
echo.
pause
