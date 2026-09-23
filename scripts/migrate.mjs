#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Carrega variáveis de ambiente
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '../database/migrations');

// Configuração do Banco
const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'postgres'}:${encodeURIComponent(process.env.PGPASSWORD || 'postgres')}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'comissoes_db'}`;

function parseDbConfig(connStr) {
  try {
    const url = new URL(connStr);
    return {
      host: url.hostname || 'localhost',
      port: parseInt(url.port || '5432', 10),
      user: url.username || 'postgres',
      password: decodeURIComponent(url.password || 'postgres'),
      database: url.pathname.replace(/^\//, '') || 'comissoes_db',
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
    };
  } catch (err) {
    return {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'comissoes_db',
    };
  }
}

const dbConfig = parseDbConfig(connectionString);

async function ensureDatabaseExists() {
  console.log(`\n🔍 Verificando existência do banco de dados '${dbConfig.database}' no PostgreSQL...`);
  
  // Conecta ao banco padrão 'postgres' para checar se o banco alvo existe
  const maintenanceClient = new Client({
    ...dbConfig,
    database: 'postgres',
  });

  try {
    await maintenanceClient.connect();
    const res = await maintenanceClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1;`,
      [dbConfig.database]
    );

    if (res.rowCount === 0) {
      console.log(`📦 Banco de dados '${dbConfig.database}' não encontrado. Criando automaticamente...`);
      // CREATE DATABASE não pode rodar em bloco transacional
      await maintenanceClient.query(`CREATE DATABASE "${dbConfig.database}" ENCODING 'UTF8';`);
      console.log(`✅ Banco de dados '${dbConfig.database}' criado com sucesso!`);
    } else {
      console.log(`✅ Banco de dados '${dbConfig.database}' já existe.`);
    }
  } catch (err) {
    console.warn(`⚠️ Não foi possível verificar/criar banco via manutenção: ${err.message}. Tentando conexão direta...`);
  } finally {
    try {
      await maintenanceClient.end();
    } catch (_) {}
  }
}

async function runMigrations() {
  const isStatusOnly = process.argv.includes('status');
  console.log('='.repeat(65));
  console.log('🚀 EXECUTOR DE MIGRATIONS POSTGRESQL - COMISSÕES PRO');
  console.log('='.repeat(65));
  console.log(`📍 Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`🗄️  Banco Alvo: ${dbConfig.database}`);
  console.log(`👤 Usuário: ${dbConfig.user}`);
  console.log(`📁 Diretório de Migrations: ${MIGRATIONS_DIR}`);

  if (!isStatusOnly) {
    await ensureDatabaseExists();
  }

  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log(`🔌 Conectado com sucesso ao banco '${dbConfig.database}'!\n`);

    // Cria tabela de controle de migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64),
        execution_time_ms INT
      );
    `);

    // Busca migrations já executadas
    const appliedResult = await client.query(
      `SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC;`
    );
    const appliedMap = new Map(
      appliedResult.rows.map((row) => [row.version, row])
    );

    // Lê arquivos .sql na pasta migrations
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      throw new Error(`Diretório de migrations não encontrado: ${MIGRATIONS_DIR}`);
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('Nenhum arquivo de migration encontrado.');
      return;
    }

    console.log(`📋 Status das Migrations:`);
    console.log('-'.repeat(65));

    if (isStatusOnly) {
      for (const file of files) {
        const version = file.split('_')[0];
        const isApplied = appliedMap.has(version);
        const info = appliedMap.get(version);
        const status = isApplied
          ? `✅ APLICADA (${new Date(info.applied_at).toLocaleString('pt-BR')})`
          : `⏳ PENDENTE`;
        console.log(`  ${file.padEnd(45)} ${status}`);
      }
      console.log('-'.repeat(65));
      return;
    }

    let appliedCount = 0;

    for (const file of files) {
      const version = file.split('_')[0];
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');
      const checksum = crypto.createHash('sha256').update(sqlContent).digest('hex').substring(0, 16);

      if (appliedMap.has(version)) {
        console.log(`  ⏩ [PULANDO] ${file} (já executada)`);
        continue;
      }

      console.log(`  ▶️  [EXECUTANDO] ${file}...`);
      const startTime = Date.now();

      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        const duration = Date.now() - startTime;

        await client.query(
          `INSERT INTO schema_migrations (version, name, checksum, execution_time_ms) VALUES ($1, $2, $3, $4);`,
          [version, file, checksum, duration]
        );

        await client.query('COMMIT');
        console.log(`  ✨ [SUCESSO] ${file} aplicada em ${duration}ms!`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`\n❌ ERRO ao aplicar migration ${file}:`);
        console.error(err.message);
        throw err;
      }
    }

    console.log('-'.repeat(65));
    if (appliedCount > 0) {
      console.log(`🎉 Sucesso! ${appliedCount} migration(s) executada(s) com êxito.`);
      console.log(`🚀 Banco de dados PostgreSQL 100% atualizado e pronto para operação!`);
    } else {
      console.log(`👍 O banco de dados já está totalmente atualizado (nenhuma migration pendente).`);
    }
  } catch (err) {
    console.error('\n🚨 Falha na execução das migrations:');
    console.error(err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
