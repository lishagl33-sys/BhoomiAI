@echo off
title BhoomiSetu - Intelligent Land Record Digitization System
echo ======================================================================
echo   BHOOMISETU - Autonomous Land Record Digitization & Validation System
echo   National Cadastral GIS, Indic OCR & Blockchain Mutation Network
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/2] Verifying Python Virtual Environment...
if not exist "venv\Scripts\python.exe" (
    echo Creating virtual environment...
    py -3.11 -m venv venv
    call venv\Scripts\activate.bat
    pip install -r backend\requirements.txt
)

echo [2/2] Checking Server Port 8000...
echo.
echo ======================================================================
echo   Web Dashboard:  http://localhost:8000
echo   API Docs:       http://localhost:8000/docs
echo   Network IP:     http://127.0.0.1:8000
echo ======================================================================
echo.

:: Automatically open browser in 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8000"

:: Check if port 8000 is already active
netstat -ano | findstr :8000 >nul
if %ERRORLEVEL% EQU 0 (
    echo Server is already running on port 8000. Opened browser!
    pause
    exit /b 0
)

:: Start Uvicorn server
.\venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8000
pause
