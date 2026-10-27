@echo off
title LandNova / BhoomiAI - Cadastral GIS & Land Ownership System
echo ======================================================================
echo   BhoomiAI / LandNova - Cadastral GIS & Land Ownership System
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/2] Launching browser to http://localhost:8000 ...
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8000"

echo [2/2] Starting backend and web server...
echo.
echo Application URL:  http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.
echo (Press CTRL+C to stop the server)
echo ======================================================================
echo.

.\venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
pause
