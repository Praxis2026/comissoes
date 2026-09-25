import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (req.headers.get('X-User-Perfil') !== 'ADMINISTRADOR') {
    return NextResponse.json({ erro: 'Apenas administradores podem aprovar lançamentos' }, { status: 403 });
  }
  const { id } = await params;
  const adminId = req.headers.get('X-User-Id')!;
  try {
    await query('CALL sp_aprovar_comissao($1, $2)', [id, adminId]);
    const result = await query('SELECT * FROM lancamentos_comissao WHERE id = $1', [id]);
    return NextResponse.json(result.rows[0]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erro: msg }, { status: 422 });
  }
}
