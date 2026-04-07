@echo off
echo ============================================
echo   PetroAlianza - Actualizar Sistema
echo ============================================
echo.
echo   IMPORTANTE: Asegurese de haber reemplazado
echo   los archivos del proyecto con la nueva
echo   version ANTES de ejecutar este script.
echo.
echo   La carpeta data\ NO debe ser reemplazada
echo   (contiene la base de datos).
echo.
pause

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    pause
    exit /b 1
)

echo [1/4] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion de dependencias.
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas.
echo.

echo [2/4] Actualizando base de datos...
call npm run db:push
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la actualizacion de la base de datos.
    pause
    exit /b 1
)
echo [OK] Base de datos actualizada.
echo.

echo [3/4] Compilando aplicacion...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la compilacion.
    pause
    exit /b 1
)
echo [OK] Aplicacion compilada.
echo.

echo ============================================
echo   Actualizacion completada!
echo.
echo   Ejecute scripts\start.bat para iniciar.
echo ============================================
pause
