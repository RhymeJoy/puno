@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js/npm is not installed or not in PATH.
    echo Please install Node.js LTS, then run this file again.
    pause
    exit /b 1
)

echo Checking npm dependencies...
if not exist package-lock.json (
    echo package-lock.json not found. Installing dependencies...
    call npm install
    if errorlevel 1 goto install_failed
) else (
    call npm ls --depth=0 >nul 2>&1
    if errorlevel 1 (
        echo Missing or invalid dependencies detected. Running npm install...
        call npm install
        if errorlevel 1 goto install_failed
    ) else (
        echo Dependencies are ready.
    )
)

for %%D in (.output dist .nuxt) do (
    if exist %%D rmdir /s /q %%D
)

call npm run generate
if errorlevel 1 goto generate_failed

echo Starting the development server and opening the browser...
call npm run dev -- --host --open

goto end

:install_failed
echo [ERROR] npm install failed.
pause
exit /b 1

:generate_failed
echo [ERROR] npm run generate failed.
pause
exit /b 1

:end
pause
endlocal
