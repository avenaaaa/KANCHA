@echo off
title Kancha - iniciar
cd /d "%~dp0"
echo.
echo   KANCHA - levantando la base de datos, la API y la app web
echo   La primera vez tarda entre 5 y 10 minutos. Las siguientes, menos de 1.
echo.

where docker >nul 2>&1 || (
  echo   No encuentro Docker. Instala Docker Desktop y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

docker info >nul 2>&1 || (
  echo   Docker Desktop no esta abierto.
  echo   Abrelo, espera a que abajo a la izquierda diga "Engine running" y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

if not exist ".env" copy ".env.example" ".env" >nul

docker compose up --build -d || (
  echo.
  echo   Algo fallo al levantar los contenedores. Copia el texto de arriba y pegaselo a Claude.
  pause
  exit /b 1
)

echo.
echo   Esperando a que la API responda...
powershell -NoProfile -Command "for($i=0;$i -lt 90;$i++){try{if((Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 http://localhost:3000/api/v1/health).StatusCode -eq 200){exit 0}}catch{}; Start-Sleep -Seconds 2}; exit 1" || (
  echo   La API no respondio en 3 minutos. Revisa el contenedor kancha-api en Docker Desktop.
  pause
  exit /b 1
)

start "" http://localhost:8080
echo.
echo   Listo. Kancha se abrio en tu navegador:
echo     App web ................ http://localhost:8080
echo     Documentacion de la API  http://localhost:3000/api/docs
echo.
echo   Cuentas de prueba (contrasena kancha2026):
echo     camila@kancha.cl   ignacio@kancha.cl   diego@kancha.cl
echo.
echo   Para apagar todo, haz doble clic en detener-kancha.bat
echo.
pause
