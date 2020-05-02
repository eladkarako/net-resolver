@echo off
chcp 65001 2>nul >nul

"%~sdp0index.cmd" "%~1" "adguard"

exit /b %ErrorLevel%