import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vendedorId = searchParams.get('vendedor_id');
  const status = searchParams.get('status');

  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (vendedorId) { conditions.push(`l.vendedor_id = $${i++}`); params.push(vendedorId); }
  if (status) { conditions.push(`l.status = $${i++}::status_lancamento_enum`); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT l.*,
            u.nome AS vendedor_nome,
            v.numero_documento, v.cliente_nome, v.data_venda,
            v.valor_total_venda, v.tipo_pagamento_entrada, v.codigo_venda
     FROM lancamentos_comissao l
     JOIN usuarios u ON l.vendedor_id = u.id
     JOIN vendas v ON l.venda_id = v.id
     ${where}
     ORDER BY v.data_venda DESC`,
    params
  );
  return NextResponse.json(result.rows);
}
