@echo off
title UCNL Notifications Backend Service
echo ========================================================
echo  Iniciando Servidor Backend de Notificaciones UCNL
echo ========================================================
echo.
cd /d "%~dp0"
node server.js
pause
