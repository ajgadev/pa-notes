@echo off
echo ============================================
echo   PetroAlianza - Iniciando Sistema
echo ============================================
echo.

:: Check if built
if not exist "dist\server\entry.mjs" (
    echo [ERROR] La aplicacion no esta compilada.
    echo Ejecute primero: scripts\setup.bat
    pause
    exit /b 1
)

echo Iniciando servidor en http://localhost:4321
echo Presione Ctrl+C para detener.
echo.

:: Open browser after a short delay
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:4321"

:: Start server
node dist/server/entry.mjs
