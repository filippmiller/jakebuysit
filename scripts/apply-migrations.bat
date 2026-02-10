@echo off
REM Apply all database migrations
echo Applying database migrations...
cd %~dp0..\backend

echo [1/4] Applying SEO migration...
psql -U postgres -d jakebuysit -f src/db/migrations/002_add_seo_and_search.sql
if errorlevel 1 echo   Already applied or error (continuing...)

echo [2/4] Applying price history migration...
psql -U postgres -d jakebuysit -f src/db/migrations/004_add_price_history.sql
if errorlevel 1 echo   Already applied or error (continuing...)

echo [3/4] Applying profit tracking migration...
psql -U postgres -d jakebuysit -f src/db/migrations/005_profit_tracking.sql
if errorlevel 1 echo   Already applied or error (continuing...)

echo [4/4] Applying serial numbers migration...
psql -U postgres -d jakebuysit -f src/db/migrations/007_serial_and_metadata.sql
if errorlevel 1 echo   Already applied or error (continuing...)

echo.
echo Migrations applied!
echo.
pause
