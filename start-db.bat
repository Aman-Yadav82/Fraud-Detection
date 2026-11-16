@echo off
echo Starting PostgreSQL server...
C:\Users\atulg\pgsql\bin\pg_ctl.exe -D C:\Users\atulg\pgsql\data -l C:\Users\atulg\pgsql\pg.log start
C:\Users\atulg\pgsql\bin\pg_ctl.exe -D C:\Users\atulg\pgsql\data status
pause
