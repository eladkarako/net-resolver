@echo off
chcp 65001 2>nul >nul


::pre-cleanup (solves repeating-override problem).
set "EXIT_CODE=0"
set "NODE="
set "SCRIPT="
set "ARG="


::--------------------------------------------------------------------------------------


::system-PATH 'node.exe'.
echo [INFO] looking for node.exe ...                                         1>&2
set "NODE=%~sdp0node.exe"
if exist %NODE%                                       ( goto LOCAL_NODE     )
for /f "tokens=*" %%a in ('where node.exe 2^>nul') do ( set "NODE=%%a"      )
if ["%ErrorLevel%"] NEQ ["0"]                         ( goto ERROR_NONODE   )
if ["%NODE%"] EQU [""]                                ( goto ERROR_NONODE   )
for /f %%a in ("%NODE%")                           do ( set "NODE=%%~fsa"   )
if not exist %NODE%                                   ( goto ERROR_NONODE   )
:LOCAL_NODE
echo [INFO] %NODE%                                                           1>&2
echo [INFO] Done.                                                            1>&2
echo.                                                                        1>&2


::--------------------------------------------------------------------------------------


::local 'index.js'.
echo [INFO] looking for 'index.js' ...                                       1>&2
set "SCRIPT=%~sdp0index.js"
for /f %%a in ("%SCRIPT%")                         do ( set "SCRIPT=%%~fsa" )
if not exist %SCRIPT%                                 ( goto ERROR_NOSCRIPT )
echo [INFO] %SCRIPT%                                                         1>&2
echo [INFO] Done.                                                            1>&2
echo.                                                                        1>&2


::--------------------------------------------------------------------------------------


::argument-validating (non-empty). NO PROCESSING, forward as is - NodeJS is better handling path-resolving.
echo [INFO] looking for an argument...                                       1>&2
set ARG=%*
if ["%~1"] EQU [""]                                   ( goto ERROR_NOARG    )
echo [INFO] %ARG%                                                            1>&2
echo [INFO] Done.                                                            1>&2
echo.                                                                        1>&2


::--------------------------------------------------------------------------------------


::title "%NODE%" "%SCRIPT%" %ARG%
echo.                              1>&2
echo [INFO] calling:               1>&2
echo  "%NODE%" "%SCRIPT%" %ARG%    1>&2
echo.                              1>&2
echo [INFO] program output:        1>&2
echo ----------------------------- 1>&2
call  "%NODE%" "%SCRIPT%" %ARG%
set "EXIT_CODE=%ErrorLevel%"
echo ----------------------------- 1>&2
echo [INFO] Done.                  1>&2

echo.                              1>&2

if ["%EXIT_CODE%"] NEQ ["0"]                          ( goto ERROR_NODEJS   )


echo. 1>&2
echo [INFO] program finished successfully. 1>&2


goto END


::--------------------------------------------------------------------------------------


:ERROR_NONODE
  set "EXIT_CODE=111"
  echo [ERROR] node.exe - can not find it. 1>&2


:ERROR_NOSCRIPT
  set "EXIT_CODE=222"
  echo [ERROR] index.js - not exist in this folder. 1>&2
  goto END


:ERROR_NOARG
  set "EXIT_CODE=333"
  echo [ERROR] argument - empty or missing. 1>&2
  goto END


:ERROR_NODEJS
  echo [ERROR] program finished with errors. 1>&2
  goto END


:END
  echo exit code: [%EXIT_CODE%]. 1>&2
  echo.                          1>&2
  pause                          1>&2
  exit /b %EXIT_CODE%


::--------------------------------------------------------------------------------------
::  Exit codes
::    0        success.                                         node.exe found in system-PATH, index.js found locally, argument supplied (non-empty), index.js and node.exe finished with an exit-code "0" (success).
::
::    Errors:
::    ----------
::    From 'index.cmd':
::    ---------------------------
::    111      node.exe - not found in system-PATH.             get it from https://nodejs.org/download/nightly/  (choose version, download node.exe from the 'win-x86/' folder).
::    222      index.js - not found locally.                    check you have it.
::    333      argument - missing or empty.                     provide a non-empty argument.
::
::    From 'index.js' (NodeJS):
::    ---------------------------
::    444      is a file-read error.
::    555      is a file-write error.
::    1/other  JavaScript syntax-error or unexpected thrown-exception by NodeJS itself.
::
::  Get the most-updated version of this batch file at:
::  https://gist.github.com/eladkarako/bd47e2e233aaa3d4ed22269bd4f74c96#file-nodejs-batch-file-pre-launch-with-single-argument-cmd 
::--------------------------------------------------------------------------------------

