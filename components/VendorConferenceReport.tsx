'use client';

import React, { useState, useMemo } from 'react';
import { useCommission } from '@/lib/commission-context';
import { StatusLancamento } from '@/lib/types';
import { formatarDataBR, formatarMoedaBR } from '@/lib/utils';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileText,
  Filter,
  Info,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export function VendorConferenceReport() {
  const {
    usuarios,
    usuarioAtual,
    vendas,
    lancamentos,
    conferirLancamento,
    conferirLancamentosEmLote,
  } = useCommission();

  const isAdmin = usuarioAtual.perfil_nome === 'ADMINISTRADOR';

  // Filters
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'APROVADO' | 'CONFERIDO' | 'LIQUIDADO'>(
    'TODOS'
  );
  const [buscaDoc, setBuscaDoc] = useState('');
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [vendedorFiltroId, setVendedorFiltroId] = useState<string>('TODOS');

  const vendedores = useMemo(
    () => usuarios.filter((u) => u.perfil_nome === 'VENDEDOR'),
    [usuarios]
  );

  // Filtrar lançamentos aplicáveis à conferência
  // De acordo com requisito 5.1: foco em APROVADO e CONFERIDO (comissões auditadas)
  const itensConferencia = lancamentos
    .filter((l) => {
      // Vendedor vê estritamente apenas os seus; Admin pode ver todos ou filtrar
      if (!isAdmin && l.vendedor_id !== usuarioAtual.id) return false;
      if (isAdmin && vendedorFiltroId !== 'TODOS' && l.vendedor_id !== vendedorFiltroId) return false;
      // Relevantes para a esteira de conferência e repasse
      return ['APROVADO', 'CONFERIDO', 'LIQUIDADO'].includes(l.status);
    })
    .map((l) => {
      const venda = vendas.find((v) => v.id === l.venda_id);
      return {
        lancamento: l,
        venda: venda,
      };
    })
    .filter(({ lancamento, venda }) => {
      if (!venda) return false;
      if (filtroStatus !== 'TODOS' && lancamento.status !== filtroStatus) return false;

      if (dataInicio && venda.data_venda < dataInicio) return false;
      if (dataFim && venda.data_venda > dataFim) return false;

      if (buscaDoc.trim()) {
        const q = buscaDoc.toLowerCase();
        const matchDoc = venda.numero_documento.toLowerCase().includes(q);
        const matchSeq =
          (venda.codigo_venda || '').toLowerCase().includes(q) ||
          `#${venda.numero_sequencial || ''}`.includes(q);
        const matchData =
          formatarDataBR(venda.data_venda).toLowerCase().includes(q) ||
          venda.data_venda.toLowerCase().includes(q);
        const matchCliente = venda.cliente_nome.toLowerCase().includes(q);
        return matchDoc || matchSeq || matchData || matchCliente;
      }
      return true;
    });

  // Métricas financeiras
  const totalAguardandoConferencia = itensConferencia
    .filter((i) => i.lancamento.status === 'APROVADO')
    .reduce((acc, curr) => acc + curr.lancamento.valor_comissao_calculado, 0);

  const totalConferidoAguardandoRepasse = itensConferencia
    .filter((i) => i.lancamento.status === 'CONFERIDO')
    .reduce((acc, curr) => acc + curr.lancamento.valor_comissao_calculado, 0);

  const totalLiquidado = itensConferencia
    .filter((i) => i.lancamento.status === 'LIQUIDADO')
    .reduce((acc, curr) => acc + curr.lancamento.valor_comissao_calculado, 0);

  const itensAprovadosParaSelecao = itensConferencia.filter(
    (i) => i.lancamento.status === 'APROVADO'
  );

  const handleToggleSelectAll = () => {
    if (selecionados.length === itensAprovadosParaSelecao.length) {
      setSelecionados([]);
    } else {
      setSelecionados(itensAprovadosParaSelecao.map((i) => i.lancamento.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConferirSelecionados = async () => {
    if (!selecionados.length) return;
    const res = await conferirLancamentosEmLote(selecionados);
    if (res.sucesso) {
      setMensagemSucesso(res.mensagem);
      setSelecionados([]);
      setTimeout(() => setMensagemSucesso(null), 4000);
    }
  };

  const handleConferirIndividual = async (id: string) => {
    const res = await conferirLancamento(id);
    if (res.sucesso) {
      setMensagemSucesso(res.mensagem);
      setTimeout(() => setMensagemSucesso(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Explicativo do Módulo 5.1 */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Relatório de Conferência de Comissões (Requisito 5.1)
                </h3>
                <span className="rounded-full bg-emerald-200/70 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                  Auditoria & Aceite do Vendedor
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600 max-w-3xl leading-relaxed">
                Permite ao vendedor auditar o cálculo oficial de comissões liberadas pela administração.
                Ao clicar em <span className="font-semibold text-slate-900">&quot;Marcar como Conferido&quot;</span>, o
                lançamento passa para o status <strong className="text-emerald-800">CONFERIDO</strong>,
                habilitando o Administrador a incluir os valores no lote de repasse financeiro e emissão de recibo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {mensagemSucesso && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-100 p-3 text-xs font-semibold text-emerald-900 border border-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Aguardando Conferência
            </span>
            <span className="rounded-full bg-blue-50 p-1.5 text-blue-600">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-xl font-black text-blue-900">
            R$ {totalAguardandoConferencia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500">
            {itensConferencia.filter((i) => i.lancamento.status === 'APROVADO').length} comissão(ões)
            aprovadas pendentes de aceite
          </span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Conferidas / Prontas p/ Repasse
            </span>
            <span className="rounded-full bg-emerald-50 p-1.5 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-xl font-black text-emerald-700">
            R$ {totalConferidoAguardandoRepasse.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500">
            Aguardando inclusão no lote de repasse do Admin
          </span>
        </div>

        <div className="rounded-xl border border-purple-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Total Já Liquidado / Pago
            </span>
            <span className="rounded-full bg-purple-50 p-1.5 text-purple-600">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-xl font-black text-purple-900">
            R$ {totalLiquidado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500">
            Comprovantes bancários registrados no sistema
          </span>
        </div>
      </div>

      {/* Filter and Action Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600 mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              Status:
            </span>
            {[
              { id: 'TODOS', label: 'Todos os Auditados' },
              { id: 'APROVADO', label: 'Aprovados (A Conferir)' },
              { id: 'CONFERIDO', label: 'Conferidos' },
              { id: 'LIQUIDADO', label: 'Liquidados' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFiltroStatus(st.id as any)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  filtroStatus === st.id
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Batch Conference Action */}
          {itensAprovadosParaSelecao.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleSelectAll}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
              >
                {selecionados.length === itensAprovadosParaSelecao.length
                  ? 'Desmarcar Todos'
                  : 'Selecionar Todos Aprovados'}
              </button>
              <button
                disabled={selecionados.length === 0}
                onClick={handleConferirSelecionados}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Marcar Selecionados como Conferido ({selecionados.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Date and Search Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {isAdmin && (
            <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
              <span className="font-semibold text-slate-500 text-[11px]">Vendedor:</span>
              <select
                value={vendedorFiltroId}
                onChange={(e) => setVendedorFiltroId(e.target.value)}
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="TODOS">⭐ Todos os Vendedores</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Período de Venda:
            </span>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800"
            />
            <span className="text-slate-400">até</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800"
            />
            {(dataInicio || dataFim) && (
              <>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-700 border border-slate-200">
                  {dataInicio ? formatarDataBR(dataInicio) : 'início'} até {dataFim ? formatarDataBR(dataFim) : 'fim'}
                </span>
                <button
                  onClick={() => {
                    setDataInicio('');
                    setDataFim('');
                  }}
                  className="text-[11px] text-slate-500 hover:underline"
                >
                  Limpar
                </button>
              </>
            )}
          </div>

          <div className="ml-auto relative">
            <input
              type="text"
              placeholder="Buscar por Protocolo/Doc..."
              value={buscaDoc}
              onChange={(e) => setBuscaDoc(e.target.value)}
              className="w-56 rounded-md border border-slate-300 pl-7 pr-3 py-1 text-xs text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
            />
            <Search className="pointer-events-none absolute left-2 top-1.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Mandatory Columns Table as Specified in Section 5.1 */}
      {/* Colunas: Data, Protocolo/Doc, Valor Venda, Valor Entrada, % Entrada, Tipo Entrada, % ou Fixo Aplicado, Comissão Bruta, Status */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-3 py-3 w-8">
                  <span className="sr-only">Seleção</span>
                </th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Nº Venda / Doc</th>
                {isAdmin && <th className="px-4 py-3">Vendedor</th>}
                <th className="px-4 py-3 text-right">Valor Venda</th>
                <th className="px-4 py-3 text-right">Valor Entrada</th>
                <th className="px-4 py-3 text-center">% Entrada</th>
                <th className="px-4 py-3">Tipo Entrada</th>
                <th className="px-4 py-3 text-right">% ou Fixo Aplicado</th>
                <th className="px-4 py-3 text-right">Comissão Bruta</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensConferencia.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 12 : 11} className="py-10 text-center text-xs text-slate-500">
                    Nenhum lançamento elegível para conferência localizado no período selecionado.
                  </td>
                </tr>
              ) : (
                itensConferencia.map(({ lancamento, venda }) => {
                  if (!venda) return null;
                  const isAprovado = lancamento.status === 'APROVADO';
                  const isChecked = selecionados.includes(lancamento.id);

                  return (
                    <tr
                      key={lancamento.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isChecked ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="px-3 py-3 text-center">
                        {isAprovado && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(lancamento.id)}
                            className="rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                        {formatarDataBR(venda.data_venda)}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                            {venda.codigo_venda || `#${String(venda.numero_sequencial || '').padStart(4, '0')}`}
                          </span>
                          <span className="truncate max-w-[130px]" title={venda.numero_documento}>
                            {venda.numero_documento}
                          </span>
                        </div>
                        <span className="block text-[10px] font-normal text-slate-500 truncate max-w-[140px]">
                          {venda.cliente_nome}
                        </span>
                        {venda.procedimentos && (
                          <span
                            className="block text-[10px] font-normal text-emerald-700 truncate max-w-[140px]"
                            title={venda.procedimentos}
                          >
                            {venda.procedimentos}
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-semibold text-[11px]">
                          {venda.vendedor_nome}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        R$ {venda.valor_total_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-700">
                        R$ {venda.valor_entrada_valida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap font-bold text-slate-800">
                        {lancamento.percentual_entrada_calculado.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}%
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                          {venda.tipo_pagamento_entrada}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-slate-800">
                        {lancamento.tipo_regra_aplicada === 'VALOR_FIXO'
                          ? formatarMoedaBR(lancamento.aliquota_ou_fixo_aplicado, true)
                          : `${lancamento.aliquota_ou_fixo_aplicado.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}%`}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-black text-emerald-700">
                        R$ {lancamento.valor_comissao_calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {lancamento.status === 'APROVADO' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200">
                            <Clock className="h-3 w-3 text-blue-600" />
                            Aprovado (Pendente Conferência)
                          </span>
                        )}
                        {lancamento.status === 'CONFERIDO' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Conferido pelo Vendedor
                          </span>
                        )}
                        {lancamento.status === 'LIQUIDADO' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200">
                            <ShieldCheck className="h-3 w-3 text-purple-600" />
                            Liquidado / Pago
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isAprovado ? (
                          <button
                            onClick={() => handleConferirIndividual(lancamento.id)}
                            className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                          >
                            <Check className="h-3 w-3" />
                            Marcar como Conferido
                          </button>
                        ) : lancamento.status === 'CONFERIDO' ? (
                          <span className="text-[11px] font-semibold text-emerald-700">
                            Aceite Confirmado ✓
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">Repasse #{lancamento.repasse_id}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
