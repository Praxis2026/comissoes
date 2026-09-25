import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('X-User-Id');
  const impersonating = req.headers.get('X-Impersonating');
  const effectiveId = impersonating || userId;

  if (!effectiveId) {
    return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });
  }

  const result = await query(
    `SELECT u.*, p.codigo AS perfil_nome
     FROM usuarios u
     JOIN perfis p ON u.perfil_id = p.id
     WHERE u.id = $1 AND u.ativo = true`,
    [effectiveId]
  );

  if (!result.rows[0]) {
    return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });
  }

  const permResult = await query(
    'SELECT modulo, acesso, inserir, alterar, excluir FROM usuario_permissoes WHERE usuario_id = $1',
    [effectiveId]
  );

  const u = result.rows[0];
  return NextResponse.json({
    usuario: {
      id: u.id,
      perfil_id: u.perfil_id,
      perfil_nome: u.perfil_nome,
      nome: u.nome,
      email: u.email,
      cargo: u.cargo,
      ativo: u.ativo,
      criado_em: u.criado_em,
      permissoes: permResult.rows,
    },
    adminOriginalId: impersonating ? userId : null,
  });
}
