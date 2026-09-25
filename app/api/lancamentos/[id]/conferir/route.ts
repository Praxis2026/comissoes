import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = req.headers.get('X-Impersonating') || req.headers.get('X-User-Id')!;
  try {
    await query('CALL sp_conferir_comissao($1, $2)', [id, userId]);
    const result = await query('SELECT * FROM lancamentos_comissao WHERE id = $1', [id]);
    return NextResponse.json(result.rows[0]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erro: msg }, { status: 422 });
  }
}
