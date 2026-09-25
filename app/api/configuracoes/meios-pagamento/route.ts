import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const result = await query('SELECT * FROM meios_pagamento ORDER BY ordem, criado_em');
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  if (req.headers.get('X-User-Perfil') !== 'ADMINISTRADOR') {
    return NextResponse.json({ erro: 'Apenas administradores podem gerenciar meios de pagamento' }, { status: 403 });
  }
  const { id, codigo, label, descricao, is_entrada_valida, ativo, ordem } = await req.json();
  const meioId = id || `mp-${Date.now()}`;
  const result = await query(
    `INSERT INTO meios_pagamento (id, codigo, label, descricao, is_entrada_valida, ativo, ordem)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE
     SET label=$3, descricao=$4, is_entrada_valida=$5, ativo=$6, ordem=$7
     RETURNING *`,
    [meioId, codigo.toUpperCase(), label, descricao || '', Boolean(is_entrada_valida), ativo !== false, ordem || 99]
  );
  return NextResponse.json(result.rows[0], { status: 201 });
}
