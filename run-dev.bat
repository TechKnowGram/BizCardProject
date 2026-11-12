@echo off
echo Starting BizCard Backend and Frontend...

start "BizCard Backend (Port 8001)" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001"
start "BizCard Frontend (Port 3001)" cmd /k "cd /d %~dp0frontend && npm run dev -- --port 3001"

echo Backend: http://127.0.0.1:8001/docs
echo Frontend: http://localhost:3001
echo Servers started in separate windows!
