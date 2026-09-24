import {
  CalculoComissaoResultado,
  LancamentoComissao,
  MEIOS_ENTRADA_VALIDOS,
  RegraComissaoVendedor,
  Repasse,
  StatusLancamento,
  TipoPagamentoEntrada,
  Usuario,
  Venda,
} from './types';
import { formatarDataBR, formatarMoedaBR } from './utils';
import { gerarPermissoesPadrao } from './permissions';

// ====================================================================
// FUNÇÃO CENTRAL DE CÁLCULO (Espelho exato da Stored Procedure PL/pgSQL)
// ====================================================================
export function calcularComissao(
  venda: Pick<Venda, 'valor_total_venda' | 'valor_entrada_valida' | 'tipo_pagamento_entrada' | 'data_venda'>,
  regra: RegraComissaoVendedor,
  meiosValidos: TipoPagamentoEntrada[] = MEIOS_ENTRADA_VALIDOS,
  aliquotaResidual: number = 0
): CalculoComissaoResultado {
  // 1. Validação do meio de pagamento para a entrada
  const isMeioValido = meiosValidos.includes(venda.tipo_pagamento_entrada);
  const entradaValidaConsiderada = isMeioValido
    ? Math.max(0, Number(venda.valor_entrada_valida) || 0)
    : 0;

  // 2. Percentual de entrada
  const valorTotal = Math.max(0, Number(venda.valor_total_venda) || 0);
  const percentualEntrada =
    valorTotal > 0 ? (entradaValidaConsiderada / valorTotal) * 100 : 0;

  // 3. Validação de vigência
  const dataVenda = venda.data_venda;
  const vigenciaValida =
    dataVenda >= regra.vigencia_inicio &&
    (!regra.vigencia_fim || dataVenda <= regra.vigencia_fim);

  if (!vigenciaValida) {
    return {
      sucesso: false,
      mensagem: `A regra selecionada não está vigente na data da venda (${formatarDataBR(dataVenda)}). Vigência: ${formatarDataBR(regra.vigencia_inicio)} a ${regra.vigencia_fim ? formatarDataBR(regra.vigencia_fim) : 'Indeterminada'}.`,
      regra_id: regra.id,
      tipo_comissao: regra.tipo_comissao,
      valor_base: valorTotal,
      entrada_valida: entradaValidaConsiderada,
      percentual_entrada: Number(percentualEntrada.toFixed(2)),
      aliquota_ou_fixo: 0,
      valor_comissao: 0,
    };
  }

  // 4. Modelo: VALOR FIXO
  if (regra.tipo_comissao === 'VALOR_FIXO') {
    const fixo = Number(regra.valor_fixo) || 0;
    return {
      sucesso: true,
      mensagem: `Comissão fixa por venda aplicada: ${formatarMoedaBR(fixo, true)}`,
      regra_id: regra.id,
      tipo_comissao: 'VALOR_FIXO',
      valor_base: valorTotal,
      entrada_valida: entradaValidaConsiderada,
      percentual_entrada: Number(percentualEntrada.toFixed(2)),
      aliquota_ou_fixo: fixo,
      valor_comissao: fixo,
      detalhe_faixa: `Valor Fixo Nominal por Contrato (${formatarMoedaBR(fixo, true)})`,
    };
  }

  // 5. Modelo: ESCALONADO POR ENTRADA
  const faixas = [...(regra.faixas || [])].sort(
    (a, b) => b.percentual_entrada_min - a.percentual_entrada_min
  );

  const faixaEncontrada = faixas.find((f) => {
    const minAtendido = percentualEntrada >= f.percentual_entrada_min;
    const maxAtendido =
      f.percentual_entrada_max === null ||
      f.percentual_entrada_max === undefined ||
      percentualEntrada <= f.percentual_entrada_max;
    return minAtendido && maxAtendido;
  });

  if (faixaEncontrada) {
    const aliquota = Number(faixaEncontrada.percentual_comissao);
    const comissao = Number(((valorTotal * aliquota) / 100).toFixed(2));
    const tetoDesc =
      faixaEncontrada.percentual_entrada_max !== null
        ? ` até ${faixaEncontrada.percentual_entrada_max}%`
        : ' sem teto';

    return {
      sucesso: true,
      mensagem: `Faixa identificada: Entrada ≥ ${faixaEncontrada.percentual_entrada_min}%${tetoDesc} -> Alíquota de ${aliquota}%`,
      regra_id: regra.id,
      tipo_comissao: 'ESCALONADO_ENTRADA',
      valor_base: valorTotal,
      entrada_valida: entradaValidaConsiderada,
      percentual_entrada: Number(percentualEntrada.toFixed(2)),
      aliquota_ou_fixo: aliquota,
      valor_comissao: comissao,
      detalhe_faixa: `Faixa: ≥ ${faixaEncontrada.percentual_entrada_min}% -> Alíquota ${aliquota}%`,
    };
  }

  // 6. Faixa Residual (< 10% ou menor que o mínimo configurado)
  const comissaoResidual = Number(((valorTotal * aliquotaResidual) / 100).toFixed(2));
  return {
    sucesso: true,
    mensagem: `Percentual de entrada (${percentualEntrada.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%) abaixo das faixas mínimas cadastradas. Aplicada alíquota residual de ${aliquotaResidual.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%.`,
    regra_id: regra.id,
    tipo_comissao: 'ESCALONADO_ENTRADA',
    valor_base: valorTotal,
    entrada_valida: entradaValidaConsiderada,
    percentual_entrada: Number(percentualEntrada.toFixed(2)),
    aliquota_ou_fixo: aliquotaResidual,
    valor_comissao: comissaoResidual,
    detalhe_faixa: `Faixa Residual Padrão: ${aliquotaResidual.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}% de comissão`,
  };
}

