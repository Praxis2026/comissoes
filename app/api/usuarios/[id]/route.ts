import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool, { query } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { nome, cargo, senha, perfil_nome, permissoes } = await req.json();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (perfil_nome) {
      const perfilRes = await client.query('SELECT id FROM perfis WHERE codigo = $1', [perfil_nome]);
      if (perfilRes.rows[0]) {
        await client.query('UPDATE usuarios SET perfil_id = $1 WHERE id = $2', [perfilRes.rows[0].id, id]);
      }
    }

    const updates: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (nome) { updates.push(`nome = $${i++}`); vals.push(nome.trim()); }
    if (cargo !== undefined) { updates.push(`cargo = $${i++}`); vals.push(cargo?.trim() || null); }
    if (senha) {
      updates.push(`senha_hash = $${i++}`);
      vals.push(await bcrypt.hash(senha, 12));
    }
    if (updates.length > 0) {
      vals.push(id);
      await client.query(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${i}`, vals);
    }

    if (permissoes) {
      for (const p of permissoes as { modulo: string; acesso: boolean; inserir: boolean; alterar: boolean; excluir: boolean }[]) {
        await client.query(
          `INSERT INTO usuario_permissoes (usuario_id, modulo, acesso, inserir, alterar, excluir)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (usuario_id, modulo) DO UPDATE
           SET acesso=$3, inserir=$4, alterar=$5, excluir=$6`,
          [id, p.modulo, p.acesso, p.inserir, p.alterar, p.excluir]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('/api/usuarios/[id] PUT:', err);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await query('UPDATE usuarios SET ativo = false WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('/api/usuarios/[id] DELETE:', err);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
