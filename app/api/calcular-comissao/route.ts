import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calcularComissao } from '@/lib/commission-engine';

export async function POST(req: NextRequest) {
  const perfil = req.headers.get('X-User-Perfil');
  const userId = req.headers.get('X-Impersonating') || req.headers.get('X-User-Id')!;
  const body = await req.json();
  const { valor_total_venda, valor_entrada_valida, data_venda, tipo_pagamento_entrada } = body;
  // Non-admins can only preview their own commission
  const vendedor_id = perfil === 'ADMINISTRADOR' ? (body.vendedor_id || userId) : userId;

  const regraRes = await query(
    `SELECT r.*, json_agg(json_build_object(
       'id', f.id, 'regra_id', f.regra_id,
       'percentual_entrada_min', f.percentual_entrada_min,
       'percentual_entrada_max', f.percentual_entrada_max,
       'percentual_comissao', f.percentual_comissao
     ) ORDER BY f.percentual_entrada_min) FILTER (WHERE f.id IS NOT NULL) AS faixas
     FROM regras_comissao_vendedor r
     LEFT JOIN faixas_entrada_comissao f ON f.regra_id = r.id
     WHERE r.vendedor_id = $1
       AND r.vigencia_inicio <= $2
       AND (r.vigencia_fim IS NULL OR r.vigencia_fim >= $2)
     GROUP BY r.id
     ORDER BY r.vigencia_inicio DESC
     LIMIT 1`,
    [vendedor_id, data_venda]
  );

  if (!regraRes.rows[0]) {
    return NextResponse.json({ sucesso: false, mensagem: 'Nenhuma regra vigente para este vendedor nesta data.' });
  }

  const meiosRes = await query(
    'SELECT codigo FROM meios_pagamento WHERE is_entrada_valida = true AND ativo = true'
  );
  const meiosValidos = meiosRes.rows.map((m) => m.codigo);

  const cfgRes = await query(
    "SELECT percentual_comissao_padrao_residual FROM configuracoes_sistema WHERE id = 'GLOBAL_CONFIG'"
  );
  const aliquotaResidual = Number(cfgRes.rows[0]?.percentual_comissao_padrao_residual || 0);

  const resultado = calcularComissao(
    { valor_total_venda, valor_entrada_valida, tipo_pagamento_entrada, data_venda },
    regraRes.rows[0],
    meiosValidos,
    aliquotaResidual
  );

  return NextResponse.json(resultado);
}
