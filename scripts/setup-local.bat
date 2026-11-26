@echo off
rem Bam dup file nay de cai va chay LIBRIVO tren may moi.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-local.ps1" %*
echo.
pause
