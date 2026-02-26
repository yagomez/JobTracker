@echo off
REM Initialize SQLite database (Windows)

if not exist data mkdir data
cd /d "%~dp0"

sqlite3 data\job_tracker.db < lib\db\schema.sql

echo.
echo Database initialized at data\job_tracker.db
pause
