import { NextRequest, NextResponse } from 'next/server';
import { signJwt } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const adminPerfil = req.headers.get('X-User-Perfil');
  const adminId = req.headers.get('X-User-Id');

  if (adminPerfil !== 'ADMINISTRADOR') {
    return NextResponse.json({ erro: 'Apenas administradores podem impersonar usuários' }, { status: 403 });
  }

  const { usuario_id } = await req.json();

  if (!usuario_id || typeof usuario_id !== 'string') {
    return NextResponse.json({ erro: 'usuario_id é obrigatório' }, { status: 400 });
  }

  if (usuario_id === adminId) {
    return NextResponse.json({ erro: 'Não é possível impersonar a si mesmo' }, { status: 400 });
  }

  const result = await query(
    `SELECT u.*, p.codigo AS perfil_nome FROM usuarios u
     JOIN perfis p ON u.perfil_id = p.id
     WHERE u.id = $1 AND u.ativo = true`,
    [usuario_id]
  );

  if (!result.rows[0]) {
    return NextResponse.json({ erro: 'Usuário alvo não encontrado' }, { status: 404 });
  }

  const u = result.rows[0];
  const token = await signJwt({ sub: u.id, perfil: u.perfil_nome, nome: u.nome });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('jwt-impersonate', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8,
    path: '/',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('jwt-impersonate', '', { maxAge: 0, path: '/' });
  return res;
}
