import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { vigencia_fim } = await req.json();
  await pool.query(
    'UPDATE regras_comissao_vendedor SET vigencia_fim = $1 WHERE id = $2',
    [vigencia_fim, id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await pool.query('DELETE FROM regras_comissao_vendedor WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('/api/regras/[id] DELETE:', err);
    return NextResponse.json({ erro: 'Regra em uso por lançamentos existentes' }, { status: 409 });
  }
}
