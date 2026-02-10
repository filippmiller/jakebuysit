@echo off
REM Verify all services are working
echo ========================================
echo Verifying JakeBuysIt Setup
echo ========================================
echo.

cd %~dp0..\backend

echo [1/3] Testing database connection...
call npx tsx src/scripts/test-price-transaction.ts
if errorlevel 1 (
    echo   [FAILED] Database test failed
) else (
    echo   [PASSED] Database test passed!
)

echo.
echo [2/3] Testing SEO features...
call npx tsx src/scripts/test-seo.ts
if errorlevel 1 (
    echo   [FAILED] SEO test failed - migrations may not be applied
) else (
    echo   [PASSED] SEO test passed!
)

echo.
echo [3/3] Testing service endpoints...
timeout /t 2 /nobreak >nul
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo   [FAILED] Python AI not responding
) else (
    echo   [PASSED] Python AI responding
)

curl -s http://localhost:8080/health >nul 2>&1
if errorlevel 1 (
    echo   [FAILED] Backend not responding
) else (
    echo   [PASSED] Backend responding
)

curl -s http://localhost:3000/ >nul 2>&1
if errorlevel 1 (
    echo   [FAILED] Frontend not responding
) else (
    echo   [PASSED] Frontend responding
)

echo.
echo ========================================
echo Verification Complete
echo ========================================
pause
