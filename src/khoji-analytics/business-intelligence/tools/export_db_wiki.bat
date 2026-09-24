@echo off
setlocal

REM ====== CONFIG ======
set "PSQL_BIN=C:\Program Files\pgAdmin 4\runtime\psql.exe"

set "PGHOST=127.0.0.1"
set "PGPORT=5435"
set "PGUSER=khoji-admin"
set "PGPASSWORD=khoji"
set "PGDATABASE=khoji-admin"

set "SCHEMA=tenant_1001"
set "OUTDIR=docs"
===================

set "SCRIPT=%~dp0export_db_wiki.ps1"

if not exist "%SCRIPT%" (
  echo [ERROR] %SCRIPT% not found.
  exit /b 1
)

echo Using:
echo   PSQL_BIN=%PSQL_BIN%
echo   %PGHOST%:%PGPORT%  DB=%PGDATABASE%  USER=%PGUSER%
echo   SCHEMA=%SCHEMA%    OUTDIR=%OUTDIR%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set ERR=%ERRORLEVEL%
if not "%ERR%"=="0" (
  echo [ERROR] Export failed (exit code %ERR%).
  exit /b %ERR%
)

echo Done. Markdown written to %OUTDIR%
endlocal