// ====================================================================
// DADOS INICIAIS DE DEMONSTRAÇÃO (Cenário Corporativo Completo)
// ====================================================================
export const USUARIOS_INICIAIS: Usuario[] = [
  {
    id: 'u-admin-01',
    perfil_id: 1,
    perfil_nome: 'ADMINISTRADOR',
    nome: 'Carlos Eduardo Mendes',
    email: 'carlos.mendes@empresa.com.br',
    cargo: 'Diretor Financeiro & Controladoria',
    senha: 'admin',
    senha_atualizada_em: '2026-01-01T08:00:00Z',
    ativo: true,
    criado_em: '2026-01-01T08:00:00Z',
    permissoes: gerarPermissoesPadrao('ADMINISTRADOR'),
  },
  {
    id: 'u-vend-01',
    perfil_id: 2,
    perfil_nome: 'VENDEDOR',
    nome: 'Lucas Silva Prado',
    email: 'lucas.prado@empresa.com.br',
    cargo: 'Consultor Comercial Sênior',
    senha: '123',
    senha_atualizada_em: '2026-01-05T09:00:00Z',
    ativo: true,
    criado_em: '2026-01-05T09:00:00Z',
    permissoes: gerarPermissoesPadrao('VENDEDOR'),
  },
  {
    id: 'u-vend-02',
    perfil_id: 2,
    perfil_nome: 'VENDEDOR',
    nome: 'Mariana Costa Ferreira',
    email: 'mariana.costa@empresa.com.br',
    cargo: 'Especialista em Harmonização & Vendas',
    senha: '123',
    senha_atualizada_em: '2026-01-10T10:00:00Z',
    ativo: true,
    criado_em: '2026-01-10T10:00:00Z',
    permissoes: gerarPermissoesPadrao('VENDEDOR'),
  },
  {
    id: 'u-vend-03',
    perfil_id: 2,
    perfil_nome: 'VENDEDOR',
    nome: 'Roberto Antunes Lima',
    email: 'roberto.lima@empresa.com.br',
    cargo: 'Representante de Implantes & Odonto',
    senha: '123',
    senha_atualizada_em: '2026-02-01T11:00:00Z',
    ativo: true,
    criado_em: '2026-02-01T11:00:00Z',
    permissoes: gerarPermissoesPadrao('VENDEDOR'),
  },
];

