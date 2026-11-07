# Starts the backend and the NLP service, each in its own window.
# Run it from the project root:  .\dev.ps1
$root = $PSScriptRoot
$python = if ($env:SRR_PYTHON) { $env:SRR_PYTHON } else { "C:\venvs\srr-nlp\Scripts\python.exe" }

if (-not (Test-Path $python)) {
  Write-Host "Python was not found at $python" -ForegroundColor Red
  Write-Host "Set SRR_PYTHON to the python.exe of your virtual environment and run this again."
  exit 1
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\nlp-service'; & '$python' -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "Started two windows."
Write-Host "Backend:     http://localhost:5000/api/health"
Write-Host "NLP service: http://127.0.0.1:8000/health"