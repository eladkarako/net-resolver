@echo off
chcp 65001 2>nul >nul

"%~sdp0index.cmd" "%~1" "googledns"

exit /b %ErrorLevel%