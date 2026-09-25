import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vendedorId = searchParams.get('vendedor_id');

  const where = vendedorId ? 'WHERE r.vendedor_id = $1' : '';
  const params = vendedorId ? [vendedorId] : [];

  const result = await pool.query(
    `SELECT r.*, u.nome AS vendedor_nome,
            COALESCE(
              json_agg(json_build_object(
                'id', f.id, 'regra_id', f.regra_id,
                'percentual_entrada_min', f.percentual_entrada_min,
                'percentual_entrada_max', f.percentual_entrada_max,
                'percentual_comissao', f.percentual_comissao
              ) ORDER BY f.percentual_entrada_min) FILTER (WHERE f.id IS NOT NULL), '[]'
            ) AS faixas
     FROM regras_comissao_vendedor r
     JOIN usuarios u ON r.vendedor_id = u.id
     LEFT JOIN faixas_entrada_comissao f ON f.regra_id = r.id
     ${where}
     GROUP BY r.id, u.nome
     ORDER BY r.vigencia_inicio DESC`,
    params
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  if (req.headers.get('X-User-Perfil') !== 'ADMINISTRADOR') {
    return NextResponse.json({ erro: 'Apenas administradores podem criar regras' }, { status: 403 });
  }
  const { vendedor_id, tipo_comissao, valor_fixo, vigencia_inicio, faixas } = await req.json();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE regras_comissao_vendedor
       SET vigencia_fim = ($1::date - INTERVAL '1 day')::date
       WHERE vendedor_id = $2 AND vigencia_fim IS NULL`,
      [vigencia_inicio, vendedor_id]
    );

    const regraRes = await client.query(
      `INSERT INTO regras_comissao_vendedor
         (vendedor_id, tipo_comissao, valor_fixo, vigencia_inicio)
       VALUES ($1, $2::tipo_comissao_enum, $3, $4)
       RETURNING *`,
      [vendedor_id, tipo_comissao, valor_fixo || 0, vigencia_inicio]
    );
    const regra = regraRes.rows[0];

    if (faixas?.length) {
      for (const f of faixas as { percentual_entrada_min: number; percentual_entrada_max: number | null; percentual_comissao: number }[]) {
        await client.query(
          `INSERT INTO faixas_entrada_comissao
             (regra_id, percentual_entrada_min, percentual_entrada_max, percentual_comissao)
           VALUES ($1, $2, $3, $4)`,
          [regra.id, f.percentual_entrada_min, f.percentual_entrada_max ?? null, f.percentual_comissao]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ ...regra, faixas: faixas || [] }, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('/api/regras POST:', err);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  } finally {
    client.release();
  }
}
