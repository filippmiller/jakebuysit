@echo off
echo ========================================
echo JakeBuysIt - Automated Setup Script
echo ========================================
echo.

REM Check Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.12+
    pause
    exit /b 1
)

REM Check PostgreSQL is installed
psql --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PostgreSQL not found. Please install PostgreSQL
    pause
    exit /b 1
)

REM Check Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js
    pause
    exit /b 1
)

echo [STEP 1/5] Upgrading Python dependencies...
cd services
pip install --upgrade --quiet pydantic pydantic-core fastapi uvicorn anthropic structlog httpx
if errorlevel 1 (
    echo [WARNING] Some packages failed to install, but continuing...
)
cd ..

echo [STEP 2/5] Applying database migrations...
cd backend
psql -U postgres -d jakebuysit -f src/db/migrations/002_add_seo_and_search.sql >nul 2>&1
psql -U postgres -d jakebuysit -f src/db/migrations/004_add_price_history.sql >nul 2>&1
psql -U postgres -d jakebuysit -f src/db/migrations/005_profit_tracking.sql >nul 2>&1
psql -U postgres -d jakebuysit -f src/db/migrations/007_serial_and_metadata.sql >nul 2>&1
echo   Migrations applied (errors ignored if already applied)
cd ..

echo [STEP 3/5] Testing database connection...
cd backend
call npx tsx src/scripts/test-price-transaction.ts >nul 2>&1
if errorlevel 1 (
    echo   [WARNING] Database test failed - check PostgreSQL is running
) else (
    echo   Database test PASSED!
)
cd ..

echo [STEP 4/5] Starting services...
echo   - Python AI Services (port 8000)
start "Python AI Services" cmd /k "cd services && python main.py"
timeout /t 3 /nobreak >nul

echo   - Backend API (port 8093)
start "Backend API" cmd /k "cd backend && set PORT=8093 && npm run dev"
timeout /t 3 /nobreak >nul

echo   - Frontend (port 3013)
start "Frontend" cmd /k "cd web && set PORT=3013 && npm run dev"
timeout /t 5 /nobreak >nul

echo [STEP 5/5] Verifying services...
echo   Checking Python AI...
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo   [WARNING] Python AI not responding yet (may still be starting)
) else (
    echo   Python AI: OK
)

echo   Checking Backend...
curl -s http://localhost:8093/health >nul 2>&1
if errorlevel 1 (
    curl -s http://localhost:8080/health >nul 2>&1
    if errorlevel 1 (
        echo   [WARNING] Backend not responding yet
    ) else (
        echo   Backend: OK (port 8080)
    )
) else (
    echo   Backend: OK (port 8093)
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Services running:
echo   Python AI:  http://localhost:8000
echo   Backend:    http://localhost:8093 (or 8080)
echo   Frontend:   http://localhost:3013 (or 3000)
echo.
echo Open your browser to:
echo   http://localhost:3013
echo.
echo Press any key to open browser...
pause >nul
start http://localhost:3013
echo.
echo Services are running in separate windows.
echo Close those windows to stop the services.
echo.
pause
