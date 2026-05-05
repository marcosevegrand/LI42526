# Gengis Khan — Start dev environment
# Starts the PostgreSQL container and runs both API + frontend in dev mode.

$ErrorActionPreference = 'Stop'

Write-Host "==> Starting PostgreSQL container..." -ForegroundColor Cyan
docker start gengiskhan-db | Out-Null

Write-Host "==> Waiting for database to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

Write-Host "==> Starting dev servers (API + frontend)..." -ForegroundColor Cyan
Write-Host "    API:      http://localhost:3001" -ForegroundColor Gray
Write-Host "    Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host ""

Set-Location $PSScriptRoot
pnpm dev
