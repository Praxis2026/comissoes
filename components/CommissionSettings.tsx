'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCommission } from '@/lib/commission-context';
import {
  FaixaEntradaComissao,
  MeioPagamentoConfig,
  ParametrosComissionamento,
  PARAMETROS_COMISSIONAMENTO_PADRAO,
  RegraComissaoVendedor,
  TipoComissao,
  TipoPagamentoEntrada,
} from '@/lib/types';
import { formatarDataBR, formatarMoedaBR } from '@/lib/utils';
import { CurrencyInput } from '@/components/CurrencyInput';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Coins,
  Copy,
  CreditCard,
  Edit3,
  FileCheck,
  Filter,
  FolderPlus,
  HelpCircle,
  History,
  Info,
  Layers,
  Percent,
  Plus,
  PowerOff,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { UserManagement } from './UserManagement';
import { BrandingSettings } from './BrandingSettings';

interface CommissionSettingsProps {
  abaInicial?:
    | 'usuarios'
    | 'vendedores'
    | 'entrada_calculo'
    | 'governanca'
    | 'procedimentos'
    | 'identidade_visual';
}

export function CommissionSettings({ abaInicial = 'vendedores' }: CommissionSettingsProps = {}) {
  const {
    usuarios,
    usuarioAtual,
    setUsuarioAtual,
    regras,
    vendas,
    lancamentos,
    salvarRegra,
    excluirRegra,
    duplicarRegra,
    encerrarVigenciaRegra,
    parametros,
    salvarParametros,
    salvarMeioPagamento,
    excluirMeioPagamento,
    toggleMeioEntradaValida,
    toggleMeioAtivo,
    resetarMeiosPagamentoPadrao,
    resetarParametros,
  } = useCommission();

  const isAdmin = usuarioAtual.perfil_nome === 'ADMINISTRADOR';
  const podeGerenciar = true; // Permite parametrização e salvamento de Regra de Comissionamento em Configurações
  
  const todosVendedores = useMemo(() => {
    const list = usuarios.filter((u) => u.perfil_nome === 'VENDEDOR');
    return list.length > 0 ? list : usuarios;
  }, [usuarios]);

  const vendedores = todosVendedores;

  // Sub-tabs inside Settings
  const [prevAbaInicial, setPrevAbaInicial] = useState(abaInicial);
  const [subAba, setSubAba] = useState<
    'usuarios' | 'vendedores' | 'entrada_calculo' | 'governanca' | 'procedimentos' | 'identidade_visual'
  >(abaInicial);

  // Sync subAba when parent changes tab during render
  if (prevAbaInicial !== abaInicial) {
    setPrevAbaInicial(abaInicial);
    setSubAba(abaInicial);
  }

  // Success / error feedback banner & toast
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(
    null
  );
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const exibirFeedback = (tipo: 'sucesso' | 'erro', texto: string) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setFeedback({ tipo, texto });
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, 7000);
  };

  // =========================================================================
  // TAB 1: Regras por Vendedor State & Handlers (CRUD Completo)
  // =========================================================================
  const [regraEmEdicaoId, setRegraEmEdicaoId] = useState<string | null>(null);
  const [filtroVendedorLista, setFiltroVendedorLista] = useState<string>('TODOS');
  const [filtroStatusRegra, setFiltroStatusRegra] = useState<'TODAS' | 'VIGENTES' | 'AGENDADAS' | 'ENCERRADAS'>('TODAS');

  const [vendedorSelecionadoId, setVendedorSelecionadoId] = useState<string>('');
  const idVendedorEfetivo = isAdmin
    ? (vendedorSelecionadoId || vendedores[0]?.id || '')
    : usuarioAtual.id;

  const [tipoComissao, setTipoComissao] = useState<TipoComissao>('ESCALONADO_ENTRADA');
  const [valorFixo, setValorFixo] = useState<number>(50.0);
  const [vigenciaInicio, setVigenciaInicio] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [vigenciaFim, setVigenciaFim] = useState<string>('');
  const [faixas, setFaixas] = useState<
    Array<{ min: number; max: number | null; comissao: number }>
  >([
    { min: 30, max: null, comissao: 1.0 },
    { min: 20, max: 29.99, comissao: 0.8 },
    { min: 10, max: 19.99, comissao: 0.5 },
    { min: 0, max: 9.99, comissao: 0.0 },
  ]);

  const handleCarregarPreset = (preset: 'padrao' | 'agressivo' | 'conservador') => {
    if (preset === 'padrao') {
      setFaixas([
        { min: 30, max: null, comissao: 1.0 },
        { min: 20, max: 29.99, comissao: 0.8 },
        { min: 10, max: 19.99, comissao: 0.5 },
        { min: 0, max: 9.99, comissao: 0.0 },
      ]);
    } else if (preset === 'agressivo') {
      setFaixas([
        { min: 35, max: null, comissao: 1.5 },
        { min: 25, max: 34.99, comissao: 1.0 },
        { min: 15, max: 24.99, comissao: 0.7 },
        { min: 0, max: 14.99, comissao: 0.0 },
      ]);
    } else {
      setFaixas([
        { min: 25, max: null, comissao: 0.9 },
        { min: 15, max: 24.99, comissao: 0.6 },
        { min: 5, max: 14.99, comissao: 0.3 },
        { min: 0, max: 4.99, comissao: 0.0 },
      ]);
    }
    exibirFeedback('sucesso', `Preset ${preset} carregado no editor.`);
  };

  const handleAdicionarFaixa = () => {
    setFaixas((prev) => [...prev, { min: 0, max: null, comissao: 0.5 }]);
  };

  const handleRemoverFaixa = (index: number) => {
    setFaixas((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAtualizarFaixa = (
    index: number,
    campo: 'min' | 'max' | 'comissao',
    valor: number | null
  ) => {
    setFaixas((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [campo]: valor };
      return copy;
    });
  };

  const handleIniciarEdicaoRegra = (r: RegraComissaoVendedor) => {
    setRegraEmEdicaoId(r.id);
    setVendedorSelecionadoId(r.vendedor_id);
    setTipoComissao(r.tipo_comissao);
    setValorFixo(r.valor_fixo || 0);
    setVigenciaInicio(r.vigencia_inicio);
    setVigenciaFim(r.vigencia_fim || '');
    if (r.faixas && r.faixas.length > 0) {
      setFaixas(
        r.faixas.map((f) => ({
          min: f.percentual_entrada_min,
          max: f.percentual_entrada_max,
          comissao: f.percentual_comissao,
        }))
      );
    }
    // Scroll form into view smoothly
    window.scrollTo({ top: 120, behavior: 'smooth' });
    exibirFeedback('sucesso', `Modo de edição ativado para a regra #${r.id.slice(-4)} (${r.vendedor_nome}).`);
  };

  const handleCancelarEdicaoRegra = () => {
    setRegraEmEdicaoId(null);
    setVigenciaInicio(new Date().toISOString().split('T')[0]);
    setVigenciaFim('');
    setTipoComissao('ESCALONADO_ENTRADA');
    handleCarregarPreset('padrao');
  };

  const handleSalvarRegraVendedor = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetVendedorId = isAdmin
      ? (vendedorSelecionadoId || vendedores[0]?.id)
      : usuarioAtual.id;
    if (!targetVendedorId) {
      exibirFeedback('erro', 'Por favor, selecione um vendedor para aplicar a regra de comissionamento.');
      return;
    }

    if (!vigenciaInicio) {
      exibirFeedback('erro', 'Informe a data de início da vigência.');
      return;
    }
    if (vigenciaFim && vigenciaFim < vigenciaInicio) {
      exibirFeedback('erro', 'A data de fim da vigência não pode ser anterior ao início.');
      return;
    }

    const formatadasFaixas: FaixaEntradaComissao[] = faixas.map((f, i) => ({
      id: Date.now() + i,
      regra_id: regraEmEdicaoId || '',
      percentual_entrada_min: Number(f.min),
      percentual_entrada_max:
        f.max !== null && f.max !== undefined && f.max !== ('' as any)
          ? Number(f.max)
          : null,
      percentual_comissao: Number(f.comissao),
    }));

    if (targetVendedorId === 'TODOS') {
      // Aplicar regra para todos os vendedores cadastrados
      let salvasCount = 0;
      for (const v of vendedores) {
        const r = await salvarRegra({
          vendedor_id: v.id,
          tipo_comissao: tipoComissao,
          valor_fixo: tipoComissao === 'VALOR_FIXO' ? Number(valorFixo) : 0,
          vigencia_inicio: vigenciaInicio,
          vigencia_fim: vigenciaFim.trim() || null,
          faixas: tipoComissao === 'ESCALONADO_ENTRADA' ? formatadasFaixas : [],
        });
        if (r.sucesso) salvasCount++;
      }
      exibirFeedback(
        'sucesso',
        'Regra salva com sucesso.'
      );
      setRegraEmEdicaoId(null);
      return;
    }

    const res = await salvarRegra({
      id: regraEmEdicaoId || undefined,
      vendedor_id: targetVendedorId,
      tipo_comissao: tipoComissao,
      valor_fixo: tipoComissao === 'VALOR_FIXO' ? Number(valorFixo) : 0,
      vigencia_inicio: vigenciaInicio,
      vigencia_fim: vigenciaFim.trim() || null,
      faixas: tipoComissao === 'ESCALONADO_ENTRADA' ? formatadasFaixas : [],
    });

    if (res.sucesso) {
      exibirFeedback('sucesso', 'Regra salva com sucesso.');
      setRegraEmEdicaoId(null);
    } else {
      exibirFeedback('erro', res.mensagem);
    }
  };

  const handleDuplicarRegra = (regraId: string) => {
    const res = duplicarRegra(regraId);
    if (res.sucesso) {
      exibirFeedback('sucesso', res.mensagem);
      if (res.novaRegra) {
        handleIniciarEdicaoRegra(res.novaRegra);
      }
    } else {
      exibirFeedback('erro', res.mensagem);
    }
  };

  const handleEncerrarVigencia = async (regraId: string) => {
    const hoje = new Date().toISOString().split('T')[0];
    const res = await encerrarVigenciaRegra(regraId, hoje);
    if (res.sucesso) {
      exibirFeedback('sucesso', res.mensagem);
    } else {
      exibirFeedback('erro', res.mensagem);
    }
  };

  // Modal de Exclusão de Regra & Verificação de Vendas Vinculadas
  const [regraParaExcluir, setRegraParaExcluir] = useState<RegraComissaoVendedor | null>(null);

  // Vendas e lançamentos vinculados à regra selecionada para exclusão
  const lancamentosDaRegraParaExcluir = useMemo(() => {
    if (!regraParaExcluir) return [];
    return lancamentos.filter((l) => l.regra_aplicada_id === regraParaExcluir.id);
  }, [regraParaExcluir, lancamentos]);

  const vendasDaRegraParaExcluir = useMemo(() => {
    if (!regraParaExcluir || lancamentosDaRegraParaExcluir.length === 0) return [];
    const ids = new Set(lancamentosDaRegraParaExcluir.map((l) => l.venda_id));
    return vendas.filter((v) => ids.has(v.id));
  }, [regraParaExcluir, lancamentosDaRegraParaExcluir, vendas]);

  const totalVendasAssociadasExclusao =
    vendasDaRegraParaExcluir.length > 0
      ? vendasDaRegraParaExcluir.length
      : lancamentosDaRegraParaExcluir.length;
  const temVendaAssociadaExclusao = totalVendasAssociadasExclusao > 0;

  const handleExcluirRegra = (regraId: string) => {
    const regra = regras.find((r) => r.id === regraId);
    if (!regra) return;
    setRegraParaExcluir(regra);
  };

  const handleConfirmarExclusaoRegra = async () => {
    if (!regraParaExcluir) return;
    const res = await excluirRegra(regraParaExcluir.id);
    if (res.sucesso) {
      exibirFeedback('sucesso', res.mensagem);
      if (regraEmEdicaoId === regraParaExcluir.id) {
        handleCancelarEdicaoRegra();
      }
    } else {
      exibirFeedback('erro', res.mensagem);
    }
    setRegraParaExcluir(null);
  };

  const handleEncerrarRegraPeloModal = async () => {
    if (!regraParaExcluir) return;
    const res = await encerrarVigenciaRegra(regraParaExcluir.id);
    if (res.sucesso) {
      exibirFeedback('sucesso', res.mensagem);
    } else {
      exibirFeedback('erro', res.mensagem);
    }
    setRegraParaExcluir(null);
  };

  // Regras filtradas para a listagem
  const regrasFiltradas = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    return regras.filter((r) => {
      // O usuário logado, exceto administrador, não pode visualizar as informações de outro vendedor
      if (!isAdmin && r.vendedor_id !== usuarioAtual.id) {
        return false;
      }
      // Filtro vendedor (apenas para Admin)
      if (isAdmin && filtroVendedorLista !== 'TODOS' && r.vendedor_id !== filtroVendedorLista) {
        return false;
      }
      // Filtro status
      const isVigente = r.vigencia_inicio <= hoje && (!r.vigencia_fim || r.vigencia_fim >= hoje);
      const isFutura = r.vigencia_inicio > hoje;
      const isEncerrada = Boolean(r.vigencia_fim && r.vigencia_fim < hoje);

      if (filtroStatusRegra === 'VIGENTES' && !isVigente) return false;
      if (filtroStatusRegra === 'AGENDADAS' && !isFutura) return false;
      if (filtroStatusRegra === 'ENCERRADAS' && !isEncerrada) return false;

      return true;
    });
  }, [regras, isAdmin, usuarioAtual.id, filtroVendedorLista, filtroStatusRegra]);

  // =========================================================================
  // TAB 2: Meios de Pagamento & Entrada Válida State & Handlers (CRUD Completo)
  // =========================================================================
  const catalogoMeios: MeioPagamentoConfig[] = useMemo(() => {
    return parametros.meios_pagamento_catalogo || PARAMETROS_COMISSIONAMENTO_PADRAO.meios_pagamento_catalogo;
  }, [parametros.meios_pagamento_catalogo]);

  const [modalMeioAberto, setModalMeioAberto] = useState(false);
  const [meioEmEdicao, setMeioEmEdicao] = useState<MeioPagamentoConfig | null>(null);
  const [meioFormCodigo, setMeioFormCodigo] = useState('');
  const [meioFormLabel, setMeioFormLabel] = useState('');
  const [meioFormDescricao, setMeioFormDescricao] = useState('');
  const [meioFormIsEntradaValida, setMeioFormIsEntradaValida] = useState(true);
  const [meioFormAtivo, setMeioFormAtivo] = useState(true);

  const [filtroMeios, setFiltroMeios] = useState<'TODOS' | 'VALIDOS' | 'NAO_VALIDOS' | 'INATIVOS'>('TODOS');
  const [buscaMeio, setBuscaMeio] = useState('');

  // Simulador interativo da Tab 2
  const [simValorVenda, setSimValorVenda] = useState(10000);
  const [simValorEntrada, setSimValorEntrada] = useState(3000);
  const [simMeioSelecionado, setSimMeioSelecionado] = useState('PIX');

  const meiosFiltrados = useMemo(() => {
    return catalogoMeios.filter((m) => {
      // Busca texto
      if (buscaMeio.trim()) {
        const t = buscaMeio.toLowerCase();
        const bateu =
          m.label.toLowerCase().includes(t) ||
          m.codigo.toLowerCase().includes(t) ||
          (m.descricao && m.descricao.toLowerCase().includes(t));
        if (!bateu) return false;
      }
      // Filtro status
      if (filtroMeios === 'VALIDOS' && !m.is_entrada_valida) return false;
      if (filtroMeios === 'NAO_VALIDOS' && m.is_entrada_valida) return false;
      if (filtroMeios === 'INATIVOS' && m.ativo) return false;
      return true;
    });
  }, [catalogoMeios, buscaMeio, filtroMeios]);

  const handleAbrirNovoMeio = () => {
    setMeioEmEdicao(null);
    setMeioFormCodigo('');
    setMeioFormLabel('');
    setMeioFormDescricao('');
    setMeioFormIsEntradaValida(true);
    setMeioFormAtivo(true);
    setModalMeioAberto(true);
  };

  const handleAbrirEditarMeio = (m: MeioPagamentoConfig) => {
    setMeioEmEdicao(m);
    setMeioFormCodigo(m.codigo);
    setMeioFormLabel(m.label);
    setMeioFormDescricao(m.descricao || '');
    setMeioFormIsEntradaValida(m.is_entrada_valida);
    setMeioFormAtivo(m.ativo !== false);
    setModalMeioAberto(true);
  };

  const handleSalvarMeioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      exibirFeedback('erro', 'Apenas Administradores podem gerenciar meios de pagamento.');
      return;
    }

    const res = await salvarMeioPagamento({
      id: meioEmEdicao?.id,
      codigo: meioFormCodigo,
      label: meioFormLabel,
      descricao: meioFormDescricao,
      is_entrada_valida: meioFormIsEntradaValida,
      ativo: meioFormAtivo,
      sistema_padrao: meioEmEdicao?.sistema_padrao,
    });

    if (res.sucesso) {
      exibirFeedback('sucesso', res.mensagem);
      setModalMeioAberto(false);
    } else {
      exibirFeedback('erro', res.mensagem);
    }
  };

  const handleExcluirMeio = async (m: MeioPagamentoConfig) => {
    if (!isAdmin) return;
    const confirmou = window.confirm(
      `Deseja realmente excluir o meio de pagamento "${m.label}" (${m.codigo})?`
    );
    if (!confirmou) return;

    const res = await excluirMeioPagamento(m.id);
    if (res.sucesso) {
      exibirFeedback('sucesso', res.mensagem);
    } else {
      exibirFeedback('erro', res.mensagem);
    }
  };

  const handleToggleEntradaValida = (m: MeioPagamentoConfig) => {
    if (!isAdmin) return;
    const res = toggleMeioEntradaValida(m.id);
    if (res.sucesso) {
      exibirFeedback('sucesso', res.mensagem);
    } else {
      exibirFeedback('erro', res.mensagem);
    }
  };

  const handleToggleAtivo = (m: MeioPagamentoConfig) => {
    if (!isAdmin) return;
    const res = toggleMeioAtivo(m.id);
    if (res.sucesso) {
      exibirFeedback('sucesso', res.mensagem);
    } else {
      exibirFeedback('erro', res.mensagem);
    }
  };

  const handleResetarMeiosPadrao = () => {
    if (!isAdmin) return;
    const confirmou = window.confirm(
      'Restaurar o catálogo de meios de pagamento para a especificação original (PIX, Dinheiro, Débito, Crédito à Vista, Boleto, Parcelado, Sem Entrada)?'
    );
    if (!confirmou) return;
    const res = resetarMeiosPagamentoPadrao();
    if (res.sucesso) {
      exibirFeedback('sucesso', res.mensagem);
    }
  };

  const handleSalvarResidual = async (valor: number) => {
    if (!isAdmin) return;
    await salvarParametros({ percentual_comissao_padrao_residual: Math.max(0, valor) });
    exibirFeedback('sucesso', `Alíquota residual definida para ${valor.toFixed(2)}%.`);
  };

  // Cálculo da simulação interativa
  const simMeioObjeto = catalogoMeios.find((m) => m.codigo === simMeioSelecionado);
  const simIsValido = Boolean(
    simMeioObjeto?.is_entrada_valida &&
      simMeioObjeto?.ativo &&
      parametros.meios_pagamento_entrada_validos.includes(simMeioSelecionado)
  );
  const simEntradaValidaCalculada = simIsValido ? Math.min(simValorVenda, Math.max(0, simValorEntrada)) : 0;
  const simProporcaoEntrada = simValorVenda > 0 ? (simEntradaValidaCalculada / simValorVenda) * 100 : 0;

  // Encontrar alíquota simulada pela regra vigente do vendedorLucas
  const simRegraExemplo = regras.find((r) => r.vendedor_id === vendedores[0]?.id) || regras[0];
  let simAliquota = 0;
  let simFaixaDescricao = 'Sem comissão (<10%)';

  if (simRegraExemplo?.tipo_comissao === 'VALOR_FIXO') {
    simAliquota = 0;
    simFaixaDescricao = `Valor Fixo de ${formatarMoedaBR(simRegraExemplo.valor_fixo, true)}`;
  } else if (simRegraExemplo?.faixas && simRegraExemplo.faixas.length > 0) {
    const ordenadas = [...simRegraExemplo.faixas].sort(
      (a, b) => b.percentual_entrada_min - a.percentual_entrada_min
    );
    const faixaEncontrada = ordenadas.find(
      (f) =>
        simProporcaoEntrada >= f.percentual_entrada_min &&
        (f.percentual_entrada_max === null ||
          f.percentual_entrada_max === undefined ||
          simProporcaoEntrada < f.percentual_entrada_max)
    );
    if (faixaEncontrada) {
      simAliquota = faixaEncontrada.percentual_comissao;
      simFaixaDescricao = `Faixa ≥ ${faixaEncontrada.percentual_entrada_min}%: Alíquota de ${simAliquota.toFixed(1)}%`;
    } else {
      simAliquota = parametros.percentual_comissao_padrao_residual || 0;
      simFaixaDescricao = `Abaixo da menor faixa: Alíquota residual de ${simAliquota.toFixed(2)}%`;
    }
  }

  const simValorComissao =
    simRegraExemplo?.tipo_comissao === 'VALOR_FIXO'
      ? simRegraExemplo.valor_fixo
      : (simValorVenda * simAliquota) / 100;

  // =========================================================================
  // TAB 3: Governança State & Handlers
  // =========================================================================
  const handleToggleGovernanca = (
    chave: keyof Pick<
      ParametrosComissionamento,
      | 'exigir_aprovacao_gestor'
      | 'exigir_conferencia_vendedor'
      | 'trava_estorno_apenas_admin'
    >
  ) => {
    if (!isAdmin) return;
    const novoValor = !parametros[chave];
    salvarParametros({ [chave]: novoValor });
    exibirFeedback('sucesso', 'Parâmetro de governança atualizado.');
  };

  const handleAtualizarDiasAlerta = (dias: number) => {
    if (!isAdmin) return;
    salvarParametros({ dias_alerta_expiracao_vigencia: Math.max(1, dias) });
  };

  // =========================================================================
  // TAB 4: Catálogo de Procedimentos State & Handlers
  // =========================================================================
  const [novoProcedimento, setNovoProcedimento] = useState('');

  const handleAdicionarProcedimento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoProcedimento.trim()) return;
    const jaExiste = parametros.procedimentos_catalogo.some(
      (p) => p.toLowerCase() === novoProcedimento.trim().toLowerCase()
    );
    if (jaExiste) {
      exibirFeedback('erro', 'Este procedimento já está cadastrado no catálogo.');
      return;
    }
    const atualizados = [...parametros.procedimentos_catalogo, novoProcedimento.trim()];
    salvarParametros({ procedimentos_catalogo: atualizados });
    setNovoProcedimento('');
    exibirFeedback('sucesso', 'Procedimento adicionado com sucesso ao catálogo.');
  };

  const handleRemoverProcedimento = (item: string) => {
    if (!isAdmin) return;
    const atualizados = parametros.procedimentos_catalogo.filter((p) => p !== item);
    salvarParametros({ procedimentos_catalogo: atualizados });
    exibirFeedback('sucesso', 'Procedimento removido do catálogo.');
  };

  const handleRestaurarProcedimentosPadrao = () => {
    if (!isAdmin) return;
    salvarParametros({
      procedimentos_catalogo: PARAMETROS_COMISSIONAMENTO_PADRAO.procedimentos_catalogo,
    });
    exibirFeedback('sucesso', 'Catálogo de procedimentos restaurado para o padrão.');
  };

  return (
    <div className="space-y-6 relative">
      {/* Floating Toast Notification - Always Visible regardless of scroll */}
      {feedback && (
        <div className="fixed top-5 right-5 z-50 max-w-md w-full animate-in slide-in-from-top-3 fade-in duration-200">
          <div
            className={`flex items-start gap-3 rounded-2xl p-4 shadow-2xl border backdrop-blur-md ${
              feedback.tipo === 'sucesso'
                ? 'bg-slate-900 text-white border-emerald-500/60 shadow-emerald-950/40'
                : 'bg-slate-900 text-white border-rose-500/60 shadow-rose-950/40'
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                feedback.tipo === 'sucesso'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-rose-500 text-white shadow-sm'
              }`}
            >
              {feedback.tipo === 'sucesso' ? (
                <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
              ) : (
                <AlertCircle className="h-5 w-5 stroke-[2.5]" />
              )}
            </div>
            <div className="flex-1 pt-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    feedback.tipo === 'sucesso' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {feedback.tipo === 'sucesso' ? 'Sucesso' : 'Aviso do Sistema'}
                </span>
                <span className="text-[10px] text-slate-400">• agora</span>
              </div>
              <p className="mt-0.5 text-sm font-bold text-white leading-snug">
                {feedback.texto}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              title="Fechar notificação"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Configurações dos Parâmetros de Comissionamento
                </h1>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                  Regras 1.1 • RBAC • Imutabilidade
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 max-w-3xl leading-relaxed">
                Painel central de governança comercial para parametrização dos modelos de comissão,
                vigências contratuais por vendedor, meios de pagamento elegíveis como entrada válida,
                critérios do fluxo de aprovação/repasse e catálogo de procedimentos.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Edição & Salvamento Habilitados
            </span>
            {!isAdmin && (
              <button
                type="button"
                onClick={() => {
                  const adminUser = usuarios.find((u) => u.perfil_nome === 'ADMINISTRADOR');
                  if (adminUser) {
                    setUsuarioAtual(adminUser);
                    exibirFeedback('sucesso', `Perfil alternado para Administrador (${adminUser.nome}).`);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
                title="Alternar para perfil de Administrador"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                Alternar para Admin
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => {
                  if (
                    confirm(
                      'Deseja restaurar todos os parâmetros gerais de comissionamento para os padrões recomendados da especificação?'
                    )
                  ) {
                    resetarParametros();
                    exibirFeedback('sucesso', 'Parâmetros restaurados com sucesso para os padrões!');
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                title="Restaurar parâmetros recomendados da especificação"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                Restaurar Padrões da Especificação
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-xs font-semibold border transition-all ${
              feedback.tipo === 'sucesso'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {feedback.tipo === 'sucesso' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.texto}</span>
          </div>
        )}

        {/* Sub-Navigation Tabs */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {isAdmin && (
              <button
                onClick={() => setSubAba('usuarios')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  subAba === 'usuarios'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                1. Gestão de Usuários & Acessos
                <span className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase ${
                  subAba === 'usuarios' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Novo
                </span>
              </button>
            )}

            <button
              onClick={() => setSubAba('vendedores')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                subAba === 'vendedores'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              2. Modelos & Vigências por Vendedor
            </button>

            <button
              onClick={() => setSubAba('entrada_calculo')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                subAba === 'entrada_calculo'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              3. Meios de Pagamento & Entrada Válida
            </button>

            <button
              onClick={() => setSubAba('governanca')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                subAba === 'governanca'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              4. Governança, RBAC & Segurança
            </button>

            <button
              onClick={() => setSubAba('procedimentos')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                subAba === 'procedimentos'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              5. Catálogo de Procedimentos
            </button>

            <button
              onClick={() => setSubAba('identidade_visual')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                subAba === 'identidade_visual'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              6. Identidade Visual & Logotipo
              <span className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase ${
                subAba === 'identidade_visual' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                Novo
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SUB-TAB 0: GESTÃO DE USUÁRIOS & PERMISSÕES DE ACESSO (APENAS ADMINISTRADOR)
          ========================================================================= */}
      {subAba === 'usuarios' && isAdmin && (
        <UserManagement onFeedback={exibirFeedback} />
      )}

      {/* =========================================================================
          SUB-TAB 1: MODELOS & VIGÊNCIAS POR VENDEDOR
          ========================================================================= */}
      {subAba === 'vendedores' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              {/* Banner when editing existing rule */}
              {regraEmEdicaoId ? (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-amber-900">
                        Modo de Edição Ativo (Regra #{regraEmEdicaoId.slice(-6)})
                      </span>
                      <p className="text-[11px] text-amber-700">
                        Os dados da regra foram carregados no formulário. Clique em &quot;Atualizar Regra&quot; para salvar.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelarEdicaoRegra}
                    className="shrink-0 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    Cancelar Edição
                  </button>
                </div>
              ) : null}

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Sliders className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      {regraEmEdicaoId ? 'Editar Regra de Comissionamento' : 'Parametrizar Regra de Comissionamento'}
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {regraEmEdicaoId
                        ? 'Atualize parâmetros ou faixas desta regra existente'
                        : 'Configure regras com vigências contratuais imutáveis por vendedor'}
                    </p>
                  </div>
                </div>

                {/* Seller selector in header */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">Vendedor:</label>
                  {isAdmin ? (
                    <select
                      value={idVendedorEfetivo}
                      onChange={(e) => setVendedorSelecionadoId(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden cursor-pointer"
                    >
                      <option value="TODOS">⭐ Todos os Vendedores</option>
                      {vendedores.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                      {usuarioAtual.nome} (Você)
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleSalvarRegraVendedor} className="mt-4 space-y-4">
                {/* Seller Field inside form */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-emerald-600" />
                      Vendedor / Beneficiário da Regra <span className="text-rose-500">*</span>
                    </label>
                    {regraEmEdicaoId && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                        Editando Regra Existente
                      </span>
                    )}
                  </div>
                  {isAdmin ? (
                    <select
                      value={idVendedorEfetivo}
                      onChange={(e) => setVendedorSelecionadoId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden cursor-pointer"
                    >
                      <option value="TODOS">⭐ Todos os Vendedores (Aplicar regra globalmente para a equipe comercial)</option>
                      {vendedores.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nome} ({v.email}) — {v.cargo || v.perfil_nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                      {usuarioAtual.nome} ({usuarioAtual.email}) — {usuarioAtual.cargo || usuarioAtual.perfil_nome}
                    </div>
                  )}
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {isAdmin
                      ? 'Defina se a regra é individual ou deve ser replicada para todos os vendedores.'
                      : 'Regra de comissionamento individual vinculada ao seu usuário.'}
                  </span>
                </div>

                {/* Model Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Modelo de Cálculo do Vendedor
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                        tipoComissao === 'ESCALONADO_ENTRADA'
                          ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipoComissao"
                        checked={tipoComissao === 'ESCALONADO_ENTRADA'}
                        onChange={() => setTipoComissao('ESCALONADO_ENTRADA')}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                          <Percent className="h-3.5 w-3.5 text-emerald-600" />
                          Percentual Escalonado por Entrada
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500 leading-normal">
                          Gatilho pela proporção de entrada recebida nos meios válidos. Aplica a alíquota da faixa sobre o total da venda.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                        tipoComissao === 'VALOR_FIXO'
                          ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipoComissao"
                        checked={tipoComissao === 'VALOR_FIXO'}
                        onChange={() => setTipoComissao('VALOR_FIXO')}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                          <Coins className="h-3.5 w-3.5 text-emerald-600" />
                          Valor Fixo por Venda
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500 leading-normal">
                          Valor nominal fixado por venda/contrato (ex: R$ 50,00), independente do valor da entrada ou do preço final.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Validity Dates */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-800">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    Vigência Contratual da Regra (Versionamento Imutável)
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Início da Vigência <span className="text-rose-500">*</span>
                        </label>
                        {vigenciaInicio && (
                          <span className="text-[10px] font-mono font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            {formatarDataBR(vigenciaInicio)}
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        value={vigenciaInicio}
                        onChange={(e) => setVigenciaInicio(e.target.value)}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Fim da Vigência (Opcional)
                        </label>
                        {vigenciaFim && (
                          <span className="text-[10px] font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            {formatarDataBR(vigenciaFim)}
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        value={vigenciaFim}
                        onChange={(e) => setVigenciaFim(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400">
                        Deixe vazio para vigência por prazo indeterminado
                      </span>
                    </div>
                  </div>
                </div>

                {/* Model Details: Escalonado or Fixo */}
                {tipoComissao === 'VALOR_FIXO' ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Valor Fixo por Venda Realizada (R$)
                    </label>
                    <div className="max-w-xs">
                      <CurrencyInput
                        value={valorFixo}
                        onChange={(val) => setValorFixo(val)}
                      />
                    </div>
                    <span className="mt-1 block text-[11px] text-slate-500">
                      O vendedor receberá este valor exato por cada venda aprovada e conferida.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Faixas Escalonadas de Entrada
                      </label>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 font-medium">Presets:</span>
                        <button
                          type="button"
                          onClick={() => handleCarregarPreset('padrao')}
                          className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Padrão
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCarregarPreset('agressivo')}
                          className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Agressivo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCarregarPreset('conservador')}
                          className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Conservador
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-700 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2.5">Proporção Mínima (%)</th>
                            <th className="px-3 py-2.5">Proporção Máxima (%)</th>
                            <th className="px-3 py-2.5">Comissão Aplicada (%)</th>
                            <th className="px-3 py-2.5 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {faixas.map((f, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400 font-bold">≥</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={f.min}
                                    onChange={(e) =>
                                      handleAtualizarFaixa(index, 'min', Number(e.target.value))
                                    }
                                    className="w-20 rounded-md border border-slate-300 px-2 py-1 text-xs font-bold text-slate-900"
                                  />
                                  <span className="text-slate-500">%</span>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400 font-bold">{'<'}</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    placeholder="Sem Teto"
                                    value={f.max === null ? '' : f.max}
                                    onChange={(e) =>
                                      handleAtualizarFaixa(
                                        index,
                                        'max',
                                        e.target.value === '' ? null : Number(e.target.value)
                                      )
                                    }
                                    className="w-20 rounded-md border border-slate-300 px-2 py-1 text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                                  />
                                  <span className="text-slate-500">%</span>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={f.comissao}
                                    onChange={(e) =>
                                      handleAtualizarFaixa(index, 'comissao', Number(e.target.value))
                                    }
                                    className="w-20 rounded-md border border-emerald-300 bg-emerald-50/50 px-2 py-1 text-xs font-bold text-emerald-800"
                                  />
                                  <span className="font-bold text-emerald-800">%</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoverFaixa(index)}
                                  className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                  title="Remover Faixa"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      type="button"
                      onClick={handleAdicionarFaixa}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar Nova Faixa de Entrada
                    </button>
                  </div>
                )}

                {/* Inline Form Feedback */}
                {feedback && (
                  <div
                    className={`flex items-center justify-between gap-2.5 rounded-xl p-3 text-xs font-bold border transition-all animate-in fade-in duration-150 ${
                      feedback.tipo === 'sucesso'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-4 ring-emerald-500/10'
                        : 'bg-rose-50 text-rose-900 border-rose-300 ring-4 ring-rose-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {feedback.tipo === 'sucesso' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      )}
                      <span>{feedback.texto}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFeedback(null)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Submit and Cancel Buttons - Always enabled and accessible */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    {regraEmEdicaoId ? 'Atualizar Regra de Comissionamento' : 'Salvar Regra de Comissionamento'}
                  </button>
                  {regraEmEdicaoId && (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelarEdicaoRegra}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Cancelar Edição
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExcluirRegra(regraEmEdicaoId)}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-800 transition-colors ml-auto cursor-pointer"
                        title="Excluir esta regra"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Excluir Regra</span>
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Right: Rules Catalog & CRUD Operations */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-600" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Regras & Vigências Cadastradas
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Gerencie, edite, duplique ou encerre vigências
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                  {regrasFiltradas.length} {regrasFiltradas.length === 1 ? 'regra' : 'regras'}
                </span>
              </div>

              {/* Inline Rules Catalog Feedback */}
              {feedback && (
                <div
                  className={`mt-3 flex items-center justify-between gap-2 rounded-xl p-3 text-xs font-bold border transition-all animate-in fade-in duration-150 ${
                    feedback.tipo === 'sucesso'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-2 ring-emerald-500/10'
                      : 'bg-rose-50 text-rose-900 border-rose-300 ring-2 ring-rose-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {feedback.tipo === 'sucesso' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                    <span>{feedback.texto}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFeedback(null)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Filters Toolbar */}
              <div className="mt-3 space-y-2">
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <select
                      value={filtroVendedorLista}
                      onChange={(e) => setFiltroVendedorLista(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="TODOS">Todos os Vendedores ({regras.length})</option>
                      {vendedores.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nome} ({regras.filter((r) => r.vendedor_id === v.id).length})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {(['TODAS', 'VIGENTES', 'AGENDADAS', 'ENCERRADAS'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFiltroStatusRegra(st)}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-all ${
                        filtroStatusRegra === st
                          ? 'bg-slate-800 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st === 'TODAS'
                        ? 'Todas'
                        : st === 'VIGENTES'
                        ? 'Vigentes'
                        : st === 'AGENDADAS'
                        ? 'Agendadas'
                        : 'Encerradas'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rules Cards List */}
              <div className="mt-3 space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {regrasFiltradas.map((r) => {
                  const hoje = new Date().toISOString().split('T')[0];
                  const isVigente =
                    r.vigencia_inicio <= hoje && (!r.vigencia_fim || r.vigencia_fim >= hoje);
                  const isFutura = r.vigencia_inicio > hoje;
                  const isEmEdicao = regraEmEdicaoId === r.id;

                  return (
                    <div
                      key={r.id}
                      className={`rounded-xl border p-3.5 text-xs transition-all ${
                        isEmEdicao
                          ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/30 shadow-xs'
                          : isVigente
                          ? 'border-emerald-300 bg-emerald-50/30 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                            {(r.vendedor_nome || 'V').charAt(0)}
                          </div>
                          <span className="font-bold text-slate-900 truncate">
                            {r.vendedor_nome || 'Vendedor'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isVigente
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isFutura
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isVigente ? 'Vigente Agora' : isFutura ? 'Agendada' : 'Encerrada'}
                          </span>
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            {r.tipo_comissao === 'VALOR_FIXO' ? 'Fixo' : 'Escalonado'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 text-slate-700 text-[11px]">
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Vigência:</span>
                          <span className="font-semibold text-slate-800">
                            {formatarDataBR(r.vigencia_inicio)} até{' '}
                            {r.vigencia_fim ? formatarDataBR(r.vigencia_fim) : 'Indeterminado'}
                          </span>
                        </div>
                      </div>

                      {/* Rule details */}
                      {r.tipo_comissao === 'VALOR_FIXO' ? (
                        <div className="mt-2 font-bold text-slate-900 text-xs bg-slate-50 p-2 rounded-md border border-slate-200">
                          {formatarMoedaBR(r.valor_fixo, true)} por venda aprovada
                        </div>
                      ) : (
                        <div className="mt-2 text-[10px] text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-200 space-y-0.5">
                          {r.faixas?.map((fx, i) => (
                            <div key={i} className="flex justify-between">
                              <span>
                                ≥ {fx.percentual_entrada_min}%
                                {fx.percentual_entrada_max ? ` e < ${fx.percentual_entrada_max}%` : ''}:
                              </span>
                              <span className="font-bold text-emerald-700">
                                {fx.percentual_comissao.toFixed(1)}% comissão
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* CRUD Operations Toolbar */}
                      {podeGerenciar && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100 pt-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleIniciarEdicaoRegra(r)}
                              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                              title="Editar parâmetros desta regra"
                            >
                              <Edit3 className="h-3 w-3" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicarRegra(r.id)}
                              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                              title="Duplicar para criar nova versão"
                            >
                              <Copy className="h-3 w-3" />
                              Duplicar
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {!r.vigencia_fim || r.vigencia_fim >= hoje ? (
                              <button
                                type="button"
                                onClick={() => handleEncerrarVigencia(r.id)}
                                className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                title="Encerrar vigência da regra hoje"
                              >
                                <PowerOff className="h-3 w-3 text-slate-400" />
                                Encerrar Hoje
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleExcluirRegra(r.id)}
                              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Excluir regra de comissão"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {regrasFiltradas.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">Nenhuma regra encontrada</p>
                    <p className="mt-1 text-[11px]">Ajuste os filtros acima ou cadastre uma nova regra no formulário à esquerda.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: MEIOS DE PAGAMENTO & ENTRADA VÁLIDA (CRUD COMPLETO)
          ========================================================================= */}
      {subAba === 'entrada_calculo' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Catálogo de Meios de Pagamento & Entrada Válida (Requisito 1.1)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Cadastre novos meios de pagamento, edite configurações operacionais e defina se compõem a entrada para cálculo de comissão
                  </p>
                </div>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleAbrirNovoMeio}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Novo Meio de Pagamento
                </button>
              )}
            </div>

            {/* Grid of Payment Methods */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalogoMeios.map((m) => {
                const isEntradaValida = m.is_entrada_valida;
                const isAtivo = m.ativo;

                return (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                      !isAtivo
                        ? 'border-slate-200 bg-slate-50/60 opacity-60'
                        : isEntradaValida
                        ? 'border-emerald-300 bg-emerald-50/40 shadow-2xs'
                        : 'border-slate-200 bg-white shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900">{m.label}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-slate-500 uppercase">
                              {m.codigo}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {m.sistema_padrao ? 'Padrão do Sistema' : 'Personalizado'}
                          </span>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isEntradaValida
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isEntradaValida ? '✓ Entrada Válida' : 'Desconsiderado'}
                          </span>
                          {!isAtivo && (
                            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                              Inativo
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="mt-2.5 text-[11px] text-slate-600 leading-relaxed">
                        {m.descricao || 'Sem descrição cadastrada'}
                      </p>
                    </div>

                    {/* Actions bar */}
                    {isAdmin && (
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleToggleEntradaValida(m)}
                          className={`font-semibold hover:underline text-[10px] ${
                            isEntradaValida ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {isEntradaValida ? 'Tornar Desconsiderado' : 'Validar como Entrada'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAbrirEditarMeio(m)}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            title="Editar Meio de Pagamento"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {!m.sistema_padrao && (
                            <button
                              type="button"
                              onClick={() => handleExcluirMeio(m)}
                              className="rounded p-1 text-rose-500 hover:bg-rose-50 transition-colors"
                              title="Excluir Meio de Pagamento"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Formula box & Residual commission */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 border-t border-slate-100 pt-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Percent className="h-4 w-4 text-emerald-600" />
                  Fórmula Matemática Central do Sistema
                </h3>
                <div className="mt-3 space-y-2 text-xs font-mono bg-white p-3 rounded-lg border border-slate-200 text-slate-800">
                  <div className="text-emerald-800 font-bold">
                    % Entrada = (Valor Entrada Válida ÷ Valor Total Venda) × 100
                  </div>
                  <div className="text-slate-700">
                    Comissão Líquida = (Alíquota da Faixa % ÷ 100) × Valor Total Venda
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                  Se a entrada for paga por meios marcados como &quot;Desconsiderado&quot; (ex: Boleto bancário), o valor considerado é R$ 0,00, resultando em 0% de entrada válida para atingimento das faixas.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-xs font-bold text-slate-900 mb-2">
                  Alíquota Residual para Entradas Menores que o Mínimo
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                  Percentual de comissão aplicado quando a proporção de entrada recebida for inferior a 10% (ou menor que a menor faixa cadastrada).
                </p>
                <div className="flex items-center gap-3">
                  <div className="relative w-32">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      disabled={!isAdmin}
                      value={parametros.percentual_comissao_padrao_residual}
                      onChange={(e) => handleSalvarResidual(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                    />
                    <span className="pointer-events-none absolute right-3 top-1.5 text-xs font-bold text-slate-400">
                      %
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 font-medium">
                    (Padrão especificado: 0,00%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal CRUD: Cadastro / Edição de Meio de Pagamento */}
          {modalMeioAberto && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {meioEmEdicao?.id ? 'Editar Meio de Pagamento' : 'Novo Meio de Pagamento'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalMeioAberto(false)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSalvarMeioSubmit} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome / Rótulo Exibido <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Cartão Débito Master, TED, Pix, etc."
                      value={meioFormLabel}
                      onChange={(e) => setMeioFormLabel(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Código do Sistema (Identificador) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!meioEmEdicao?.sistema_padrao}
                      placeholder="Ex: CARTAO_DEBITO, TED, CHEQUE"
                      value={meioFormCodigo}
                      onChange={(e) =>
                        setMeioFormCodigo(e.target.value.toUpperCase().replace(/\s+/g, '_'))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-800 uppercase focus:border-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                    />
                    <span className="text-[10px] text-slate-400">
                      Identificador único usado nas conciliações e integrações
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Descrição / Regra Operacional
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Orientações aos vendedores sobre liquidação deste meio..."
                      value={meioFormDescricao}
                      onChange={(e) => setMeioFormDescricao(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={meioFormIsEntradaValida}
                        onChange={(e) => setMeioFormIsEntradaValida(e.target.checked)}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900">
                          Aceito como Entrada Válida (Requisito 1.1)
                        </span>
                        <p className="text-[10px] text-slate-500">
                          Se ativado, pagamentos recebidos por este meio contam para atingir as faixas escalonadas de comissão
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={meioFormAtivo}
                        onChange={(e) => setMeioFormAtivo(e.target.checked)}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900">Meio Ativo</span>
                        <p className="text-[10px] text-slate-500">
                          Disponível para seleção pelos vendedores no lançamento de novas vendas
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setModalMeioAberto(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      Salvar Meio
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: GOVERNANÇA, RBAC & SEGURANÇA OPERACIONAL
          ========================================================================= */}
      {subAba === 'governanca' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Governança, Controles de Acesso (RBAC) e Imutabilidade
                </h2>
                <p className="text-[11px] text-slate-500">
                  Travas operacionais para prevenir fraudes, assegurar dupla conferência e auditoria de estornos
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {/* Parameter 1: Exigência de Aprovação Prévia */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">
                      Exigência de Aprovação Prévia pelo Gestor
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-bold text-emerald-800">
                      Fluxo 4.1
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                    Quando ativo, vendas submetidas entram com status <code className="text-slate-800 font-mono">PENDENTE_APROVACAO</code> e exigem aprovação formal da administração antes de serem disponibilizadas para conferência pelo vendedor.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => handleToggleGovernanca('exigir_aprovacao_gestor')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    parametros.exigir_aprovacao_gestor ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      parametros.exigir_aprovacao_gestor ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Parameter 2: Conferência Obrigatória pelo Vendedor */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">
                      Obrigatoriedade de Conferência Formal pelo Vendedor
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.2 text-[10px] font-bold text-blue-800">
                      Requisito 5.1
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                    Bloqueia inclusão de comissões no lote de liquidação/repasse financeiro até que o vendedor acesse a tela de conferência e dê o aceite formal com carimbo de data e hora.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => handleToggleGovernanca('exigir_conferencia_vendedor')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    parametros.exigir_conferencia_vendedor ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      parametros.exigir_conferencia_vendedor ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Parameter 3: Trava Antifraude (State Lock) */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">
                      Trava de Segurança e Bloqueio de Edição (State Lock)
                    </span>
                    <span className="rounded-full bg-purple-100 px-2 py-0.2 text-[10px] font-bold text-purple-800">
                      Imutabilidade
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                    Impede a alteração ou exclusão de qualquer venda ou cálculo de comissão após atingir os status <code className="text-slate-800 font-mono">APROVADO</code>, <code className="text-slate-800 font-mono">CONFERIDO</code> ou <code className="text-slate-800 font-mono">LIQUIDADO</code>.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => handleToggleGovernanca('trava_estorno_apenas_admin')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    parametros.trava_estorno_apenas_admin ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      parametros.trava_estorno_apenas_admin ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Parameter 4: Alerta de Vigência Contratual */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">
                    Alerta de Antecedência para Renovação de Vigência Contratual
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Número de dias antes da data de expiração para exibição de alerta aos gestores
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    disabled={!isAdmin}
                    value={parametros.dias_alerta_expiracao_vigencia}
                    onChange={(e) => handleAtualizarDiasAlerta(Number(e.target.value))}
                    className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 shadow-2xs"
                  />
                  <span className="text-xs text-slate-600 font-semibold">dias</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 4: CATÁLOGO DE PROCEDIMENTOS
          ========================================================================= */}
      {subAba === 'procedimentos' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Catálogo de Procedimentos e Serviços Padrão
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Procedimentos pré-cadastrados que aparecem como atalho no formulário de vendas e integração ERP
                  </p>
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={handleRestaurarProcedimentosPadrao}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Restaurar Lista Padrão
                </button>
              )}
            </div>

            {/* Add Procedure Form */}
            {isAdmin && (
              <form onSubmit={handleAdicionarProcedimento} className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Nome do novo procedimento (ex: Harmonização Facial, Implante Dentário...)"
                  value={novoProcedimento}
                  onChange={(e) => setNovoProcedimento(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Procedimento
                </button>
              </form>
            )}

            {/* Procedures Grid / List */}
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {parametros.procedimentos_catalogo.map((proc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-xs text-slate-800 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-slate-900">{proc}</span>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemoverProcedimento(proc)}
                      className="rounded p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-700 transition-colors"
                      title="Remover Procedimento"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 6: IDENTIDADE VISUAL & LOGOTIPO DA EMPRESA
          ========================================================================= */}
      {subAba === 'identidade_visual' && (
        <BrandingSettings onFeedback={exibirFeedback} />
      )}

      {/* =========================================================================
          MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE REGRA COM VERIFICAÇÃO DE VENDAS
          ========================================================================= */}
      {regraParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            {temVendaAssociadaExclusao ? (
              /* CASO 1: NÃO É POSSÍVEL A EXCLUSÃO PELA EXISTÊNCIA DE VENDA ASSOCIADA */
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-xs">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Exclusão Não Permitida
                      </h3>
                      <p className="text-xs text-slate-500">
                        Integridade e governança de dados contratuais
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRegraParaExcluir(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Banner de Erro em Destaque */}
                <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-900">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <span className="font-bold block text-sm text-rose-700">
                        Não é possível a exclusão pela existência de venda associada.
                      </span>
                      <p className="mt-1 text-xs text-rose-800 leading-relaxed">
                        Esta regra de comissionamento de <strong className="font-semibold text-rose-950">{regraParaExcluir.vendedor_nome}</strong> possui <strong className="font-bold text-rose-950">{totalVendasAssociadasExclusao} venda(s) registrada(s)</strong> no sistema com lançamentos de comissão apurados.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resumo da Regra e Vendas Vinculadas */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5 text-xs text-slate-700">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                    <span className="text-slate-500 font-medium">Vendedor:</span>
                    <span className="font-bold text-slate-900">{regraParaExcluir.vendedor_nome}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                    <span className="text-slate-500 font-medium">Vigência da Regra:</span>
                    <span className="font-semibold text-slate-800">
                      {formatarDataBR(regraParaExcluir.vigencia_inicio)} até{' '}
                      {regraParaExcluir.vigencia_fim ? formatarDataBR(regraParaExcluir.vigencia_fim) : 'Indeterminado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block mb-1.5">
                      Vendas vinculadas a esta regra ({totalVendasAssociadasExclusao}):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {vendasDaRegraParaExcluir.slice(0, 8).map((v) => (
                        <span
                          key={v.id}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-800 shadow-2xs"
                        >
                          <span className="font-bold text-emerald-700">{v.codigo_venda || v.numero_documento}</span>
                          <span className="text-slate-300">·</span>
                          <span className="truncate max-w-[120px]">{v.cliente_nome}</span>
                        </span>
                      ))}
                      {totalVendasAssociadasExclusao > 8 && (
                        <span className="inline-flex items-center rounded-md bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600">
                          +{totalVendasAssociadasExclusao - 8} outras vendas
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nota de Auditoria & Alternativa Segura */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-900 flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Integridade Fiscal & Contábil:</strong> Para preservar os cálculos financeiros, históricos de repasses e auditoria, regras com apurações passadas não podem ser apagadas. Para descontinuá-la em vendas futuras, você pode encerrar sua vigência.
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRegraParaExcluir(null)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Entendido / Fechar
                  </button>
                  {(!regraParaExcluir.vigencia_fim || regraParaExcluir.vigencia_fim >= new Date().toISOString().split('T')[0]) && (
                    <button
                      type="button"
                      onClick={handleEncerrarRegraPeloModal}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors cursor-pointer"
                    >
                      <PowerOff className="h-3.5 w-3.5" />
                      <span>Encerrar Vigência Hoje</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* CASO 2: SEM VENDAS ASSOCIADAS - CONFIRMAÇÃO DE EXCLUSÃO */
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-xs">
                      <Trash2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Confirmar Exclusão de Regra
                      </h3>
                      <p className="text-xs text-slate-500">
                        Remoção definitiva de regra de comissionamento
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRegraParaExcluir(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed">
                  Tem certeza que deseja excluir esta regra de comissionamento de <strong className="font-bold text-slate-900">{regraParaExcluir.vendedor_nome}</strong>?
                </div>

                {/* Card de Detalhes da Regra */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Vendedor:</span>
                    <span className="font-bold text-slate-900">{regraParaExcluir.vendedor_nome}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Tipo:</span>
                    <span className="font-semibold text-slate-800">
                      {regraParaExcluir.tipo_comissao === 'VALOR_FIXO'
                        ? `Valor Fixo (${formatarMoedaBR(regraParaExcluir.valor_fixo, true)})`
                        : `Escalonado por Entrada (${regraParaExcluir.faixas?.length || 0} faixas)`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Vigência:</span>
                    <span className="font-semibold text-slate-800">
                      {formatarDataBR(regraParaExcluir.vigencia_inicio)} até{' '}
                      {regraParaExcluir.vigencia_fim ? formatarDataBR(regraParaExcluir.vigencia_fim) : 'Indeterminado'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/80 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Verificação concluída: Nenhuma venda associada a esta regra.</span>
                  </div>
                </div>

                <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3 text-[11px] text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>
                    Atenção: Esta ação é definitiva e removerá a configuração de comissões do vendedor.
                  </span>
                </div>

                {/* Botões de Confirmação */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRegraParaExcluir(null)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarExclusaoRegra}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Sim, Excluir Regra</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
