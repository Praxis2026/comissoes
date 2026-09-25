import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const ENUM_VALIDOS = ['PIX','DINHEIRO','DEBITO','CREDITO_AVISTA','BOLETO','CREDITO_PARCELADO','SEM_ENTRADA','OUTRO'] as const;

function normalizarTipoPagamento(tipo: string): string {
  return ENUM_VALIDOS.includes(tipo as typeof ENUM_VALIDOS[number]) ? tipo : 'OUTRO';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const perfil = req.headers.get('X-User-Perfil');
  const userId = req.headers.get('X-Impersonating') || req.headers.get('X-User-Id')!;
  const isAdmin = perfil === 'ADMINISTRADOR';

  // Non-admins can only see their own vendas
  const vendedorId = isAdmin ? searchParams.get('vendedor_id') : userId;

  const whereClause = vendedorId ? 'WHERE v.vendedor_id = $1' : '';
  const params = vendedorId ? [vendedorId] : [];

  const result = await pool.query(
    `SELECT v.*, u.nome AS vendedor_nome,
            l.id AS lancamento_id, l.status AS lancamento_status,
            l.valor_comissao_calculado, l.percentual_entrada_calculado,
            l.entrada_valida_considerada, l.aliquota_ou_fixo_aplicado,
            l.regra_aplicada_id, l.aprovado_por, l.aprovado_em,
            l.justificativa_rejeicao, l.repasse_id, l.conferido_em
     FROM vendas v
     JOIN usuarios u ON v.vendedor_id = u.id
     LEFT JOIN lancamentos_comissao l ON l.venda_id = v.id
     ${whereClause}
     ORDER BY v.numero_sequencial DESC`,
    params
  );

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const perfil = req.headers.get('X-User-Perfil');
  const userId = req.headers.get('X-Impersonating') || req.headers.get('X-User-Id')!;
  const isAdmin = perfil === 'ADMINISTRADOR';

  const body = await req.json();
  const { numero_documento, cliente_nome, data_venda, valor_total_venda,
          valor_entrada_valida, tipo_pagamento_entrada, procedimentos, vendedor_id } = body;

  // Non-admins can only create vendas for themselves
  const vendId = isAdmin && vendedor_id ? vendedor_id : userId;
  const tipo = normalizarTipoPagamento(tipo_pagamento_entrada);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const vendaRes = await client.query(
      `INSERT INTO vendas (vendedor_id, numero_documento, cliente_nome, data_venda,
        valor_total_venda, valor_entrada_valida, tipo_pagamento_entrada, procedimentos)
       VALUES ($1, $2, $3, $4, $5, $6, $7::tipo_pagamento_entrada_enum, $8)
       RETURNING *`,
      [vendId, numero_documento, cliente_nome, data_venda,
       valor_total_venda, valor_entrada_valida || 0, tipo, procedimentos || null]
    );
    const venda = vendaRes.rows[0];

    await client.query('SELECT * FROM sp_calcular_comissao_venda($1)', [venda.id]);

    const lancRes = await client.query(
      `SELECT l.*, u.nome AS vendedor_nome
       FROM lancamentos_comissao l
       JOIN usuarios u ON l.vendedor_id = u.id
       WHERE l.venda_id = $1`,
      [venda.id]
    );

    await client.query('COMMIT');
    return NextResponse.json({ venda, lancamento: lancRes.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Nenhuma regra')) {
      return NextResponse.json({ erro: msg }, { status: 422 });
    }
    console.error('/api/vendas POST:', err);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  } finally {
    client.release();
  }
}
