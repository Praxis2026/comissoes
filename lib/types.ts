export type PerfilTipo = 'ADMINISTRADOR' | 'VENDEDOR' | 'GERENTE' | 'AUDITOR';

export type ModuloSistemaId =
  | 'dashboard'
  | 'minhas_vendas'
  | 'conferencia_vendedor'
  | 'aprovacoes'
  | 'repasses_admin'
  | 'importar_erp'
  | 'configuracoes'
  | 'stored_procedure';

export interface PermissaoModulo {
  modulo: ModuloSistemaId;
  acesso: boolean; // Visualizar / Acessar módulo
  inserir: boolean; // Inserir / Criar novos registros
  alterar: boolean; // Alterar / Editar registros
  excluir: boolean; // Excluir / Remover registros
}

export interface ModuloInfo {
  id: ModuloSistemaId;
  nome: string;
  categoria: 'Principal' | 'Comercial' | 'Gestão & Repasses' | 'Sistema';
  descricao: string;
  permiteInserir?: boolean;
  permiteAlterar?: boolean;
  permiteExcluir?: boolean;
}

export const MODULOS_SISTEMA: ModuloInfo[] = [
  {
    id: 'dashboard',
    nome: 'Dashboard & Indicadores',
    categoria: 'Principal',
    descricao: 'Visão consolidada de KPIs, faturamento comercial e comissões.',
    permiteInserir: true,
    permiteAlterar: false,
    permiteExcluir: false,
  },
  {
    id: 'minhas_vendas',
    nome: 'Minhas Vendas & Rascunhos',
    categoria: 'Comercial',
    descricao: 'Lançamento de propostas, gestão de rascunhos e envio para aprovação.',
    permiteInserir: true,
    permiteAlterar: true,
    permiteExcluir: true,
  },
  {
    id: 'conferencia_vendedor',
    nome: 'Conferência de Comissões',
    categoria: 'Comercial',
    descricao: 'Auditoria de cálculo de comissão, extrato analítico e aceite formal.',
    permiteInserir: true,
    permiteAlterar: true,
    permiteExcluir: false,
  },
  {
    id: 'aprovacoes',
    nome: 'Aprovações & Auditoria',
    categoria: 'Gestão & Repasses',
    descricao: 'Fila gerencial para análise, aprovação, rejeição ou estorno de comissões.',
    permiteInserir: true,
    permiteAlterar: true,
    permiteExcluir: true,
  },
  {
    id: 'repasses_admin',
    nome: 'Repasses Financeiros & Lotes',
    categoria: 'Gestão & Repasses',
    descricao: 'Fechamento de lotes de pagamento, liquidação bancária e emissão de recibos.',
    permiteInserir: true,
    permiteAlterar: true,
    permiteExcluir: true,
  },
  {
    id: 'importar_erp',
    nome: 'Importação ERP (Lote)',
    categoria: 'Gestão & Repasses',
    descricao: 'Carga e sincronização em lote de pedidos e notas fiscais faturadas.',
    permiteInserir: true,
    permiteAlterar: true,
    permiteExcluir: true,
  },
  {
    id: 'configuracoes',
    nome: 'Configurações do Sistema',
    categoria: 'Sistema',
    descricao: 'Gerenciamento de usuários, permissões, regras de vigência e meios de pagamento.',
    permiteInserir: true,
    permiteAlterar: true,
    permiteExcluir: true,
  },
  {
    id: 'stored_procedure',
    nome: 'DDL & Stored Procedure (SQL)',
    categoria: 'Sistema',
    descricao: 'Definições do banco PostgreSQL, Stored Procedure plpgsql e sandbox de simulação.',
    permiteInserir: true,
    permiteAlterar: true,
    permiteExcluir: false,
  },
];

export interface Usuario {
  id: string; // UUID
  perfil_id: number;
  perfil_nome: PerfilTipo;
  nome: string;
  email: string;
  cargo?: string;
  senha?: string; // Senha de acesso do usuário (pode ser alterada ou mantida se deixada em branco)
  senha_atualizada_em?: string; // Data/hora da última alteração de senha
  ativo: boolean; // Situação (ativo/inativo)
  criado_em: string;
  permissoes?: PermissaoModulo[];
}

export type TipoComissao = 'ESCALONADO_ENTRADA' | 'VALOR_FIXO';

export type TipoPagamentoEntrada =
  | 'PIX'
  | 'DINHEIRO'
  | 'DEBITO'
  | 'CREDITO_AVISTA'
  | 'BOLETO'
  | 'CREDITO_PARCELADO'
  | 'SEM_ENTRADA'
  | string;

