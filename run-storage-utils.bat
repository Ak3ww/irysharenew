@echo off
echo 🚀 Iryshare Storage Management Utility
echo.

if "%1"=="" (
    echo Usage: run-storage-utils.bat [command]
    echo.
    echo Commands:
    echo   update  - Update existing users with 12GB storage
    echo   stats   - Show storage statistics  
    echo   all     - Run both update and stats
    echo.
    echo Example: run-storage-utils.bat all
    pause
    exit /b
)

echo Running command: %1
echo.

node storage-utils.js %1

echo.
pause
