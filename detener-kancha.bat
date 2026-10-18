@echo off
title Kancha - detener
cd /d "%~dp0"
docker compose down
echo.
echo   Kancha quedo detenido. Los datos de prueba se vuelven a crear al iniciar.
echo.
pause