export interface MeioPagamentoConfig {
  id: string; // Ex: 'mp-pix', 'mp-1727000'
  codigo: string; // Ex: 'PIX', 'DINHEIRO', 'TRANSFERENCIA'
  label: string; // Ex: 'PIX Instantâneo'
  descricao: string; // Detalhamento operacional
  is_entrada_valida: boolean; // Se pontua como entrada válida para a comissão
  ativo: boolean; // Se está disponível para seleção nas vendas
  sistema_padrao?: boolean; // Se é um meio nativo da especificação
  icone?: string;
  criado_em?: string;
}

export const MEIOS_PAGAMENTO_PADRAO: MeioPagamentoConfig[] = [
  {
    id: 'mp-pix',
    codigo: 'PIX',
    label: 'PIX Instantâneo',
    descricao: 'Transferência instantânea com compensação em tempo real na conta da clínica.',
    is_entrada_valida: true,
    ativo: true,
    sistema_padrao: true,
  },
  {
    id: 'mp-dinheiro',
    codigo: 'DINHEIRO',
    label: 'Dinheiro em Espécie',
    descricao: 'Pagamento físico em moeda corrente recolhido imediatamente no caixa da clínica.',
    is_entrada_valida: true,
    ativo: true,
    sistema_padrao: true,
  },
  {
    id: 'mp-debito',
    codigo: 'DEBITO',
    label: 'Cartão de Débito',
    descricao: 'Liquidação bancária direta em até 1 dia útil com garantia da adquirente.',
    is_entrada_valida: true,
    ativo: true,
    sistema_padrao: true,
  },
  {
    id: 'mp-credito-avista',
    codigo: 'CREDITO_AVISTA',
    label: 'Cartão de Crédito à Vista (1x)',
    descricao: 'Operação de crédito sem parcelamento, elegível para antecipação e garantia.',
    is_entrada_valida: true,
    ativo: true,
    sistema_padrao: true,
  },
  {
    id: 'mp-boleto',
    codigo: 'BOLETO',
    label: 'Boleto Bancário',
    descricao: 'Compensação sujeita a D+1 a D+3 e risco de inadimplência/não liquidação imediata.',
    is_entrada_valida: false,
    ativo: true,
    sistema_padrao: true,
  },
  {
    id: 'mp-credito-parcelado',
    codigo: 'CREDITO_PARCELADO',
    label: 'Cartão de Crédito Parcelado (2x ou +)',
    descricao: 'Parcelamento futuro; pela regra de negócio, não constitui entrada líquida imediata.',
    is_entrada_valida: false,
    ativo: true,
    sistema_padrao: true,
  },
  {
    id: 'mp-sem-entrada',
    codigo: 'SEM_ENTRADA',
    label: 'Sem Entrada (100% a Prazo)',
    descricao: 'Venda realizada integralmente faturada a prazo sem aporte inicial em caixa.',
    is_entrada_valida: false,
    ativo: true,
    sistema_padrao: true,
  },
];

export const MEIOS_ENTRADA_VALIDOS: string[] = [
  'PIX',
  'DINHEIRO',
  'DEBITO',
  'CREDITO_AVISTA',
];

export interface FaixaEntradaComissao {
  id: number;
  regra_id: string;
  percentual_entrada_min: number; // ex: 30.00
  percentual_entrada_max: number | null; // ex: null (sem teto) ou 29.99
  percentual_comissao: number; // ex: 1.00
}

export interface RegraComissaoVendedor {
  id: string; // UUID
  vendedor_id: string; // UUID
  vendedor_nome?: string;
  tipo_comissao: TipoComissao;
  valor_fixo: number; // Usado se tipo = 'VALOR_FIXO'
  vigencia_inicio: string; // YYYY-MM-DD
  vigencia_fim: string | null; // YYYY-MM-DD ou null
  faixas?: FaixaEntradaComissao[];
  criado_em: string;
}

export type StatusLancamento =
  | 'RASCUNHO'
  | 'PENDENTE_APROVACAO'
  | 'APROVADO'
  | 'REJEITADO'
  | 'CONFERIDO'
  | 'LIQUIDADO'
  | 'ESTORNADO';

