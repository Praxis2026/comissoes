import { NextRequest, NextResponse } from 'next/server';
import pool, { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vendedorId = searchParams.get('vendedor_id');

  const where = vendedorId ? 'WHERE r.vendedor_id = $1' : '';
  const params = vendedorId ? [vendedorId] : [];

  const result = await query(
    `SELECT r.*,
            u.nome AS vendedor_nome,
            ub.nome AS registrado_por_nome,
            COALESCE(
              json_agg(l.id) FILTER (WHERE l.id IS NOT NULL), '[]'
            ) AS lancamentos_ids
     FROM repasses r
     JOIN usuarios u ON r.vendedor_id = u.id
     LEFT JOIN usuarios ub ON r.registrado_por = ub.id
     LEFT JOIN lancamentos_comissao l ON l.repasse_id = r.id
     ${where}
     GROUP BY r.id, u.nome, ub.nome
     ORDER BY r.data_repasse DESC`,
    params
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const adminId = req.headers.get('X-User-Id')!;
  const { vendedor_id, lancamentos_ids, data_repasse, comprovante_transacao, observacoes } = await req.json();

  if (!lancamentos_ids?.length) {
    return NextResponse.json({ erro: 'Selecione ao menos um lançamento' }, { status: 400 });
  }
  if (!comprovante_transacao?.trim()) {
    return NextResponse.json({ erro: 'Comprovante de transação é obrigatório' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const repasseIds: string[] = [];

    if (vendedor_id === 'TODOS') {
      const lancRes = await client.query(
        `SELECT id, vendedor_id FROM lancamentos_comissao WHERE id = ANY($1) AND status = 'CONFERIDO'`,
        [lancamentos_ids]
      );
      const grupos = new Map<string, string[]>();
      for (const l of lancRes.rows) {
        const g = grupos.get(l.vendedor_id) || [];
        g.push(l.id);
        grupos.set(l.vendedor_id, g);
      }
      for (const [vId, ids] of grupos) {
        const res = await client.query(
          'SELECT sp_liquidar_repasse_lote($1, $2, $3, $4, $5, $6) AS repasse_id',
          [vId, ids, data_repasse, comprovante_transacao.trim(), adminId, observacoes || null]
        );
        repasseIds.push(res.rows[0].repasse_id);
      }
    } else {
      const res = await client.query(
        'SELECT sp_liquidar_repasse_lote($1, $2, $3, $4, $5, $6) AS repasse_id',
        [vendedor_id, lancamentos_ids, data_repasse, comprovante_transacao.trim(), adminId, observacoes || null]
      );
      repasseIds.push(res.rows[0].repasse_id);
    }

    await client.query('COMMIT');

    const repassesRes = await query(
      `SELECT r.*, u.nome AS vendedor_nome,
              COALESCE(json_agg(l.id) FILTER (WHERE l.id IS NOT NULL), '[]') AS lancamentos_ids
       FROM repasses r
       JOIN usuarios u ON r.vendedor_id = u.id
       LEFT JOIN lancamentos_comissao l ON l.repasse_id = r.id
       WHERE r.id = ANY($1)
       GROUP BY r.id, u.nome`,
      [repasseIds]
    );

    return NextResponse.json(repassesRes.rows, { status: 201 });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erro: msg }, { status: 422 });
  } finally {
    client.release();
  }
}
