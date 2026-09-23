#!/usr/bin/env bash

# ====================================================================
# SCRIPT DE IMPLANTAÇÃO LOCAL POSTGRESQL (LINUX / macOS)
# ====================================================================

set -e

DB_NAME="${PGDATABASE:-comissoes_db}"
DB_USER="${PGUSER:-postgres}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"

echo "=========================================================="
echo "🚀 IMPLANTAÇÃO LOCAL DO BANCO POSTGRESQL - COMISSÕES PRO"
echo "=========================================================="
echo "Host:     $DB_HOST:$DB_PORT"
echo "Banco:    $DB_NAME"
echo "Usuário:  $DB_USER"
echo "=========================================================="

# 1. Verifica se psql está disponível
if command -v psql &> /dev/null; then
    echo "🔍 Verificando/criando banco de dados '$DB_NAME'..."
    PGPASSWORD="${PGPASSWORD:-postgres}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    PGPASSWORD="${PGPASSWORD:-postgres}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\" ENCODING 'UTF8';"

    echo "▶️  Executando migrations via script Node.js..."
    node scripts/migrate.mjs
else
    echo "⚠️  Comando 'psql' não encontrado no PATH do sistema."
    echo "▶️  Tentando executar migrations diretamente via Node.js..."
    node scripts/migrate.mjs
fi

echo "=========================================================="
echo "✅ Implantação concluída com sucesso!"
echo "=========================================================="