export interface Venda {
  id: string; // UUID
  numero_sequencial?: number; // Ex: 1, 2, 3... (gerado automaticamente)
  codigo_venda?: string; // Ex: "VEN-0001" ou "#0001" (gerado automaticamente)
  vendedor_id: string; // UUID
  vendedor_nome?: string;
  numero_documento: string; // Ex: NF-10928 ou PED-4401
  cliente_nome: string;
  procedimentos?: string; // Detalhamento dos procedimentos realizados
  data_venda: string; // YYYY-MM-DD
  valor_total_venda: number;
  valor_entrada_valida: number;
  tipo_pagamento_entrada: TipoPagamentoEntrada;
  criado_em: string;
}

export interface LancamentoComissao {
  id: string; // UUID
  venda_id: string;
  vendedor_id: string;
  vendedor_nome?: string;
  regra_aplicada_id: string;
  valor_base_calculo: number; // geralmente valor_total_venda
  percentual_entrada_calculado: number; // % da entrada em relacao à venda
  entrada_valida_considerada: number;
  aliquota_ou_fixo_aplicado: number; // % ou R$ fixo
  tipo_regra_aplicada: TipoComissao;
  valor_comissao_calculado: number;
  status: StatusLancamento;
  aprovado_por?: string | null;
  aprovado_em?: string | null;
  justificativa_rejeicao?: string | null;
  repasse_id?: string | null;
  historico_estorno?: {
    motivo: string;
    data: string;
    por: string;
  } | null;
}

export interface Repasse {
  id: string; // UUID
  vendedor_id: string;
  vendedor_nome?: string;
  data_repasse: string; // YYYY-MM-DD
  valor_total_repassado: number;
  comprovante_transacao: string; // ex: TX-PIX-884912903
  registrado_por: string;
  registrado_por_nome?: string;
  criado_em: string;
  lancamentos_ids: string[];
  observacoes?: string;
}

export interface CalculoComissaoResultado {
  sucesso: boolean;
  mensagem: string;
  regra_id: string;
  tipo_comissao: TipoComissao;
  valor_base: number;
  entrada_valida: number;
  percentual_entrada: number;
  aliquota_ou_fixo: number;
  valor_comissao: number;
  detalhe_faixa?: string;
}

export interface ParametrosComissionamento {
  // Catálogo completo de meios de pagamento cadastrados (CRUD)
  meios_pagamento_catalogo: MeioPagamentoConfig[];
  // Meios de pagamento que pontuam como entrada válida (códigos ativos)
  meios_pagamento_entrada_validos: string[];
  // Percentual padrão quando a entrada não atinge nenhuma faixa (<10%)
  percentual_comissao_padrao_residual: number; // ex: 0.0
  // Exigência de aprovação prévia pelo administrador antes de conferência
  exigir_aprovacao_gestor: boolean; // default true
  // Exigência de conferência formal pelo vendedor antes da inclusão no lote de repasse
  exigir_conferencia_vendedor: boolean; // default true (Req 5.1)
  // Permitir estorno somente para perfil administrador
  trava_estorno_apenas_admin: boolean; // default true
  // Dias de antecedência para aviso de expiração de vigência contratual
  dias_alerta_expiracao_vigencia: number; // default 30
  // Procedimentos padrão cadastrados para preenchimento rápido
  procedimentos_catalogo: string[];
  // Identidade Visual & Logotipo da Empresa
  logo_url?: string | null;
  nome_empresa?: string;
}

export const PARAMETROS_COMISSIONAMENTO_PADRAO: ParametrosComissionamento = {
  meios_pagamento_catalogo: MEIOS_PAGAMENTO_PADRAO,
  meios_pagamento_entrada_validos: ['PIX', 'DINHEIRO', 'DEBITO', 'CREDITO_AVISTA'],
  percentual_comissao_padrao_residual: 0.0,
  exigir_aprovacao_gestor: true,
  exigir_conferencia_vendedor: true,
  trava_estorno_apenas_admin: true,
  dias_alerta_expiracao_vigencia: 30,
  logo_url: null,
  nome_empresa: 'Comissões Pro',
  procedimentos_catalogo: [
    'Harmonização Facial e Aplicação de Preenchedor',
    'Implante Dentário Conexão Cônica + Prótese Cerâmica',
    'Tratamento a Laser Fracionado 5 Sessões',
    'Consulta Especializada e Avaliação Clínica Integral',
    'Cirurgia Plástica Reparadora com Acompanhamento',
    'Preenchimento Labial e Bioestimulador de Colágeno',
    'Protocolo de Lentes em Resina Composta 10 Elementos',
    'Exames Genéticos e Painel Preventivo Molecular',
  ],
};

