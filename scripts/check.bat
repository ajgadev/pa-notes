@echo off
echo ============================================
echo   PetroAlianza - CI Local
echo ============================================
echo.

echo [1/3] Ejecutando tests con coverage...
call npm run test:coverage
if %errorlevel% neq 0 (
    echo [ERROR] Tests fallaron.
    pause
    exit /b 1
)
echo [OK] Tests pasaron.
echo.

echo [2/3] Compilando aplicacion...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build fallo.
    pause
    exit /b 1
)
echo [OK] Build exitoso.
echo.

echo ============================================
echo   Todas las verificaciones pasaron!
echo ============================================
pause
