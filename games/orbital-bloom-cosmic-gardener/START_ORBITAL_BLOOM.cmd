@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel% equ 0 (
    start "Orbital Bloom Server" /min python -m http.server 4174 --bind 127.0.0.1
) else (
    where py >nul 2>nul
    if %errorlevel% neq 0 (
        echo Python is required to launch Orbital Bloom.
        echo Install Python, then run this launcher again.
        pause
        exit /b 1
    )
    start "Orbital Bloom Server" /min py -m http.server 4174 --bind 127.0.0.1
)

timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:4174/"
endlocal
