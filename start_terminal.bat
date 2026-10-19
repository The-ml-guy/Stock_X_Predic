@echo off
title Stock_X Institutional Terminal
echo ==========================================================
echo   STOCK_X: INSTITUTIONAL FORECASTING & ORDERBLOCK TERMINAL
echo ==========================================================
echo.
echo [1/2] Checking Python Virtual Environment...
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found in .venv!
    pause
    exit /b 1
)

echo [2/2] Starting Uvicorn Server on http://127.0.0.1:8000 ...
echo.
echo Terminal URL: http://127.0.0.1:8000
echo.

start "" "http://127.0.0.1:8000"
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload

pause
