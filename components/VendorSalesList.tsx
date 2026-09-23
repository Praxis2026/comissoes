'use client';

import React, { useState, useRef } from 'react';
import { useCommission } from '@/lib/commission-context';
import { StatusLancamento, Venda } from '@/lib/types';
import { formatarDataBR } from '@/lib/utils';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit3,
  FileCheck,
  FileText,
  Filter,
  Layers,
  PlusCircle,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';

interface VendorSalesListProps {
  onNovaVenda: () => void;
  onEditarVenda: (venda: Venda) => void;
  onIrParaConferencia: () => void;
  subAbaVendas?: string;
  onSubAbaVendasChange?: (status: string) => void;
}

export function VendorSalesList({
  onNovaVenda,
  onEditarVenda,
  onIrParaConferencia,
  subAbaVendas,
  onSubAbaVendasChange,
}: VendorSalesListProps) {
  const {
    usuarioAtual,
    vendas,
    lancamentos,
    submeterParaAprovacao,
    excluirRascunho,
  } = useCommission();

  const [statusLocal, setStatusLocal] = useState<string>('TODOS');
  const [busca, setBusca] = useState('');
  const [justificativaModal, setJustificativaModal] = useState<{
    doc: string;
    texto: string;
  } | null>(null);

  const tabelaContainerRef = useRef<HTMLDivElement>(null);

  const filtroStatus = subAbaVendas !== undefined ? subAbaVendas : statusLocal;

  const handleMudarSubmenu = (novoStatus: string) => {
    if (onSubAbaVendasChange) {
      onSubAbaVendasChange(novoStatus);
    } else {
      setStatusLocal(novoStatus);
    }
    tabelaContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const rolarParaTopo = () => {
    tabelaContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Vendas do vendedor logado (ou todas se for Admin)
  const isAdmin = usuarioAtual.perfil_nome === 'ADMINISTRADOR';
  const minhasVendas = vendas.filter(
    (v) => isAdmin || v.vendedor_id === usuarioAtual.id
  );

  // Combinar venda com lançamento
  const vendasComLancamento = minhasVendas.map((v) => {
    const lanc = lancamentos.find((l) => l.venda_id === v.id);
    return {
      venda: v,
      lancamento: lanc,
    };
  });

  // Filtragem
  const vendasFiltradas = vendasComLancamento.filter(({ venda, lancamento }) => {
    const status = lancamento?.status || 'RASCUNHO';
    if (filtroStatus !== 'TODOS' && status !== filtroStatus) return false;

    if (busca.trim()) {
      const q = busca.toLowerCase();
      const matchDoc = venda.numero_documento.toLowerCase().includes(q);
      const matchSeq =
        (venda.codigo_venda || '').toLowerCase().includes(q) ||
        `#${venda.numero_sequencial || ''}`.includes(q);
      const matchData =
        formatarDataBR(venda.data_venda).toLowerCase().includes(q) ||
        venda.data_venda.toLowerCase().includes(q);
      const matchCliente = venda.cliente_nome.toLowerCase().includes(q);
      const matchVendedor = (venda.vendedor_nome || '').toLowerCase().includes(q);
      return matchDoc || matchSeq || matchData || matchCliente || matchVendedor;
    }
    return true;
  });

  // Métricas
  const totalVendido = vendasFiltradas.reduce(
    (acc, curr) => acc + curr.venda.valor_total_venda,
    0
  );
  const totalComissoes = vendasFiltradas.reduce(
    (acc, curr) => acc + (curr.lancamento?.valor_comissao_calculado || 0),
    0
  );
  const qtdRascunhos = vendasComLancamento.filter(
    (item) => (item.lancamento?.status || 'RASCUNHO') === 'RASCUNHO'
  ).length;
  const qtdPendentes = vendasComLancamento.filter(
    (item) => item.lancamento?.status === 'PENDENTE_APROVACAO'
  ).length;
  const qtdAprovados = vendasComLancamento.filter(
    (item) => item.lancamento?.status === 'APROVADO'
  ).length;
  const qtdRejeitados = vendasComLancamento.filter(
    (item) => item.lancamento?.status === 'REJEITADO'
  ).length;
  const qtdConferidos = vendasComLancamento.filter(
    (item) => item.lancamento?.status === 'CONFERIDO'
  ).length;
  const qtdLiquidados = vendasComLancamento.filter(
    (item) => item.lancamento?.status === 'LIQUIDADO'
  ).length;

  const submenusConfig: Record<
    string,
    {
      titulo: string;
      rotuloCurto: string;
      descricao: string;
      icone: any;
      corBadge: string;
      count: number;
    }
  > = {
    TODOS: {
      titulo: 'Submenu: Todas as Vendas & Contratos',
      rotuloCurto: 'Todas',
      descricao: 'Visão integral de todos os lançamentos comerciais com tela de rolagem própria independente.',
      icone: FileText,
      corBadge: 'bg-slate-800 text-white',
      count: vendasComLancamento.length,
    },
    RASCUNHO: {
      titulo: 'Submenu: Rascunhos em Elaboração',
      rotuloCurto: 'Rascunhos',
      descricao: 'Contratos salvos localmente que podem ser editados, complementados ou excluídos.',
      icone: Edit3,
      corBadge: 'bg-slate-700 text-white',
      count: qtdRascunhos,
    },
    PENDENTE_APROVACAO: {
      titulo: 'Submenu: Pendentes de Aprovação',
      rotuloCurto: 'Pendentes',
      descricao: 'Vendas submetidas à diretoria aguardando validação de regras de entrada e elegibilidade.',
      icone: Clock,
      corBadge: 'bg-amber-600 text-white',
      count: qtdPendentes,
    },
    APROVADO: {
      titulo: 'Submenu: Aprovadas (Aguardando Aceite)',
      rotuloCurto: 'Aprovadas',
      descricao: 'Comissões validadas pela gestão prontas para conferência e assinatura formal do vendedor.',
      icone: CheckCircle2,
      corBadge: 'bg-blue-600 text-white',
      count: qtdAprovados,
    },
    REJEITADO: {
      titulo: 'Submenu: Rejeitadas (Com Ajustes)',
      rotuloCurto: 'Rejeitadas',
      descricao: 'Contratos devolvidos pela auditoria com justificativa. Realize os ajustes e reenvie.',
      icone: XCircle,
      corBadge: 'bg-rose-600 text-white',
      count: qtdRejeitados,
    },
    CONFERIDO: {
      titulo: 'Submenu: Conferidas pelo Vendedor',
      rotuloCurto: 'Conferidas',
      descricao: 'Lançamentos conferidos e assinados pelo vendedor aptos para geração de lote de repasse.',
      icone: FileCheck,
      corBadge: 'bg-emerald-600 text-white',
      count: qtdConferidos,
    },
    LIQUIDADO: {
      titulo: 'Submenu: Liquidadas / Pagas',
      rotuloCurto: 'Liquidadas',
      descricao: 'Comissões com repasse bancário e financeiro concluído com baixa registrada.',
      icone: DollarSign,
      corBadge: 'bg-purple-600 text-white',
      count: qtdLiquidados,
    },
  };

  const submenuAtual = submenusConfig[filtroStatus] || submenusConfig.TODOS;
  const SubmenuIcon = submenuAtual.icone;

  const renderBadgeStatus = (status?: StatusLancamento) => {
    switch (status) {
      case 'RASCUNHO':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
            <Edit3 className="h-3 w-3 text-slate-500" />
            Rascunho
          </span>
        );
      case 'PENDENTE_APROVACAO':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
            <Clock className="h-3 w-3 text-amber-600" />
            Pendente Aprovação
          </span>
        );
      case 'APROVADO':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200">
            <CheckCircle2 className="h-3 w-3 text-blue-600" />
            Aprovado (Aguardando aceite)
          </span>
        );
      case 'REJEITADO':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800 border border-rose-200">
            <XCircle className="h-3 w-3 text-rose-600" />
            Rejeitado
          </span>
        );
      case 'CONFERIDO':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <FileCheck className="h-3 w-3 text-emerald-600" />
            Conferido pelo Vendedor
          </span>
        );
      case 'LIQUIDADO':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200">
            <CheckCircle2 className="h-3 w-3 text-purple-600" />
            Liquidado / Pago
          </span>
        );
      case 'ESTORNADO':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-semibold text-zinc-800 border border-zinc-300">
            <AlertTriangle className="h-3 w-3 text-zinc-600" />
            Estornado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerta de Aprovados aguardando conferência */}
      {qtdAprovados > 0 && !isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/90 p-4 text-blue-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800">
                Conferência de Comissões Liberada
              </h4>
              <p className="text-xs text-blue-700">
                Você possui <span className="font-bold">{qtdAprovados} comissão(ões)</span> aprovada(s)
                pela administração aguardando sua conferência formal para inclusão no repasse.
              </p>
            </div>
          </div>
          <button
            onClick={onIrParaConferencia}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-xs transition-colors"
          >
            <span>Ir para Conferência (5.1)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Alerta de Rejeitados */}
      {qtdRejeitados > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-rose-900">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <div className="text-xs">
            <span className="font-bold">Atenção:</span> Existem {qtdRejeitados} lançamento(s) que
            foram rejeitados pelo Administrador. Clique em &quot;Ver Justificativa&quot; na tabela para
            ler as observações e realizar os ajustes.
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Volume Total de Vendas</span>
          <p className="mt-1 text-lg font-bold text-slate-900">
            R$ {totalVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400">
            {vendasFiltradas.length} contrato(s) listado(s)
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Total Comissões Previstas</span>
          <p className="mt-1 text-lg font-bold text-emerald-700">
            R$ {totalComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-emerald-600">Calculadas pelas faixas</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Rascunhos em Aberto</span>
          <p className="mt-1 text-lg font-bold text-slate-700">{qtdRascunhos}</p>
          <span className="text-[11px] text-slate-400">Podem ser editados ou excluídos</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Aprovados / Conferidos</span>
          <p className="mt-1 text-lg font-bold text-blue-700">
            {
              vendasComLancamento.filter((i) =>
                ['APROVADO', 'CONFERIDO', 'LIQUIDADO'].includes(i.lancamento?.status || '')
              ).length
            }
          </p>
          <span className="text-[11px] text-blue-600">Etapas do fluxo RBAC</span>
        </div>
      </div>

      {/* Submenu Tabs Navigation & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        {/* Submenu Pill Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mr-1">
            <Layers className="h-3.5 w-3.5 text-emerald-600" />
            Submenus:
          </span>
          {Object.entries(submenusConfig).map(([id, conf]) => {
            const isAtivo = filtroStatus === id;
            return (
              <button
                key={id}
                onClick={() => handleMudarSubmenu(id)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  isAtivo
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{conf.rotuloCurto}</span>
                {conf.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                      isAtivo
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {conf.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search input & Nova Venda button */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar doc, cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-44 sm:w-56 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
          />
          <button
            onClick={onNovaVenda}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Nova Venda</span>
          </button>
        </div>
      </div>

      {/* Container com tela de rolagem própria para todos os submenus */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden flex flex-col">
        {/* Header do Submenu com identificação e status da tela de rolagem própria */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <SubmenuIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {submenuAtual.titulo}
                </h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${submenuAtual.corBadge}`}>
                  {vendasFiltradas.length} contrato(s)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{submenuAtual.descricao}</p>
            </div>
          </div>

          {/* Indicador de tela de rolagem própria */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>Rolagem Própria Ativa • Sidebar Fixa</span>
            </div>
            {vendasFiltradas.length > 5 && (
              <button
                onClick={rolarParaTopo}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
                title="Rolar ao topo deste submenu"
              >
                <ArrowUp className="h-3 w-3" />
                <span>Topo</span>
              </button>
            )}
          </div>
        </div>

        {/* Área com Tela de Rolagem Própria (Viewport scrollável independente) */}
        <div
          ref={tabelaContainerRef}
          className="overflow-y-auto overflow-x-auto max-h-[calc(100vh-340px)] min-h-[380px] custom-scrollbar scroll-smooth"
        >
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-700 shadow-2xs">
              <tr>
                <th className="px-4 py-3 bg-slate-50/95">Nº Venda / Doc</th>
                <th className="px-4 py-3 bg-slate-50/95">Data</th>
                <th className="px-4 py-3 bg-slate-50/95">Cliente / Procedimentos</th>
                <th className="px-4 py-3 text-right bg-slate-50/95">Valor Venda</th>
                <th className="px-4 py-3 bg-slate-50/95">Meio Entrada</th>
                <th className="px-4 py-3 text-right bg-slate-50/95">Entrada Válida</th>
                <th className="px-4 py-3 text-center bg-slate-50/95">% Entrada</th>
                <th className="px-4 py-3 text-right bg-slate-50/95">Alíquota / Fixo</th>
                <th className="px-4 py-3 text-right bg-slate-50/95">Comissão</th>
                <th className="px-4 py-3 bg-slate-50/95">Status</th>
                <th className="px-4 py-3 text-center bg-slate-50/95">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-xs text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <SubmenuIcon className="h-5 w-5" />
                      </div>
                      <p className="font-semibold text-slate-700">
                        Nenhum contrato encontrado no {submenuAtual.titulo}
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm">
                        {filtroStatus === 'RASCUNHO'
                          ? 'Todos os seus contratos foram submetidos ou você ainda não cadastrou rascunhos.'
                          : filtroStatus === 'PENDENTE_APROVACAO'
                          ? 'Não há lançamentos aguardando auditoria do Administrador no momento.'
                          : filtroStatus === 'REJEITADO'
                          ? 'Parabéns! Não existem contratos rejeitados ou com pendências de ajuste.'
                          : 'Tente alterar os termos de busca ou utilize outro submenu.'}
                      </p>
                      {filtroStatus === 'RASCUNHO' && (
                        <button
                          onClick={onNovaVenda}
                          className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors cursor-pointer"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span>Cadastrar Novo Rascunho</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                vendasFiltradas.map(({ venda, lancamento }) => {
                  const status = lancamento?.status || 'RASCUNHO';
                  const isRascunhoOuRejeitado =
                    status === 'RASCUNHO' || status === 'REJEITADO';

                  return (
                    <tr key={venda.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                            {venda.codigo_venda || `#${String(venda.numero_sequencial || '').padStart(4, '0')}`}
                          </span>
                          <span className="truncate max-w-[130px]" title={venda.numero_documento}>
                            {venda.numero_documento}
                          </span>
                        </div>
                        {isAdmin && (
                          <span className="block text-[10px] font-normal text-slate-500">
                            {venda.vendedor_nome}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {formatarDataBR(venda.data_venda)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px]">
                        <span className="block truncate">{venda.cliente_nome}</span>
                        {venda.procedimentos && (
                          <span
                            className="block text-[11px] text-emerald-700 font-normal truncate"
                            title={venda.procedimentos}
                          >
                            Procedimento: {venda.procedimentos}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        R$ {venda.valor_total_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                          {venda.tipo_pagamento_entrada}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-700">
                        R$ {venda.valor_entrada_valida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            (lancamento?.percentual_entrada_calculado || 0) >= 30
                              ? 'text-emerald-700'
                              : (lancamento?.percentual_entrada_calculado || 0) >= 10
                              ? 'text-blue-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {(lancamento?.percentual_entrada_calculado || 0).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-800">
                        {lancamento?.tipo_regra_aplicada === 'VALOR_FIXO'
                          ? `R$ ${lancamento.aliquota_ou_fixo_aplicado.toFixed(2)}`
                          : `${(lancamento?.aliquota_ou_fixo_aplicado || 0).toFixed(2)}%`}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-emerald-700">
                        R$ {(lancamento?.valor_comissao_calculado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderBadgeStatus(status)}
                        {status === 'REJEITADO' && lancamento?.justificativa_rejeicao && (
                          <button
                            onClick={() =>
                              setJustificativaModal({
                                doc: venda.numero_documento,
                                texto: lancamento.justificativa_rejeicao || '',
                              })
                            }
                            className="block text-[10px] font-semibold text-rose-600 underline hover:text-rose-800 mt-0.5"
                          >
                            Ver Justificativa
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {isRascunhoOuRejeitado && (
                            <>
                              <button
                                onClick={() => onEditarVenda(venda)}
                                title="Editar venda"
                                className="rounded-md border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  if (lancamento) {
                                    submeterParaAprovacao(lancamento.id);
                                  }
                                }}
                                title="Submeter para aprovação do Administrador"
                                className="flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                              >
                                <Send className="h-3 w-3" />
                                Submeter
                              </button>

                              <button
                                onClick={() => {
                                  if (confirm(`Excluir o rascunho da venda ${venda.numero_documento}?`)) {
                                    excluirRascunho(venda.id);
                                  }
                                }}
                                title="Excluir rascunho"
                                className="rounded-md border border-slate-200 p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}

                          {status === 'APROVADO' && (
                            <button
                              onClick={onIrParaConferencia}
                              className="rounded-md bg-blue-50 border border-blue-200 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              Conferir (5.1)
                            </button>
                          )}

                          {status === 'PENDENTE_APROVACAO' && (
                            <span className="text-[11px] text-amber-700 italic">
                              Em auditoria
                            </span>
                          )}

                          {status === 'CONFERIDO' && (
                            <span className="text-[11px] text-emerald-700 font-semibold">
                              Aguardando repasse
                            </span>
                          )}

                          {status === 'LIQUIDADO' && (
                            <span className="text-[11px] text-purple-700 font-semibold">
                              Repasse Efetuado
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer com Totalizadores do Submenu e Controles de Rolagem */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/90 px-4 py-2.5 sm:px-5 text-xs text-slate-700 font-medium">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span>
              Exibindo <strong className="text-slate-900">{vendasFiltradas.length}</strong> de{' '}
              <strong className="text-slate-900">{minhasVendas.length}</strong> contrato(s)
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span>
              Volume do Submenu: <strong className="text-slate-900">R$ {totalVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span>
              Comissão do Submenu: <strong className="text-emerald-700">R$ {totalComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={rolarParaTopo}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              <span>Rolar para o topo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Justificativa de Rejeição */}
      {justificativaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <AlertCircle className="h-4 w-4" />
                Justificativa da Rejeição ({justificativaModal.doc})
              </div>
              <button
                onClick={() => setJustificativaModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 rounded-lg bg-rose-50 p-3.5 text-xs text-rose-900 border border-rose-200">
              <p className="font-semibold text-rose-950 mb-1">Motivo apontado pelo Administrador:</p>
              <p className="whitespace-pre-wrap">{justificativaModal.texto}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setJustificativaModal(null)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
