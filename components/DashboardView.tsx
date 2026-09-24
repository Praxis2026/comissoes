'use client';

import React, { useState, useMemo } from 'react';
import { useCommission } from '@/lib/commission-context';
import { StatusLancamento, Venda, LancamentoComissao } from '@/lib/types';
import { formatarDataBR, formatarMoedaBR } from '@/lib/utils';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Percent,
  PlusCircle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';

interface DashboardViewProps {
  onNovaVenda: () => void;
  onNavegarPara: (aba: string) => void;
  onEditarVenda?: (venda: Venda) => void;
}

export function DashboardView({
  onNovaVenda,
  onNavegarPara,
  onEditarVenda,
}: DashboardViewProps) {
  const {
    usuarioAtual,
    usuarios,
    vendas,
    lancamentos,
    repasses,
    regras,
    obterRegraVigente,
  } = useCommission();

  const isAdmin = usuarioAtual.perfil_nome === 'ADMINISTRADOR';
  const vendedores = useMemo(
    () => usuarios.filter((u) => u.perfil_nome === 'VENDEDOR'),
    [usuarios]
  );

  // For Admin: allow selecting "TODOS" or a specific seller to inspect
  const [vendedorFiltroId, setVendedorFiltroId] = useState<string>('TODOS');

  // Today's date for reference
  const hoje = useMemo(() => new Date().toISOString().split('T')[0], []);

  // =========================================================================
  // VENDEDOR STATS (ou vendedor filtrado se Admin selecionou um específico)
  // =========================================================================
  const alvoVendedorId = isAdmin
    ? vendedorFiltroId === 'TODOS'
      ? null
      : vendedorFiltroId
    : usuarioAtual.id;

  const alvoVendedorObj = alvoVendedorId
    ? usuarios.find((u) => u.id === alvoVendedorId)
    : null;

  // Rule of target seller
  const regraVendedorAlvo = alvoVendedorId
    ? obterRegraVigente(alvoVendedorId, hoje)
    : undefined;

  // Filtered sales and commission entries - non-admins strictly isolated to their own records
  const vendasFiltradas = useMemo(() => {
    if (!isAdmin) {
      return vendas.filter((v) => v.vendedor_id === usuarioAtual.id);
    }
    if (alvoVendedorId) {
      return vendas.filter((v) => v.vendedor_id === alvoVendedorId);
    }
    return vendas;
  }, [vendas, alvoVendedorId, isAdmin, usuarioAtual.id]);

  const lancamentosFiltrados = useMemo(() => {
    if (!isAdmin) {
      return lancamentos.filter((l) => l.vendedor_id === usuarioAtual.id);
    }
    if (alvoVendedorId) {
      return lancamentos.filter((l) => l.vendedor_id === alvoVendedorId);
    }
    return lancamentos;
  }, [lancamentos, alvoVendedorId, isAdmin, usuarioAtual.id]);

  // Combined Venda + Lancamento
  const vendasComLancamento = useMemo(() => {
    return vendasFiltradas.map((v) => {
      const lanc = lancamentos.find((l) => l.venda_id === v.id);
      return { venda: v, lancamento: lanc };
    });
  }, [vendasFiltradas, lancamentos]);

  // Aggregate Metrics
  const metricas = useMemo(() => {
    const totalVolume = vendasFiltradas.reduce((acc, v) => acc + (Number(v.valor_total_venda) || 0), 0);
    const totalEntrada = vendasFiltradas.reduce((acc, v) => acc + (Number(v.valor_entrada_valida) || 0), 0);
    const taxaMediaEntrada = totalVolume > 0 ? (totalEntrada / totalVolume) * 100 : 0;

    let comissaoTotal = 0;
    let comissaoRascunho = 0;
    let comissaoPendenteAprovacao = 0;
    let comissaoAprovada = 0; // aguardando conferência
    let comissaoConferida = 0; // pronta para repasse
    let comissaoLiquidada = 0; // já repassada
    let comissaoEstornada = 0;

    let qtdRascunho = 0;
    let qtdPendenteAprovacao = 0;
    let qtdAprovada = 0;
    let qtdConferida = 0;
    let qtdLiquidada = 0;
    let qtdEstornada = 0;

    lancamentosFiltrados.forEach((l) => {
      const val = Number(l.valor_comissao_calculado) || 0;
      comissaoTotal += val;

      switch (l.status) {
        case 'RASCUNHO':
          comissaoRascunho += val;
          qtdRascunho++;
          break;
        case 'PENDENTE_APROVACAO':
          comissaoPendenteAprovacao += val;
          qtdPendenteAprovacao++;
          break;
        case 'APROVADO':
          comissaoAprovada += val;
          qtdAprovada++;
          break;
        case 'CONFERIDO':
          comissaoConferida += val;
          qtdConferida++;
          break;
        case 'LIQUIDADO':
          comissaoLiquidada += val;
          qtdLiquidada++;
          break;
        case 'ESTORNADO':
          comissaoEstornada += val;
          qtdEstornada++;
          break;
      }
    });

    // Entradas por faixa (>=30%, 20-30%, 10-20%, <10%)
    let vendasFaixa30 = 0;
    let vendasFaixa20 = 0;
    let vendasFaixa10 = 0;
    let vendasFaixaMenor10 = 0;

    vendasFiltradas.forEach((v) => {
      const pct = v.valor_total_venda > 0 ? (v.valor_entrada_valida / v.valor_total_venda) * 100 : 0;
      if (pct >= 30) vendasFaixa30++;
      else if (pct >= 20) vendasFaixa20++;
      else if (pct >= 10) vendasFaixa10++;
      else vendasFaixaMenor10++;
    });

    const ticketMedio = vendasFiltradas.length > 0 ? totalVolume / vendasFiltradas.length : 0;

    return {
      totalVolume,
      totalEntrada,
      taxaMediaEntrada,
      totalVendas: vendasFiltradas.length,
      ticketMedio,
      comissaoTotal,
      comissaoRascunho,
      comissaoPendenteAprovacao,
      comissaoAprovada,
      comissaoConferida,
      comissaoLiquidada,
      comissaoEstornada,
      qtdRascunho,
      qtdPendenteAprovacao,
      qtdAprovada,
      qtdConferida,
      qtdLiquidada,
      qtdEstornada,
      vendasFaixa30,
      vendasFaixa20,
      vendasFaixa10,
      vendasFaixaMenor10,
    };
  }, [vendasFiltradas, lancamentosFiltrados]);

  // =========================================================================
  // ADMIN GROUPING: DADOS AGRUPADOS POR VENDEDOR (APENAS ADMINISTRADOR)
  // =========================================================================
  const relatorioAgrupadoVendedores = useMemo(() => {
    if (!isAdmin) return [];
    return vendedores.map((vend) => {
      const vendasVend = vendas.filter((v) => v.vendedor_id === vend.id);
      const lancsVend = lancamentos.filter((l) => l.vendedor_id === vend.id);
      const regraVend = obterRegraVigente(vend.id, hoje);

      const totalVolume = vendasVend.reduce((acc, v) => acc + (Number(v.valor_total_venda) || 0), 0);
      const totalEntrada = vendasVend.reduce((acc, v) => acc + (Number(v.valor_entrada_valida) || 0), 0);
      const pctMedioEntrada = totalVolume > 0 ? (totalEntrada / totalVolume) * 100 : 0;

      let comissaoTotal = 0;
      let comissaoPendente = 0;
      let comissaoAprovadaAguardandoConferencia = 0;
      let comissaoConferidaProntaRepasse = 0;
      let comissaoPaga = 0;

      lancsVend.forEach((l) => {
        const val = Number(l.valor_comissao_calculado) || 0;
        comissaoTotal += val;
        if (l.status === 'PENDENTE_APROVACAO') comissaoPendente += val;
        if (l.status === 'APROVADO') comissaoAprovadaAguardandoConferencia += val;
        if (l.status === 'CONFERIDO') comissaoConferidaProntaRepasse += val;
        if (l.status === 'LIQUIDADO') comissaoPaga += val;
      });

      return {
        vendedor: vend,
        regra: regraVend,
        totalVendas: vendasVend.length,
        totalVolume,
        totalEntrada,
        pctMedioEntrada,
        comissaoTotal,
        comissaoPendente,
        comissaoAprovadaAguardandoConferencia,
        comissaoConferidaProntaRepasse,
        comissaoPaga,
        ticketMedio: vendasVend.length > 0 ? totalVolume / vendasVend.length : 0,
      };
    });
  }, [isAdmin, vendedores, vendas, lancamentos, obterRegraVigente, hoje]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Welcome Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Dashboard de Comissionamento
                </h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                    isAdmin
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {isAdmin ? 'Visão Gestor (Administrador)' : 'Painel do Vendedor'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {isAdmin
                  ? 'Acompanhamento consolidado de receitas, captação de entrada líquida e provisão de comissões por vendedor.'
                  : `Bem-vindo, ${usuarioAtual.nome}. Acompanhe seu desempenho de vendas, entradas válidas e comissões.`}
              </p>
            </div>
          </div>

          {/* Quick Actions & Admin Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-semibold text-slate-600">Filtrar:</span>
                <select
                  value={vendedorFiltroId}
                  onChange={(e) => setVendedorFiltroId(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="TODOS">Todos os Vendedores (Consolidado)</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onNovaVenda}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              Lançar Venda
            </button>
          </div>
        </div>
      </div>

      {/* Immediate Attention Callout (For Seller: Approved waiting for formal conference) */}
      {!isAdmin && metricas.qtdAprovada > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-linear-to-r from-amber-50 to-orange-50/60 p-4 shadow-2xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-950">
                    Ação Necessária: {metricas.qtdAprovada} {metricas.qtdAprovada === 1 ? 'comissão aguarda' : 'comissões aguardam'} sua conferência formal!
                  </h3>
                  <span className="rounded-md bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                    Requisito 5.1
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-amber-800">
                  Total de <strong>R$ {metricas.comissaoAprovada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> já aprovado pela gerência.
                  Acesse a tela de conferência para dar o aceite digital e liberar a inclusão no lote de repasse financeiro.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavegarPara('conferencia_vendedor')}
              className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors shrink-0"
            >
              Conferir Agora
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Admin Action Callout: Pending Manager Approvals */}
      {isAdmin && metricas.qtdPendenteAprovacao > 0 && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 shadow-2xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-purple-950">
                  Pendências de Gestão: {metricas.qtdPendenteAprovacao} {metricas.qtdPendenteAprovacao === 1 ? 'venda aguarda' : 'vendas aguardam'} aprovação do gestor
                </h3>
                <p className="mt-0.5 text-xs text-purple-800">
                  Total de <strong>R$ {metricas.comissaoPendenteAprovacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> em comissões a aprovar.
                  Acesse o módulo de Aprovações & Auditoria para revisar valores, meios de pagamento e validar os lançamentos.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavegarPara('aprovacoes')}
              className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-800 transition-colors shrink-0"
            >
              Revisar e Aprovar
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          KEY METRICS TILES (4 CARDS)
          ========================================================================= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Faturamento Total */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {isAdmin && vendedorFiltroId === 'TODOS' ? 'Faturamento Global' : 'Faturamento de Vendas'}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              R$ {metricas.totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
              <span>{metricas.totalVendas} contratos emitidos</span>
              <span className="font-semibold text-slate-700">
                Méd: R$ {metricas.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Entrada Líquida Válida */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Entrada Válida Captada
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700 tracking-tight">
              R$ {metricas.totalEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <TrendingUp className="h-3.5 w-3.5" />
                {metricas.taxaMediaEntrada.toFixed(1)}% de entrada média
              </span>
              <span className="text-[11px] text-slate-400">PIX / Dinheiro / Débito</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Comissões Calculadas */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {isAdmin && vendedorFiltroId === 'TODOS' ? 'Provisão Total Comissões' : 'Minhas Comissões'}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              R$ {metricas.comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
              <span className="text-slate-600">
                {metricas.totalVolume > 0
                  ? ((metricas.comissaoTotal / metricas.totalVolume) * 100).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : '0,00'}
                % da receita bruta
              </span>
              <span className="font-semibold text-blue-700">
                {metricas.qtdLiquidada + metricas.qtdConferida + metricas.qtdAprovada} aprovadas
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Liquidado vs Aguardando */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Repasses & Liquidações
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-purple-700 tracking-tight">
              R$ {metricas.comissaoLiquidada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
              <span className="text-slate-500">Já Repassado</span>
              <span className="font-semibold text-amber-700">
                R$ {(metricas.comissaoAprovada + metricas.comissaoConferida).toLocaleString('pt-BR', { minimumFractionDigits: 0 })} a repassar
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PIPELINE / FUNIL DE STATUS OPERACIONAL
          ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Funil do Ciclo de Vida da Comissão (Fluxo Operacional)
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Total de {lancamentosFiltrados.length} lançamentos registrados
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* 1. Rascunho */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-[11px] font-bold">1. Rascunho</span>
              <FileText className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-lg font-black text-slate-800">
              R$ {metricas.comissaoRascunho.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-1">
              {metricas.qtdRascunho} não submetidas
            </div>
          </div>

          {/* 2. Pendente Aprovação */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3.5">
            <div className="flex items-center justify-between text-purple-900">
              <span className="text-[11px] font-bold">2. P/ Aprovação</span>
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-2 text-lg font-black text-purple-900">
              R$ {metricas.comissaoPendenteAprovacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-purple-700 font-medium mt-1">
              {metricas.qtdPendenteAprovacao} na gerência
            </div>
          </div>

          {/* 3. Aprovado (Aguardando Conferência) */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5">
            <div className="flex items-center justify-between text-amber-900">
              <span className="text-[11px] font-bold">3. P/ Conferência</span>
              <FileCheck className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 text-lg font-black text-amber-900">
              R$ {metricas.comissaoAprovada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-amber-800 font-medium mt-1">
              {metricas.qtdAprovada} aguarda vendedor
            </div>
          </div>

          {/* 4. Conferido (Pronto para Repasse) */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5">
            <div className="flex items-center justify-between text-blue-900">
              <span className="text-[11px] font-bold">4. Conferido</span>
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2 text-lg font-black text-blue-900">
              R$ {metricas.comissaoConferida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-blue-700 font-medium mt-1">
              {metricas.qtdConferida} pronto p/ lote
            </div>
          </div>

          {/* 5. Liquidado / Pago */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
            <div className="flex items-center justify-between text-emerald-900">
              <span className="text-[11px] font-bold">5. Liquidado</span>
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-lg font-black text-emerald-800">
              R$ {metricas.comissaoLiquidada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-emerald-700 font-medium mt-1">
              {metricas.qtdLiquidada} com comprovante
            </div>
          </div>

          {/* 6. Estornado */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3.5">
            <div className="flex items-center justify-between text-rose-900">
              <span className="text-[11px] font-bold">6. Estornado</span>
              <XCircle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-2 text-lg font-black text-rose-900">
              R$ {metricas.comissaoEstornada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-rose-700 font-medium mt-1">
              {metricas.qtdEstornada} canceladas
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ADMIN ONLY: INFORMAÇÕES AGRUPADAS DE TODOS OS VENDEDORES
          ========================================================================= */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Visão Agrupada por Vendedor Comercial
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Demonstrativo consolidado de faturamento, captação de entrada válida e comissões por vendedor
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Total de <strong>{vendedores.length} vendedores</strong> cadastrados na equipe
              </div>
            </div>

            {/* Seller Cards Grid */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {relatorioAgrupadoVendedores.map((item) => {
                const isSelected = vendedorFiltroId === item.vendedor.id;
                return (
                  <div
                    key={item.vendedor.id}
                    className={`rounded-xl border p-4.5 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700 border border-slate-200">
                          {item.vendedor.nome.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">{item.vendedor.nome}</h3>
                          <span className="text-[11px] text-slate-500">{item.vendedor.email}</span>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          item.regra?.tipo_comissao === 'VALOR_FIXO'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.regra?.tipo_comissao === 'VALOR_FIXO'
                          ? `Fixo: R$ ${item.regra.valor_fixo.toFixed(0)}`
                          : 'Escalonado (Entrada)'}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">
                          Volume Faturado
                        </span>
                        <div className="font-extrabold text-slate-900 text-sm">
                          R$ {item.totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.totalVendas} vendas (méd. R$ {item.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 0 })})
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">
                          Entrada Válida
                        </span>
                        <div className="font-extrabold text-emerald-700 text-sm">
                          R$ {item.totalEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-800">
                          {item.pctMedioEntrada.toFixed(1)}% de entrada média
                        </div>
                      </div>
                    </div>

                    {/* Commission breakdown */}
                    <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] space-y-1">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Total Comissões Geradas:</span>
                        <span className="text-emerald-800">
                          R$ {item.comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Pendente de Aprovação:</span>
                        <span className={item.comissaoPendente > 0 ? 'font-bold text-purple-700' : 'text-slate-400'}>
                          R$ {item.comissaoPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Pronto p/ Repasse (Conferido):</span>
                        <span className={item.comissaoConferidaProntaRepasse > 0 ? 'font-bold text-blue-700' : 'text-slate-400'}>
                          R$ {item.comissaoConferidaProntaRepasse.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Liquidado / Pago:</span>
                        <span className="font-semibold text-emerald-700">
                          R$ {item.comissaoPaga.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Quick filter action */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setVendedorFiltroId(isSelected ? 'TODOS' : item.vendedor.id);
                        }}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                      >
                        {isSelected ? 'Limpar filtro' : 'Filtrar este vendedor no painel'}
                        <ArrowRight className="h-3 w-3" />
                      </button>

                      <button
                        onClick={() => {
                          onNavegarPara('minhas_vendas');
                        }}
                        className="text-[11px] text-slate-500 hover:text-slate-800 font-medium"
                      >
                        Ver contratos
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Consolidated Table View */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Tabela Consolidada de Comissionamento por Vendedor
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Vendedor</th>
                      <th className="px-3 py-3 text-center">Regra Vigente</th>
                      <th className="px-3 py-3 text-center">Qtd Vendas</th>
                      <th className="px-4 py-3 text-right">Volume Total (R$)</th>
                      <th className="px-4 py-3 text-right">Entrada Válida</th>
                      <th className="px-3 py-3 text-center">% Médio Entrada</th>
                      <th className="px-4 py-3 text-right">Total Comissões</th>
                      <th className="px-4 py-3 text-right">A Repassar</th>
                      <th className="px-4 py-3 text-right">Liquidado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {relatorioAgrupadoVendedores.map((item) => (
                      <tr key={item.vendedor.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                              {item.vendedor.nome.charAt(0)}
                            </div>
                            <div>
                              <div>{item.vendedor.nome}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{item.vendedor.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              item.regra?.tipo_comissao === 'VALOR_FIXO'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.regra?.tipo_comissao === 'VALOR_FIXO' ? 'Valor Fixo' : 'Escalonado'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-slate-700">
                          {item.totalVendas}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          R$ {item.totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          R$ {item.totalEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-center font-extrabold text-slate-800">
                          {item.pctMedioEntrada.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-900">
                          R$ {item.comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-700">
                          R$ {(item.comissaoAprovadaAguardandoConferencia + item.comissaoConferidaProntaRepasse).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-800">
                          R$ {item.comissaoPaga.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <tr>
                      <td className="px-4 py-3" colSpan={2}>
                        Total Consolidado da Empresa
                      </td>
                      <td className="px-3 py-3 text-center">{metricas.totalVendas}</td>
                      <td className="px-4 py-3 text-right">
                        R$ {metricas.totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700">
                        R$ {metricas.totalEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-center">{metricas.taxaMediaEntrada.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right">
                        R$ {metricas.comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-700">
                        R$ {(metricas.comissaoAprovada + metricas.comissaoConferida).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-800">
                        R$ {metricas.comissaoLiquidada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SELLER SPECIFIC OR ACTIVE SELLER: REGRA ATIVA & DISTRIBUIÇÃO POR FAIXA
          ========================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Recent Sales Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Últimas Vendas & Comissões Registradas
              </h2>
            </div>
            <button
              onClick={() => onNavegarPara('minhas_vendas')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              Ver todas ({vendasFiltradas.length})
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Documento / Data</th>
                  <th className="px-3 py-2.5">{isAdmin ? 'Cliente / Vendedor' : 'Cliente'}</th>
                  <th className="px-3 py-2.5 text-right">Valor Venda</th>
                  <th className="px-3 py-2.5 text-right">Entrada (%)</th>
                  <th className="px-3 py-2.5 text-right">Comissão</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendasComLancamento.slice(0, 5).map(({ venda, lancamento }) => {
                  const status = lancamento?.status || 'RASCUNHO';
                  const pctEntrada =
                    venda.valor_total_venda > 0
                      ? (venda.valor_entrada_valida / venda.valor_total_venda) * 100
                      : 0;

                  return (
                    <tr key={venda.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900">
                          {venda.codigo_venda ? (
                            <span className="text-emerald-700 font-mono text-[11px] mr-1.5 font-bold">
                              {venda.codigo_venda}
                            </span>
                          ) : null}
                          {venda.numero_documento}
                        </div>
                        <div className="text-[10px] text-slate-400">{formatarDataBR(venda.data_venda)}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-800">{venda.cliente_nome}</div>
                        {isAdmin && (
                          <div className="text-[10px] text-slate-500">{venda.vendedor_nome}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                        R$ {venda.valor_total_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-bold text-emerald-800">
                          {pctEntrada.toFixed(1)}%
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {venda.tipo_pagamento_entrada}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-slate-900">
                        R${' '}
                        {(lancamento?.valor_comissao_calculado || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                        {lancamento && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            {lancamento.tipo_regra_aplicada === 'VALOR_FIXO'
                              ? 'Fixo'
                              : `${lancamento.aliquota_ou_fixo_aplicado.toFixed(1)}%`}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            status === 'LIQUIDADO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'CONFERIDO'
                              ? 'bg-blue-100 text-blue-800'
                              : status === 'APROVADO'
                              ? 'bg-amber-100 text-amber-900'
                              : status === 'PENDENTE_APROVACAO'
                              ? 'bg-purple-100 text-purple-800'
                              : status === 'ESTORNADO'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {vendasComLancamento.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-xs text-slate-400 italic">
                      Nenhuma venda registrada até o momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Regra Vigente & Conversão de Faixas */}
        <div className="space-y-4">
          {/* Active Rule Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Regra Contratual Vigente
                </h3>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                Ativa
              </span>
            </div>

            <div className="mt-3">
              {regraVendedorAlvo ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Tipo de Modelo:</span>
                    <span className="font-bold text-slate-900">
                      {regraVendedorAlvo.tipo_comissao === 'VALOR_FIXO'
                        ? 'Valor Fixo Nominal'
                        : 'Escalonado por Entrada (1.1)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Vigência:</span>
                    <span className="text-slate-600">
                      Desde {regraVendedorAlvo.vigencia_inicio}
                    </span>
                  </div>

                  {regraVendedorAlvo.tipo_comissao === 'VALOR_FIXO' ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-center">
                      <div className="text-xs text-blue-700 font-semibold">Valor por Venda:</div>
                      <div className="text-xl font-black text-blue-900 mt-0.5">
                        {formatarMoedaBR(regraVendedorAlvo.valor_fixo, true)}
                      </div>
                      <div className="text-[10px] text-blue-600 mt-1">
                        Pago independente da entrada do cliente
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Escala de Alíquotas:
                      </div>
                      {regraVendedorAlvo.faixas?.map((fx, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-1 text-xs"
                        >
                          <span className="text-slate-600">
                            ≥ {fx.percentual_entrada_min}%
                            {fx.percentual_entrada_max ? ` e < ${fx.percentual_entrada_max}%` : ''}
                          </span>
                          <span className="font-bold text-emerald-700">
                            {fx.percentual_comissao.toFixed(1)}% comissão
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3">
                    <button
                      onClick={() => onNavegarPara('configuracoes')}
                      className="w-full text-center text-xs font-bold text-emerald-700 hover:text-emerald-800"
                    >
                      {isAdmin ? 'Gerenciar Regras nas Configurações' : 'Ver Detalhes dos Parâmetros'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-4">
                  Nenhuma regra vigente identificada para esta data.
                </p>
              )}
            </div>
          </div>

          {/* Faixas Breakdown Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              Captação por Faixa de Entrada
            </h3>

            <div className="mt-3 space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Faixa Top (≥ 30% entrada):</span>
                  <span className="font-bold text-emerald-700">{metricas.vendasFaixa30} vendas</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{
                      width: `${metricas.totalVendas > 0 ? (metricas.vendasFaixa30 / metricas.totalVendas) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Faixa Intermediária (20% a 30%):</span>
                  <span className="font-bold text-blue-700">{metricas.vendasFaixa20} vendas</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{
                      width: `${metricas.totalVendas > 0 ? (metricas.vendasFaixa20 / metricas.totalVendas) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Faixa Mínima (10% a 20%):</span>
                  <span className="font-bold text-amber-700">{metricas.vendasFaixa10} vendas</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${metricas.totalVendas > 0 ? (metricas.vendasFaixa10 / metricas.totalVendas) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Residual / Sem Entrada (&lt; 10%):</span>
                  <span className="font-bold text-slate-500">{metricas.vendasFaixaMenor10} vendas</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-slate-400 rounded-full"
                    style={{
                      width: `${metricas.totalVendas > 0 ? (metricas.vendasFaixaMenor10 / metricas.totalVendas) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
