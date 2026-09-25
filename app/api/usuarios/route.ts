import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool, { query } from '@/lib/db';

export async function GET() {
  const result = await query(
    `SELECT u.id, u.perfil_id, p.codigo AS perfil_nome, u.nome, u.email, u.cargo,
            u.ativo, u.criado_em,
            json_agg(json_build_object(
              'modulo', up.modulo, 'acesso', up.acesso,
              'inserir', up.inserir, 'alterar', up.alterar, 'excluir', up.excluir
            )) FILTER (WHERE up.modulo IS NOT NULL) AS permissoes
     FROM usuarios u
     JOIN perfis p ON u.perfil_id = p.id
     LEFT JOIN usuario_permissoes up ON up.usuario_id = u.id
     GROUP BY u.id, p.codigo
     ORDER BY u.criado_em`
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const { nome, email, senha, perfil_nome, cargo, permissoes } = await req.json();
  if (!nome || !email || !senha || !perfil_nome) {
    return NextResponse.json(
      { erro: 'nome, email, senha e perfil_nome são obrigatórios' },
      { status: 400 }
    );
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const perfilRes = await client.query('SELECT id FROM perfis WHERE codigo = $1', [perfil_nome]);
    if (!perfilRes.rows[0]) {
      await client.query('ROLLBACK');
      return NextResponse.json({ erro: 'Perfil não encontrado' }, { status: 400 });
    }

    const userRes = await client.query(
      `INSERT INTO usuarios (perfil_id, nome, email, senha_hash, cargo)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, cargo, ativo, criado_em`,
      [perfilRes.rows[0].id, nome.trim(), email.trim().toLowerCase(), senhaHash, cargo?.trim() || null]
    );
    const novoUsuario = userRes.rows[0];

    const modulos = ['dashboard','minhas_vendas','conferencia_vendedor','aprovacoes','repasses_admin','importar_erp','configuracoes'];
    const permsMap: Record<string, { acesso: boolean; inserir: boolean; alterar: boolean; excluir: boolean }> = {};
    (permissoes || []).forEach((p: { modulo: string; acesso: boolean; inserir: boolean; alterar: boolean; excluir: boolean }) => {
      permsMap[p.modulo] = p;
    });

    for (const modulo of modulos) {
      const p = permsMap[modulo] || { acesso: false, inserir: false, alterar: false, excluir: false };
      await client.query(
        `INSERT INTO usuario_permissoes (usuario_id, modulo, acesso, inserir, alterar, excluir)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [novoUsuario.id, modulo, p.acesso, p.inserir, p.alterar, p.excluir]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json(
      { ...novoUsuario, perfil_nome, permissoes: permissoes || [] },
      { status: 201 }
    );
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('unique') || msg.includes('usuarios_email_key')) {
      return NextResponse.json({ erro: 'Email já cadastrado' }, { status: 409 });
    }
    console.error('/api/usuarios POST:', err);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  } finally {
    client.release();
  }
}
