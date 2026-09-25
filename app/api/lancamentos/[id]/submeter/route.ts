import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = req.headers.get('X-Impersonating') || req.headers.get('X-User-Id')!;
  const perfil = req.headers.get('X-User-Perfil');
  if (perfil !== 'ADMINISTRADOR') {
    const own = await query('SELECT vendedor_id FROM lancamentos_comissao WHERE id = $1', [id]);
    if (!own.rows[0] || own.rows[0].vendedor_id !== userId) {
      return NextResponse.json({ erro: 'Sem permissão para submeter este lançamento' }, { status: 403 });
    }
  }
  try {
    await query('CALL sp_submeter_aprovacao($1, $2)', [id, userId]);
    const result = await query('SELECT * FROM lancamentos_comissao WHERE id = $1', [id]);
    return NextResponse.json(result.rows[0]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erro: msg }, { status: 422 });
  }
}
