import pg from 'pg';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgrespassword',
  database: process.env.PGDATABASE || 'comissoes_db',
});

async function seed() {
  const client = await pool.connect();
  try {
    // Verificar se já existe um admin
    const existing = await client.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [process.env.ADMIN_EMAIL || 'admin@empresa.com']
    );

    if (existing.rows.length > 0) {
      console.log('Admin já existe, pulando seed.');
      return;
    }

    const senhaHash = await bcrypt.hash(
      process.env.ADMIN_SENHA_INICIAL || 'admin123',
      12
    );

    // Buscar perfil ADMINISTRADOR
    const perfilRes = await client.query(
      "SELECT id FROM perfis WHERE codigo = 'ADMINISTRADOR'"
    );
    if (perfilRes.rows.length === 0) {
      throw new Error('Perfil ADMINISTRADOR não encontrado. Execute as migrations primeiro.');
    }
    const perfilId = perfilRes.rows[0].id;

    // Criar admin
    const adminRes = await client.query(
      `INSERT INTO usuarios (perfil_id, nome, email, senha_hash, cargo, ativo)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [perfilId, 'Administrador', process.env.ADMIN_EMAIL || 'admin@empresa.com', senhaHash, 'Administrador do Sistema']
    );
    const adminId = adminRes.rows[0].id;

    // Criar permissões completas para o admin
    const modulos = ['dashboard','minhas_vendas','conferencia_vendedor','aprovacoes','repasses_admin','importar_erp','configuracoes'];
    for (const modulo of modulos) {
      await client.query(
        `INSERT INTO usuario_permissoes (usuario_id, modulo, acesso, inserir, alterar, excluir)
         VALUES ($1, $2, true, true, true, true)`,
        [adminId, modulo]
      );
    }

    // Garantir configurações globais
    await client.query(
      `INSERT INTO configuracoes_sistema (id, nome_empresa)
       VALUES ('GLOBAL_CONFIG', $1)
       ON CONFLICT (id) DO NOTHING`,
      [process.env.NOME_EMPRESA || 'Praxis Comissionamentos']
    );

    // Seed meios de pagamento padrão
    const meiosPadrao = [
      { id: 'mp-pix', codigo: 'PIX', label: 'PIX Instantâneo', descricao: 'Transferência instantânea', is_entrada_valida: true, sistema_padrao: true, ordem: 1 },
      { id: 'mp-dinheiro', codigo: 'DINHEIRO', label: 'Dinheiro em Espécie', descricao: 'Pagamento físico em moeda corrente', is_entrada_valida: true, sistema_padrao: true, ordem: 2 },
      { id: 'mp-debito', codigo: 'DEBITO', label: 'Cartão de Débito', descricao: 'Liquidação bancária direta', is_entrada_valida: true, sistema_padrao: true, ordem: 3 },
      { id: 'mp-credito-avista', codigo: 'CREDITO_AVISTA', label: 'Cartão de Crédito à Vista (1x)', descricao: 'Operação de crédito sem parcelamento', is_entrada_valida: true, sistema_padrao: true, ordem: 4 },
      { id: 'mp-boleto', codigo: 'BOLETO', label: 'Boleto Bancário', descricao: 'Compensação sujeita a D+1 a D+3', is_entrada_valida: false, sistema_padrao: true, ordem: 5 },
      { id: 'mp-credito-parcelado', codigo: 'CREDITO_PARCELADO', label: 'Cartão de Crédito Parcelado (2x ou +)', descricao: 'Parcelamento futuro', is_entrada_valida: false, sistema_padrao: true, ordem: 6 },
      { id: 'mp-sem-entrada', codigo: 'SEM_ENTRADA', label: 'Sem Entrada (100% a Prazo)', descricao: 'Venda integralmente a prazo', is_entrada_valida: false, sistema_padrao: true, ordem: 7 },
    ];

    for (const m of meiosPadrao) {
      await client.query(
        `INSERT INTO meios_pagamento (id, codigo, label, descricao, is_entrada_valida, ativo, sistema_padrao, ordem)
         VALUES ($1, $2, $3, $4, $5, true, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [m.id, m.codigo, m.label, m.descricao, m.is_entrada_valida, m.sistema_padrao, m.ordem]
      );
    }

    console.log(`✓ Admin criado: ${process.env.ADMIN_EMAIL || 'admin@empresa.com'}`);
    console.log('✓ Configurações globais e meios de pagamento inicializados.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Erro no seed:', err.message);
  process.exit(1);
});
