import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signJwt } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, senha } = await req.json();
    if (!email || !senha) {
      return NextResponse.json({ erro: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const result = await query(
      `SELECT u.*, p.codigo AS perfil_nome
       FROM usuarios u
       JOIN perfis p ON u.perfil_id = p.id
       WHERE LOWER(u.email) = LOWER($1) AND u.ativo = true`,
      [email]
    );

    const usuario = result.rows[0];
    if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
      return NextResponse.json({ erro: 'Email ou senha incorretos' }, { status: 401 });
    }

    const permResult = await query(
      'SELECT modulo, acesso, inserir, alterar, excluir FROM usuario_permissoes WHERE usuario_id = $1',
      [usuario.id]
    );

    const token = await signJwt({ sub: usuario.id, perfil: usuario.perfil_nome, nome: usuario.nome });

    const usuarioPublico = {
      id: usuario.id,
      perfil_id: usuario.perfil_id,
      perfil_nome: usuario.perfil_nome,
      nome: usuario.nome,
      email: usuario.email,
      cargo: usuario.cargo,
      ativo: usuario.ativo,
      criado_em: usuario.criado_em,
      permissoes: permResult.rows,
    };

    const res = NextResponse.json({ usuario: usuarioPublico });
    res.cookies.set('jwt', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 8,
      path: '/',
    });
    return res;
  } catch (err) {
    console.error('/api/auth/login:', err);
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 });
  }
}
