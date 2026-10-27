# LandNova / BhoomiAI - 1-Click PowerShell Runner
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  BhoomiAI / LandNova - Cadastral GIS & Land Ownership System" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path $PSScriptRoot

# Open browser in background after 2 seconds
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:8000"
} | Out-Null

Write-Host "Web Application:   http://localhost:8000" -ForegroundColor Yellow
Write-Host "API Documentation: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting Uvicorn Server... (Press Ctrl+C to stop)" -ForegroundColor White
Write-Host ""

& ".\venv\Scripts\python.exe" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