export const REGRAS_INICIAIS: RegraComissaoVendedor[] = [
  {
    id: 'reg-01-lucas-atual',
    vendedor_id: 'u-vend-01',
    vendedor_nome: 'Lucas Silva Prado',
    tipo_comissao: 'ESCALONADO_ENTRADA',
    valor_fixo: 0,
    vigencia_inicio: '2026-01-01',
    vigencia_fim: null, // vigência aberta
    criado_em: '2026-01-01T10:00:00Z',
    faixas: [
      { id: 1, regra_id: 'reg-01-lucas-atual', percentual_entrada_min: 30, percentual_entrada_max: null, percentual_comissao: 1.0 },
      { id: 2, regra_id: 'reg-01-lucas-atual', percentual_entrada_min: 20, percentual_entrada_max: 29.99, percentual_comissao: 0.8 },
      { id: 3, regra_id: 'reg-01-lucas-atual', percentual_entrada_min: 10, percentual_entrada_max: 19.99, percentual_comissao: 0.5 },
      { id: 4, regra_id: 'reg-01-lucas-atual', percentual_entrada_min: 0, percentual_entrada_max: 9.99, percentual_comissao: 0.0 },
    ],
  },
  {
    id: 'reg-02-mariana-atual',
    vendedor_id: 'u-vend-02',
    vendedor_nome: 'Mariana Costa Ferreira',
    tipo_comissao: 'ESCALONADO_ENTRADA',
    valor_fixo: 0,
    vigencia_inicio: '2026-01-01',
    vigencia_fim: null,
    criado_em: '2026-01-01T10:00:00Z',
    faixas: [
      { id: 5, regra_id: 'reg-02-mariana-atual', percentual_entrada_min: 35, percentual_entrada_max: null, percentual_comissao: 1.2 },
      { id: 6, regra_id: 'reg-02-mariana-atual', percentual_entrada_min: 25, percentual_entrada_max: 34.99, percentual_comissao: 0.9 },
      { id: 7, regra_id: 'reg-02-mariana-atual', percentual_entrada_min: 10, percentual_entrada_max: 24.99, percentual_comissao: 0.6 },
      { id: 8, regra_id: 'reg-02-mariana-atual', percentual_entrada_min: 0, percentual_entrada_max: 9.99, percentual_comissao: 0.0 },
    ],
  },
  {
    id: 'reg-03-roberto-fixo',
    vendedor_id: 'u-vend-03',
    vendedor_nome: 'Roberto Antunes Lima',
    tipo_comissao: 'VALOR_FIXO',
    valor_fixo: 75.0, // R$ 75 por venda
    vigencia_inicio: '2026-01-01',
    vigencia_fim: null,
    criado_em: '2026-01-01T10:00:00Z',
    faixas: [],
  },
];

