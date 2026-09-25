import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const ENUM_VALIDOS = ['PIX','DINHEIRO','DEBITO','CREDITO_AVISTA','BOLETO','CREDITO_PARCELADO','SEM_ENTRADA','OUTRO'] as const;

function normalizarTipoPagamento(tipo: string): string {
  return ENUM_VALIDOS.includes(tipo as typeof ENUM_VALIDOS[number]) ? tipo : 'OUTRO';
}

async function checkOwnership(vendaId: string, userId: string, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  const res = await pool.query('SELECT vendedor_id FROM vendas WHERE id = $1', [vendaId]);
  return res.rows[0]?.vendedor_id === userId;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = req.headers.get('X-User-Perfil');
  const userId = req.headers.get('X-Impersonating') || req.headers.get('X-User-Id')!;
  const isAdmin = perfil === 'ADMINISTRADOR';

  if (!(await checkOwnership(id, userId, isAdmin))) {
    return NextResponse.json({ erro: 'Sem permissão para editar esta venda' }, { status: 403 });
  }

  const body = await req.json();
  const { numero_documento, cliente_nome, data_venda, valor_total_venda,
          valor_entrada_valida, tipo_pagamento_entrada, procedimentos } = body;

  const tipo = normalizarTipoPagamento(tipo_pagamento_entrada);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE vendas SET numero_documento=$1, cliente_nome=$2, data_venda=$3,
        valor_total_venda=$4, valor_entrada_valida=$5,
        tipo_pagamento_entrada=$6::tipo_pagamento_entrada_enum, procedimentos=$7
       WHERE id = $8`,
      [numero_documento, cliente_nome, data_venda, valor_total_venda,
       valor_entrada_valida || 0, tipo, procedimentos || null, id]
    );

    await client.query('SELECT * FROM sp_calcular_comissao_venda($1)', [id]);

    const vendaRes = await client.query('SELECT * FROM vendas WHERE id = $1', [id]);
    const lancRes = await client.query(
      'SELECT * FROM lancamentos_comissao WHERE venda_id = $1', [id]
    );

    await client.query('COMMIT');
    return NextResponse.json({ venda: vendaRes.rows[0], lancamento: lancRes.rows[0] });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('não é permitido') || msg.includes('Nenhuma regra')) {
      return NextResponse.json({ erro: msg }, { status: 422 });
    }
    console.error('/api/vendas/[id] PUT:', err);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = req.headers.get('X-User-Perfil');
  const userId = req.headers.get('X-Impersonating') || req.headers.get('X-User-Id')!;
  const isAdmin = perfil === 'ADMINISTRADOR';

  if (!(await checkOwnership(id, userId, isAdmin))) {
    return NextResponse.json({ erro: 'Sem permissão para excluir esta venda' }, { status: 403 });
  }

  try {
    await pool.query('DELETE FROM vendas WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('/api/vendas/[id] DELETE:', err);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
