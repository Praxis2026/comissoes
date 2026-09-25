import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { label, descricao, is_entrada_valida, ativo, ordem } = await req.json();
  const result = await query(
    `UPDATE meios_pagamento
     SET label=$1, descricao=$2, is_entrada_valida=$3, ativo=$4, ordem=$5
     WHERE id = $6 RETURNING *`,
    [label, descricao || '', Boolean(is_entrada_valida), Boolean(ativo), ordem ?? 99, id]
  );
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await query('DELETE FROM meios_pagamento WHERE id = $1 AND sistema_padrao = false', [id]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: 'Não é possível excluir meio de pagamento em uso' }, { status: 409 });
  }
}
