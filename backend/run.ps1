# Usage (from backend/):  .\run.ps1          -> start API
#                         .\run.ps1 migrate  -> alembic upgrade head, then start API
Set-Location $PSScriptRoot
$py = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'

if ($args[0] -eq 'migrate') {
    & $py -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

& $py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
