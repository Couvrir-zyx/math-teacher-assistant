@echo off
cd /d "%~dp0"
start "数学教师工作台预览服务" /min node server.mjs
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:4173/"
exit
