@echo off
chcp 65001 >nul
cd /d "%~dp0"
where python >nul 2>nul && (python src\server\app.py) || (py -3 src\server\app.py)
pause
