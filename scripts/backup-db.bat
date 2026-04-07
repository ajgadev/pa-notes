@echo off
echo ============================================
echo   PetroAlianza - Backup de Base de Datos
echo ============================================
echo.

if not exist "data\petroalianza.db" (
    echo [ERROR] No se encontro la base de datos en data\petroalianza.db
    pause
    exit /b 1
)

:: Create backups directory
if not exist "backups" mkdir backups

:: Generate timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%%datetime:~10,2%%datetime:~12,2%

set BACKUP_FILE=backups\petroalianza_%TIMESTAMP%.db

copy "data\petroalianza.db" "%BACKUP_FILE%"

if %errorlevel% equ 0 (
    echo [OK] Backup creado: %BACKUP_FILE%
) else (
    echo [ERROR] Fallo al crear el backup.
)

echo.
pause
