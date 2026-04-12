@echo off
:: Navigate to project root (parent of scripts folder)
cd /d "%~dp0.."

echo ============================================
echo   PetroAlianza - Instalacion del Sistema
echo ============================================
echo.

:: Check for --prod flag
set SEED_FLAGS=
if "%1"=="--prod" set SEED_FLAGS=--prod

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo Descargue Node.js 22 LTS desde https://nodejs.org/
    pause
    exit /b 1
)

:: Check Node version
for /f "tokens=1 delims=." %%i in ('node -v') do set NODE_MAJOR=%%i
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% LSS 22 (
    echo [ERROR] Se requiere Node.js 22 o superior. Version actual:
    node -v
    echo Descargue Node.js 22 LTS desde https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js encontrado:
node -v
echo.

:: Install dependencies
echo Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion de dependencias.
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas.
echo.

:: Create data directory
if not exist "data" mkdir data

:: Push database schema
echo Creando base de datos...
call npm run db:push
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la creacion de la base de datos.
    pause
    exit /b 1
)
echo [OK] Base de datos creada.
echo.

:: Seed data
if defined SEED_FLAGS (
    echo Cargando datos iniciales (produccion - solo admin)...
    echo   Si tiene archivos CSV en data\ (departments.csv, vehicles.csv, personal.csv)
    echo   seran importados automaticamente.
) else (
    echo Cargando datos iniciales (desarrollo - datos demo)...
)
call npx tsx src/lib/seed.ts %SEED_FLAGS%
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la carga de datos iniciales.
    pause
    exit /b 1
)
echo [OK] Datos iniciales cargados.
echo.

:: Build
echo Compilando aplicacion...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la compilacion.
    pause
    exit /b 1
)
echo [OK] Aplicacion compilada.
echo.

echo ============================================
echo   Instalacion completada exitosamente!
echo.
echo   Para iniciar el sistema ejecute:
echo     scripts\start.bat
echo.
if defined SEED_FLAGS (
    echo   Usuario administrador:
    echo     admin / admin123
) else (
    echo   Usuarios por defecto:
    echo     admin / admin123
    echo     operador / op123
)
echo.
echo   IMPORTANTE: Cambie las contrasenas
echo   despues del primer inicio de sesion.
echo ============================================
pause
