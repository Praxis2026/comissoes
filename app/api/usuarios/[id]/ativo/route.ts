import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (req.headers.get('X-User-Perfil') !== 'ADMINISTRADOR') {
    return NextResponse.json({ erro: 'Apenas administradores podem acessar esta rota' }, { status: 403 });
  }
  const { id } = await params;
  const { ativo } = await req.json();
  await query('UPDATE usuarios SET ativo = $1 WHERE id = $2', [Boolean(ativo), id]);
  return NextResponse.json({ ok: true, ativo: Boolean(ativo) });
}
