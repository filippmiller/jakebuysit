@echo off
REM Install all dependencies properly
echo Installing Python dependencies in virtual environment...
cd %~dp0..\services

REM Activate venv and install
call venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt
pip install --upgrade pydantic==2.10.4 pydantic-core
deactivate

echo.
echo Python dependencies installed successfully!
echo.
pause