export const VENDAS_E_LANCAMENTOS_INICIAIS: {
  vendas: Venda[];
  lancamentos: LancamentoComissao[];
} = {
  vendas: [
    {
      id: 'vd-101',
      numero_sequencial: 1,
      codigo_venda: 'VEN-0001',
      vendedor_id: 'u-vend-01',
      vendedor_nome: 'Lucas Silva Prado',
      numero_documento: 'PROT-2026/8921',
      cliente_nome: 'Dra. Camila Alencar',
      procedimentos: 'Harmonização Facial (3 regiões) + Preenchimento Labial',
      data_venda: '2026-09-02',
      valor_total_venda: 45000.0,
      valor_entrada_valida: 15000.0, // 33.33% -> Faixa >= 30% -> 1.0% = R$ 450.00
      tipo_pagamento_entrada: 'PIX',
      criado_em: '2026-09-02T14:30:00Z',
    },
    {
      id: 'vd-102',
      numero_sequencial: 2,
      codigo_venda: 'VEN-0002',
      vendedor_id: 'u-vend-01',
      vendedor_nome: 'Lucas Silva Prado',
      numero_documento: 'PROT-2026/8940',
      cliente_nome: 'Hospital Odontológico Estrela',
      procedimentos: 'Implante Dentário Conexão Cônica (2 elementos) e Enxerto',
      data_venda: '2026-09-05',
      valor_total_venda: 28000.0,
      valor_entrada_valida: 6000.0, // 21.43% -> Faixa >= 20% e < 30% -> 0.8% = R$ 224.00
      tipo_pagamento_entrada: 'DEBITO',
      criado_em: '2026-09-05T16:10:00Z',
    },
    {
      id: 'vd-103',
      numero_sequencial: 3,
      codigo_venda: 'VEN-0003',
      vendedor_id: 'u-vend-01',
      vendedor_nome: 'Lucas Silva Prado',
      numero_documento: 'PROT-2026/8965',
      cliente_nome: 'Clínica Bem Estar Saúde',
      procedimentos: 'Tratamento Dermatológico a Laser Fracionado 5 Sessões',
      data_venda: '2026-09-10',
      valor_total_venda: 18500.0,
      valor_entrada_valida: 2500.0, // 13.51% -> Faixa >= 10% e < 20% -> 0.5% = R$ 92.50
      tipo_pagamento_entrada: 'DINHEIRO',
      criado_em: '2026-09-10T11:00:00Z',
    },
    {
      id: 'vd-104',
      numero_sequencial: 4,
      codigo_venda: 'VEN-0004',
      vendedor_id: 'u-vend-01',
      vendedor_nome: 'Lucas Silva Prado',
      numero_documento: 'PROT-2026/8988',
      cliente_nome: 'Centro Cirúrgico Aliança',
      procedimentos: 'Cirurgia Plástica Reparadora e Pós-Operatório Integrado',
      data_venda: '2026-09-14',
      valor_total_venda: 80000.0,
      valor_entrada_valida: 30000.0, // 37.5% -> 1.0% = R$ 800.00
      tipo_pagamento_entrada: 'CREDITO_AVISTA',
      criado_em: '2026-09-14T09:20:00Z',
    },
    {
      id: 'vd-105',
      numero_sequencial: 5,
      codigo_venda: 'VEN-0005',
      vendedor_id: 'u-vend-01',
      vendedor_nome: 'Lucas Silva Prado',
      numero_documento: 'NF-9012',
      cliente_nome: 'Farmácia e Drogaria Vida',
      procedimentos: 'Fornecimento de Injetáveis e Toxina Botulínica 100UI',
      data_venda: '2026-09-18',
      valor_total_venda: 12000.0,
      valor_entrada_valida: 2000.0, // 16.67%, porém meio BOLETO! Meio não aceito para entrada válida -> % = 0 -> Aliquota 0%
      tipo_pagamento_entrada: 'BOLETO',
      criado_em: '2026-09-18T15:00:00Z',
    },
    {
      id: 'vd-201',
      numero_sequencial: 6,
      codigo_venda: 'VEN-0006',
      vendedor_id: 'u-vend-02',
      vendedor_nome: 'Mariana Costa Ferreira',
      numero_documento: 'PROT-2026/9022',
      cliente_nome: 'Instituto Integrado de Saúde',
      procedimentos: 'Protocolo de Lentes em Resina Composta 10 elementos',
      data_venda: '2026-09-08',
      valor_total_venda: 52000.0,
      valor_entrada_valida: 20000.0, // 38.46% -> >= 35% -> 1.2% = R$ 624.00
      tipo_pagamento_entrada: 'PIX',
      criado_em: '2026-09-08T10:15:00Z',
    },
    {
      id: 'vd-301',
      numero_sequencial: 7,
      codigo_venda: 'VEN-0007',
      vendedor_id: 'u-vend-03',
      vendedor_nome: 'Roberto Antunes Lima',
      numero_documento: 'PROT-2026/4410',
      cliente_nome: 'Laboratório Diagnose Avançada',
      procedimentos: 'Exames Genéticos e Painel Preventivo Molecular',
      data_venda: '2026-09-12',
      valor_total_venda: 15000.0,
      valor_entrada_valida: 0,
      tipo_pagamento_entrada: 'SEM_ENTRADA',
      criado_em: '2026-09-12T13:40:00Z',
    },
  ],
  lancamentos: [
    {
      id: 'lc-101',
      venda_id: 'vd-101',
      vendedor_id: 'u-vend-01',
      vendedor_nome: 'Lucas Silva Prado',
      regra_aplicada_id: 'reg-01-lucas-atual',
      valor_base_calculo: 45000.0,
      percentual_entrada_calculado: 33.33,
      entrada_valida_considerada: 15000.0,
      aliquota_ou_fixo_aplicado: 1.0,
      tipo_regra_aplicada: 'ESCALONADO_ENTRADA',
      valor_comissao_calculado: 450.0,
      status: 'LIQUIDADO',
      aprovado_por: 'u-admin-01',
      aprovado_em: '2026-09-03T10:00:00Z',
      repasse_id: 'rep-001',
    },
    {
      id: 'lc-102',
      venda_id: 'vd-102',
      vendedor_id: 'u-vend-01',
      vendedor_nome: 'Lucas Silva Prado',
      regra_aplicada_id: 'reg-01-lucas-atual',
      valor_base_calculo: 28000.0,
      percentual_entrada_calculado: 21.43,
      entrada_valida_considerada: 6000.0,
      aliquota_ou_fixo_aplicado: 0.8,
      tipo_regra_aplicada: 'ESCALONADO_ENTRADA',
      valor_comissao_calculado: 224.0,
      status: 'CONFERIDO',
      aprovado_por: 'u-admin-01',
      aprovado_em: '2026-09-06T11:20:00Z',
    },
    {
      id: 'lc-103',
      venda_id: 'vd-103',
      vendedor_id: 'u-vend-01',
      vendedor_nome: 'Lucas Silva Prado',
      regra_aplicada_id: 'reg-01-lucas-atual',
      valor_base_calculo: 18500.0,
      percentual_entrada_calculado: 13.51,
      entrada_valida_considerada: 2500.0,
      aliquota_ou_fixo_aplicado: 0.5,
      tipo_regra_aplicada: 'ESCALONADO_ENTRADA',
      valor_comissao_calculado: 92.5,
      status: 'APROVADO',
      aprovado_por: 'u-admin-01',
      aprovado_em: '2026-09-11T09:40:00Z',
    },
    {
      id: 'lc-104',
      venda_id: 'vd-104',
      vendedor_id: 'u-vend-01',
      vendedor_nome: 'Lucas Silva Prado',
      regra_aplicada_id: 'reg-01-lucas-atual',
      valor_base_calculo: 80000.0,
      percentual_entrada_calculado: 37.5,
      entrada_valida_considerada: 30000.0,
      aliquota_ou_fixo_aplicado: 1.0,
      tipo_regra_aplicada: 'ESCALONADO_ENTRADA',
      valor_comissao_calculado: 800.0,
      status: 'PENDENTE_APROVACAO',
    },
    {
      id: 'lc-105',
      venda_id: 'vd-105',
      vendedor_id: 'u-vend-01',
      vendedor_nome: 'Lucas Silva Prado',
      regra_aplicada_id: 'reg-01-lucas-atual',
      valor_base_calculo: 12000.0,
      percentual_entrada_calculado: 0.0,
      entrada_valida_considerada: 0.0,
      aliquota_ou_fixo_aplicado: 0.0,
      tipo_regra_aplicada: 'ESCALONADO_ENTRADA',
      valor_comissao_calculado: 0.0,
      status: 'RASCUNHO',
    },
    {
      id: 'lc-201',
      venda_id: 'vd-201',
      vendedor_id: 'u-vend-02',
      vendedor_nome: 'Mariana Costa Ferreira',
      regra_aplicada_id: 'reg-02-mariana-atual',
      valor_base_calculo: 52000.0,
      percentual_entrada_calculado: 38.46,
      entrada_valida_considerada: 20000.0,
      aliquota_ou_fixo_aplicado: 1.2,
      tipo_regra_aplicada: 'ESCALONADO_ENTRADA',
      valor_comissao_calculado: 624.0,
      status: 'CONFERIDO',
      aprovado_por: 'u-admin-01',
      aprovado_em: '2026-09-09T14:00:00Z',
    },
    {
      id: 'lc-301',
      venda_id: 'vd-301',
      vendedor_id: 'u-vend-03',
      vendedor_nome: 'Roberto Antunes Lima',
      regra_aplicada_id: 'reg-03-roberto-fixo',
      valor_base_calculo: 15000.0,
      percentual_entrada_calculado: 0.0,
      entrada_valida_considerada: 0.0,
      aliquota_ou_fixo_aplicado: 75.0,
      tipo_regra_aplicada: 'VALOR_FIXO',
      valor_comissao_calculado: 75.0,
      status: 'APROVADO',
      aprovado_por: 'u-admin-01',
      aprovado_em: '2026-09-13T10:00:00Z',
    },
  ],
};

export const REPASSES_INICIAIS: Repasse[] = [
  {
    id: 'rep-001',
    vendedor_id: 'u-vend-01',
    vendedor_nome: 'Lucas Silva Prado',
    data_repasse: '2026-09-04',
    valor_total_repassado: 450.0,
    comprovante_transacao: 'PIX-E2E-20260904-8921B',
    registrado_por: 'u-admin-01',
    registrado_por_nome: 'Carlos Eduardo Mendes',
    criado_em: '2026-09-04T16:00:00Z',
    lancamentos_ids: ['lc-101'],
    observacoes: 'Repasse quinzenal referente a vendas auditadas e conferidas.',
  },
];
