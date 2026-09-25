import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const cfgRes = await query(
    "SELECT * FROM configuracoes_sistema WHERE id = 'GLOBAL_CONFIG'"
  );
  const meiosRes = await query(
    'SELECT * FROM meios_pagamento ORDER BY ordem, criado_em'
  );

  const cfg = cfgRes.rows[0] || {};
  const meios = meiosRes.rows;
  const validos = meios.filter((m) => m.is_entrada_valida && m.ativo).map((m) => m.codigo);

  return NextResponse.json({
    nome_empresa: cfg.nome_empresa || 'Praxis Comissionamentos',
    logo_url: cfg.logo_url || null,
    percentual_comissao_padrao_residual: Number(cfg.percentual_comissao_padrao_residual || 0),
    exigir_aprovacao_gestor: cfg.exigir_aprovacao_gestor ?? true,
    exigir_conferencia_vendedor: cfg.exigir_conferencia_vendedor ?? true,
    trava_estorno_apenas_admin: cfg.trava_estorno_apenas_admin ?? true,
    dias_alerta_expiracao_vigencia: cfg.dias_alerta_expiracao_vigencia ?? 30,
    procedimentos_catalogo: cfg.procedimentos_catalogo || [],
    meios_pagamento_catalogo: meios,
    meios_pagamento_entrada_validos: validos,
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const {
    nome_empresa, logo_url, percentual_comissao_padrao_residual,
    exigir_aprovacao_gestor, exigir_conferencia_vendedor,
    trava_estorno_apenas_admin, dias_alerta_expiracao_vigencia,
    procedimentos_catalogo,
  } = body;

  await query(
    `UPDATE configuracoes_sistema SET
       nome_empresa = COALESCE($1, nome_empresa),
       logo_url = $2,
       percentual_comissao_padrao_residual = COALESCE($3, percentual_comissao_padrao_residual),
       exigir_aprovacao_gestor = COALESCE($4, exigir_aprovacao_gestor),
       exigir_conferencia_vendedor = COALESCE($5, exigir_conferencia_vendedor),
       trava_estorno_apenas_admin = COALESCE($6, trava_estorno_apenas_admin),
       dias_alerta_expiracao_vigencia = COALESCE($7, dias_alerta_expiracao_vigencia),
       procedimentos_catalogo = COALESCE($8, procedimentos_catalogo),
       atualizado_em = CURRENT_TIMESTAMP
     WHERE id = 'GLOBAL_CONFIG'`,
    [
      nome_empresa, logo_url ?? undefined,
      percentual_comissao_padrao_residual,
      exigir_aprovacao_gestor, exigir_conferencia_vendedor,
      trava_estorno_apenas_admin, dias_alerta_expiracao_vigencia,
      procedimentos_catalogo ? JSON.stringify(procedimentos_catalogo) : undefined,
    ]
  );
  return NextResponse.json({ ok: true });
}
