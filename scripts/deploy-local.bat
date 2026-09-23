@echo off
REM ====================================================================
REM SCRIPT DE IMPLANTAÇÃO LOCAL POSTGRESQL (WINDOWS CMD / POWERSHELL)
REM ====================================================================

echo ==========================================================
echo IMPLANTACAO LOCAL DO BANCO POSTGRESQL - COMISSOES PRO
echo ==========================================================

set PGDATABASE=%PGDATABASE%
if "%PGDATABASE%"=="" set PGDATABASE=comissoes_db

set PGUSER=%PGUSER%
if "%PGUSER%"=="" set PGUSER=postgres

set PGHOST=%PGHOST%
if "%PGHOST%"=="" set PGHOST=localhost

set PGPORT=%PGPORT%
if "%PGPORT%"=="" set PGPORT=5432

echo Host:    %PGHOST%:%PGPORT%
echo Banco:   %PGDATABASE%
echo Usuario: %PGUSER%
echo ==========================================================

echo Executando migrations via Node.js...
node scripts/migrate.mjs

if %ERRORLEVEL% EQU 0 (
    echo ==========================================================
    echo Implantacao concluida com sucesso!
    echo ==========================================================
) else (
    echo ==========================================================
    echo Erro ao executar a implantacao! Verifique as credenciais do Postgres.
    echo ==========================================================
)
