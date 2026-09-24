'use client';

import React, { useState } from 'react';
import { useCommission } from '@/lib/commission-context';
import { LancamentoComissao, Repasse, Usuario, Venda } from '@/lib/types';
import { formatarDataBR, formatarMoedaBR } from '@/lib/utils';
import { ReceiptModal } from '@/components/ReceiptModal';
import { CommissionEstornoModal } from '@/components/CommissionEstornoModal';
import {
  AlertCircle,
  AlertTriangle,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  FileCheck,
  FileText,
  Filter,
  History,
  Layers,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';

export function AdminRepasseBatch() {
  const {
    usuarios,
    usuarioAtual,
    vendas,
    lancamentos,
    repasses,
    liquidarRepasseLote,
  } = useCommission();

  const isAdmin = usuarioAtual.perfil_nome === 'ADMINISTRADOR';

  const vendedores = usuarios.filter((u) => u.perfil_nome === 'VENDEDOR');

  // Active view: 'novo_lote' or 'historico'
  const [subAba, setSubAba] = useState<'novo_lote' | 'historico'>('novo_lote');

  // New payout batch state
  const [vendedorSelecionadoId, setVendedorSelecionadoId] = useState<string>('TODOS');
  const [dataRepasse, setDataRepasse] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [comprovante, setComprovante] = useState('PIX-994012');
  const [observacoes, setObservacoes] = useState('');
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(
    null
  );

  // Receipt Modal state
  const [reciboModalRepasse, setReciboModalRepasse] = useState<Repasse | null>(null);
  const [recibosGeradosLote, setRecibosGeradosLote] = useState<Repasse[]>([]);

  // Estorno Modal state
  const [estornoModalItem, setEstornoModalItem] = useState<{
    lancamento: LancamentoComissao;
    venda: Venda;
    repasse?: Repasse | null;
  } | null>(null);

  // Expandable batch rows in history
  const [lotesExpandidos, setLotesExpandidos] = useState<string[]>([]);

  const toggleExpandirLote = (repasseId: string) => {
    setLotesExpandidos((prev) =>
      prev.includes(repasseId) ? prev.filter((id) => id !== repasseId) : [...prev, repasseId]
    );
  };

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs max-w-xl mx-auto mt-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mb-3">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Acesso Restrito ao Administrador</h3>
        <p className="mt-1 text-xs text-slate-500">
          A liquidação e geração de lotes de repasse e recibos financeiros é restrita à Administração.
          Usuários não administradores não podem gerenciar repasses financeiros de outros vendedores.
        </p>
      </div>
    );
  }

  // Lançamentos disponíveis para repasse: De acordo com o requisito 5.2,
  // O sistema SÓ permite inclusão em lote de repasse para lançamentos com status = CONFERIDO.
  const isMultiVendedor = vendedorSelecionadoId === 'TODOS';

  const itensConferidos = lancamentos
    .filter((l) => (isMultiVendedor ? true : l.vendedor_id === vendedorSelecionadoId) && l.status === 'CONFERIDO')
    .map((l) => {
      const v = vendas.find((item) => item.id === l.venda_id);
      const vend = usuarios.find((u) => u.id === l.vendedor_id);
      return { lancamento: l, venda: v, vendedor: vend };
    })
    .filter((i): i is { lancamento: LancamentoComissao; venda: Venda; vendedor: Usuario | undefined } => Boolean(i.venda));

  const itensConferidosFiltrados = itensConferidos.filter(({ venda, vendedor }) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      venda.numero_documento.toLowerCase().includes(q) ||
      (venda.codigo_venda || '').toLowerCase().includes(q) ||
      `#${venda.numero_sequencial || ''}`.includes(q) ||
      venda.cliente_nome.toLowerCase().includes(q) ||
      (vendedor?.nome || '').toLowerCase().includes(q) ||
      (venda.procedimentos || '').toLowerCase().includes(q) ||
      formatarDataBR(venda.data_venda).includes(q)
    );
  });

  // Itens atualmente selecionados para este lote
  const itensMarcados = itensConferidos.filter((i) =>
    selecionados.includes(i.lancamento.id)
  );

  const totalVendasLote = itensMarcados.reduce(
    (acc, curr) => acc + (curr.lancamento.is_debito_compensatorio ? 0 : curr.venda.valor_total_venda),
    0
  );

  const totalComissoesBrutas = itensMarcados
    .filter((i) => !i.lancamento.is_debito_compensatorio)
    .reduce((acc, curr) => acc + curr.lancamento.valor_comissao_calculado, 0);

  const totalDeducoesEstorno = itensMarcados
    .filter((i) => i.lancamento.is_debito_compensatorio)
    .reduce((acc, curr) => acc + Math.abs(curr.lancamento.valor_comissao_calculado), 0);

  const totalComissaoLote = totalComissoesBrutas - totalDeducoesEstorno;

  const totalItens = itensConferidosFiltrados.length;
  const isAllSelected = totalItens > 0 && itensConferidosFiltrados.every((i) => selecionados.includes(i.lancamento.id));
  const isSomeSelected = itensConferidosFiltrados.some((i) => selecionados.includes(i.lancamento.id));
  const isIndeterminate = isSomeSelected && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const idsRemover = new Set(itensConferidosFiltrados.map((i) => i.lancamento.id));
      setSelecionados((prev) => prev.filter((id) => !idsRemover.has(id)));
    } else {
      const idsAdicionar = itensConferidosFiltrados.map((i) => i.lancamento.id);
      setSelecionados((prev) => Array.from(new Set([...prev, ...idsAdicionar])));
    }
  };

  const handleMarcarTodos = () => {
    const idsAdicionar = itensConferidosFiltrados.map((i) => i.lancamento.id);
    setSelecionados((prev) => Array.from(new Set([...prev, ...idsAdicionar])));
  };

  const handleDesmarcarTodos = () => {
    setSelecionados([]);
  };

  const handleToggleSelect = (id: string) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleLiquidarLote = () => {
    if (selecionados.length === 0) {
      alert('Selecione pelo menos um lançamento conferido para gerar o repasse.');
      return;
    }

    if (!dataRepasse) {
      alert('Informe a data do repasse.');
      return;
    }

    const res = liquidarRepasseLote({
      vendedor_id: vendedorSelecionadoId,
      lancamentos_ids: selecionados,
      data_repasse: dataRepasse,
      comprovante_transacao: comprovante,
      observacoes: observacoes,
    });

    if (res.sucesso && res.repasse) {
      setFeedback({ tipo: 'sucesso', texto: res.mensagem });
      setSelecionados([]);
      setComprovante(`PIX-${Date.now().toString().slice(-6)}`);
      setObservacoes('');
      if (res.repasses && res.repasses.length > 0) {
        setRecibosGeradosLote(res.repasses);
        setReciboModalRepasse(res.repasses[0]);
      } else {
        setReciboModalRepasse(res.repasse);
      }
      setTimeout(() => setFeedback(null), 6000);
    } else {
      setFeedback({ tipo: 'erro', texto: res.mensagem });
    }
  };

  const vendedorAtual = vendedores.find((v) => v.id === vendedorSelecionadoId);
  const totalConferidosGeral = lancamentos.filter((l) => l.status === 'CONFERIDO').length;

  // Preparar dados para o modal de recibo
  const repasseReciboVendedor = reciboModalRepasse
    ? usuarios.find((u) => u.id === reciboModalRepasse.vendedor_id) || null
    : null;

  const repasseReciboVendas = reciboModalRepasse
    ? lancamentos
        .filter((l) => l.repasse_id === reciboModalRepasse.id)
        .map((l) => {
          const v = vendas.find((venda) => venda.id === l.venda_id);
          return v ? { venda: v, lancamento: l } : null;
        })
        .filter((item): item is { venda: Venda; lancamento: LancamentoComissao } => Boolean(item))
    : [];

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-xs font-semibold border ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
              : 'bg-rose-100 text-rose-900 border-rose-300'
          }`}
        >
          {feedback.tipo === 'sucesso' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-700" />
          )}
          <span>{feedback.texto}</span>
        </div>
      )}

      {/* Explanatory Header */}
      <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white shadow-xs">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Módulo e Relatório de Repasse Comercial (Requisito 5.2)
              </h2>
              <span className="rounded-full bg-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-900">
                Liquidação Financeira & Emissão de Recibo
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600 max-w-3xl leading-relaxed">
              Agrupa lançamentos previamente conferidos pelo vendedor, gera a ordem de quitação,
              vincula comprovante de transação (ex: PIX/TED) e altera o status para{' '}
              <strong className="text-purple-900">LIQUIDADO</strong> via procedimento transacional
              (Stored Procedure <code className="bg-purple-100 px-1 py-0.5 rounded text-[11px]">sp_liquidar_repasse_lote</code>).
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tabs: Novo Lote vs Histórico de Repasses */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setSubAba('novo_lote')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
            subAba === 'novo_lote'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Montar e Liquidar Lote de Repasse</span>
          {itensConferidos.length > 0 && (
            <span className="rounded-full bg-emerald-500 px-1.5 py-0.2 text-[10px] text-white">
              {itensConferidos.length} conferidos
            </span>
          )}
        </button>

        <button
          onClick={() => setSubAba('historico')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
            subAba === 'historico'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Histórico de Repasses & Recibos ({repasses.length})</span>
        </button>
      </div>

      {/* Recibos múltiplos gerados no último lote */}
      {recibosGeradosLote.length > 1 && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
            <Receipt className="h-4 w-4 text-purple-700" />
            <span>{recibosGeradosLote.length} Recibos Individuais Emitidos nesta Liquidação em Lote:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {recibosGeradosLote.map((r) => (
              <button
                key={r.id}
                onClick={() => setReciboModalRepasse(r)}
                className="flex items-center gap-1.5 rounded-lg bg-white border border-purple-300 px-3 py-1.5 text-xs font-bold text-purple-900 hover:bg-purple-100 shadow-2xs transition-colors cursor-pointer"
              >
                <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>{r.vendedor_nome}</span>
                <span className="text-purple-700 font-mono">({formatarMoedaBR(r.valor_total_repassado, true)})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {subAba === 'novo_lote' ? (
        <div className="space-y-6">
          {/* Seller and Payout Batch Configuration Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  1. Vendedor Beneficiário do Repasse:
                </label>
                <select
                  value={vendedorSelecionadoId}
                  onChange={(e) => {
                    setVendedorSelecionadoId(e.target.value);
                    setSelecionados([]);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-purple-500 focus:outline-hidden"
                >
                  <option value="TODOS">
                    Todos os Vendedores ({totalConferidosGeral} conferidos disponíveis)
                  </option>
                  {vendedores.map((v) => {
                    const countConferidos = lancamentos.filter(
                      (l) => l.vendedor_id === v.id && l.status === 'CONFERIDO'
                    ).length;
                    return (
                      <option key={v.id} value={v.id}>
                        {v.nome} ({countConferidos} {countConferidos === 1 ? 'conferido' : 'conferidos'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    2. Data do Pagamento / Liquidação:
                  </label>
                  <span className="text-[11px] font-mono font-medium text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                    {formatarDataBR(dataRepasse)}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={dataRepasse}
                    onChange={(e) => setDataRepasse(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-purple-500 focus:outline-hidden"
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  3. Comprovante de Transação / Código PIX:
                </label>
                <input
                  type="text"
                  placeholder="Ex: PIX-9940192 ou TED-01928"
                  value={comprovante}
                  onChange={(e) => setComprovante(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-purple-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Observações Financeiras (Constam no Recibo):
              </label>
              <input
                type="text"
                placeholder="Ex: Quitação quinzenal referente às vendas auditadas na primeira quinzena."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-2xs focus:border-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Table of Confirmed items available for settlement */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Lançamentos com Aceite Formal do Vendedor (Status = CONFERIDO)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Regra de negócio 5.2: Apenas itens no status CONFERIDO podem ser incluídos no repasse
                </p>
              </div>

              {totalItens > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
                    <input
                      type="checkbox"
                      id="select-all-top"
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="h-3.5 w-3.5 rounded-sm border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <label
                      htmlFor="select-all-top"
                      className="text-xs font-bold text-slate-700 cursor-pointer select-none"
                    >
                      {isAllSelected ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleMarcarTodos}
                    className="rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
                    title="Marcar todos os lançamentos conferidos da lista"
                  >
                    Marcar Todos ({totalItens})
                  </button>

                  <button
                    type="button"
                    disabled={selecionados.length === 0}
                    onClick={handleDesmarcarTodos}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Desmarcar todos os lançamentos atualmente selecionados"
                  >
                    Desmarcar Todos
                  </button>

                  <span className="text-xs font-semibold text-slate-600 ml-1">
                    (<strong className="text-purple-700">{selecionados.length}</strong> de {totalItens} selecionados)
                  </span>
                </div>
              )}
            </div>

            {/* Quick Search filter bar */}
            {itensConferidos.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-2.5">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por cliente, documento, código ou vendedor..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:bg-white focus:outline-hidden"
                  />
                  {busca && (
                    <button
                      type="button"
                      onClick={() => setBusca('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Limpar busca"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {busca && (
                  <span className="text-[11px] text-slate-500">
                    Exibindo {itensConferidosFiltrados.length} de {itensConferidos.length} lançamentos
                  </span>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-white text-[11px] font-bold uppercase text-slate-700">
                  <tr>
                    <th className="px-3 py-3 w-10 text-center">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          id="select-all-table-header"
                          ref={(el) => {
                            if (el) el.indeterminate = isIndeterminate;
                          }}
                          checked={isAllSelected}
                          onChange={handleToggleSelectAll}
                          className="h-4 w-4 rounded-sm border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          title={isAllSelected ? 'Desmarcar todos os lançamentos' : 'Marcar todos os lançamentos'}
                          aria-label="Marcar ou desmarcar todos os lançamentos conferidos"
                        />
                      </div>
                    </th>
                    {isMultiVendedor && <th className="px-4 py-3">Vendedor</th>}
                    <th className="px-4 py-3">Doc / NF</th>
                    <th className="px-4 py-3">Data Venda</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3 text-right">Valor Venda</th>
                    <th className="px-4 py-3 text-right">Entrada Válida</th>
                    <th className="px-4 py-3 text-center">% Entrada</th>
                    <th className="px-4 py-3 text-right">Alíquota / Fixo</th>
                    <th className="px-4 py-3 text-right">Comissão Calculada</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itensConferidosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={isMultiVendedor ? 11 : 10} className="py-8 text-center text-xs text-slate-500">
                        {busca ? (
                          <span>
                            Nenhum lançamento com status <strong className="text-emerald-700">CONFERIDO</strong> encontrado para o termo &quot;{busca}&quot;.
                          </span>
                        ) : (
                          <span>
                            Nenhum lançamento com status <strong className="text-emerald-700">CONFERIDO</strong> encontrado para{' '}
                            {isMultiVendedor ? 'os vendedores' : vendedorAtual?.nome}. Os vendedores devem primeiro conferir os lançamentos aprovados no Relatório de Conferência (5.1).
                          </span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    itensConferidosFiltrados.map(({ lancamento, venda, vendedor }) => {
                      const isChecked = selecionados.includes(lancamento.id);
                      const isDebito = Boolean(lancamento.is_debito_compensatorio);

                      return (
                        <tr
                          key={lancamento.id}
                          className={`hover:bg-purple-50/30 transition-colors ${
                            isDebito
                              ? 'bg-rose-50/30'
                              : isChecked
                              ? 'bg-purple-50/60 font-medium'
                              : ''
                          }`}
                        >
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelect(lancamento.id)}
                              className={`h-4 w-4 rounded-sm text-purple-600 focus:ring-purple-500 cursor-pointer ${
                                isDebito ? 'border-rose-400' : 'border-slate-300'
                              }`}
                              aria-label={`Selecionar lançamento ${venda.numero_documento}`}
                            />
                          </td>
                          {isMultiVendedor && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-800 border border-purple-200">
                                <User className="h-3 w-3 text-purple-600" />
                                {vendedor?.nome || 'Vendedor'}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 font-bold text-slate-900">
                            <div>{venda.numero_documento}</div>
                            {isDebito && (
                              <span className="inline-block mt-0.5 rounded-sm bg-rose-100 px-1.5 py-0.2 text-[10px] font-extrabold text-rose-800 border border-rose-200">
                                COMPENSAÇÃO DE ESTORNO
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                            {formatarDataBR(venda.data_venda)}
                          </td>
                          <td className="px-4 py-3 truncate max-w-[140px] text-slate-800 font-medium">
                            {venda.cliente_nome}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            {isDebito ? (
                              <span className="text-slate-400">-</span>
                            ) : (
                              `R$ ${venda.valor_total_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-700">
                            {isDebito ? (
                              <span className="text-slate-400">-</span>
                            ) : (
                              `R$ ${venda.valor_entrada_valida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            )}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap font-semibold text-slate-800">
                            {isDebito
                              ? '-'
                              : `${lancamento.percentual_entrada_calculado.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}%`}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-slate-800">
                            {isDebito
                              ? 'Dedução'
                              : lancamento.tipo_regra_aplicada === 'VALOR_FIXO'
                              ? formatarMoedaBR(lancamento.aliquota_ou_fixo_aplicado, true)
                              : `${lancamento.aliquota_ou_fixo_aplicado.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}%`}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap font-black">
                            {isDebito ? (
                              <span className="text-rose-600">
                                - R${' '}
                                {Math.abs(lancamento.valor_comissao_calculado).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            ) : (
                              <span className="text-emerald-700">
                                R${' '}
                                {lancamento.valor_comissao_calculado.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isDebito ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800 border border-rose-200">
                                <RotateCcw className="h-3 w-3 text-rose-600" />
                                Débito a Compensar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Conferido
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Batch Totals & Liquidation Action Bar */}
            {itensConferidos.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 text-white">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                      Itens no Lote:
                    </span>
                    <span className="text-sm font-bold">
                      {itensMarcados.length} contrato(s) selecionado(s)
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                      Volume Total Vendido:
                    </span>
                    <span className="text-sm font-bold text-slate-200">
                      R$ {totalVendasLote.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {totalDeducoesEstorno > 0 && (
                    <>
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                          Comissões Brutas:
                        </span>
                        <span className="text-sm font-bold text-slate-200">
                          R$ {totalComissoesBrutas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-rose-400 block font-bold">
                          Dedução de Estornos:
                        </span>
                        <span className="text-sm font-bold text-rose-400">
                          - R$ {totalDeducoesEstorno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  )}

                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-emerald-400 block font-bold">
                      Total Líquido a Pagar:
                    </span>
                    <span className="text-xl font-black text-emerald-400">
                      R$ {totalComissaoLote.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={selecionados.length === 0}
                    onClick={handleLiquidarLote}
                    className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-md hover:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>
                      Liquidar Repasse em Lote ({selecionados.length}{' '}
                      {selecionados.length === 1 ? 'item' : 'itens'})
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History of Generated Repasses */
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Histórico de Repasses Liquidados
              </h3>
              <p className="text-[11px] text-slate-500">
                Ordens financeiras liquidadas com comprovante bancário e recibos emitidos
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-white text-[11px] font-bold uppercase text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Lote #</th>
                    <th className="px-4 py-3">Data Repasse</th>
                    <th className="px-4 py-3">Vendedor</th>
                    <th className="px-4 py-3 text-right">Volume Vendido</th>
                    <th className="px-4 py-3 text-right">Comissão Paga</th>
                    <th className="px-4 py-3">Comprovante</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {repasses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-slate-500">
                        Nenhum lote de repasse liquidado até o momento.
                      </td>
                    </tr>
                  ) : (
                    repasses.map((rep) => {
                      const vend = usuarios.find((u) => u.id === rep.vendedor_id);
                      const lancsDesteRepasse = lancamentos.filter((l) => rep.lancamentos_ids.includes(l.id));
                      const totalVendasLote = lancsDesteRepasse.reduce(
                        (acc, curr) => acc + (curr.is_debito_compensatorio ? 0 : curr.valor_base_calculo),
                        0
                      );
                      const isExpandido = lotesExpandidos.includes(rep.id);

                      return (
                        <React.Fragment key={rep.id}>
                          <tr className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-900">
                              <button
                                type="button"
                                onClick={() => toggleExpandirLote(rep.id)}
                                className="inline-flex items-center gap-1.5 hover:text-purple-700 cursor-pointer font-bold"
                              >
                                {isExpandido ? (
                                  <ChevronUp className="h-4 w-4 text-purple-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-400" />
                                )}
                                <span>#{rep.id}</span>
                              </button>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                              {formatarDataBR(rep.data_repasse)}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {vend?.nome || rep.vendedor_nome || rep.vendedor_id}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-800">
                              R$ {totalVendasLote.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap font-black text-purple-700">
                              R$ {rep.valor_total_repassado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="rounded-sm bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                                {rep.comprovante_transacao || 'Sem comprovante'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200">
                                <CheckCircle2 className="h-3 w-3 text-purple-600" />
                                Liquidado
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setReciboModalRepasse(rep)}
                                  className="flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-800 shadow-2xs transition-colors cursor-pointer"
                                  title="Ver Recibo Detalhado"
                                >
                                  <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                                  <span>Recibo</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleExpandirLote(rep.id)}
                                  className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                  title="Ver e auditar vendas pagas neste lote"
                                >
                                  <span>Vendas ({lancsDesteRepasse.length})</span>
                                  {isExpandido ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded sub-table showing sales of this repasse */}
                          {isExpandido && (
                            <tr className="bg-slate-50/80 border-y border-slate-200">
                              <td colSpan={8} className="p-4">
                                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-purple-600" />
                                      <span className="font-extrabold text-xs text-slate-800">
                                        Vendas e Comissões do Repasse #{rep.id}
                                      </span>
                                      <span className="text-[11px] text-slate-500">
                                        ({lancsDesteRepasse.length} lançamentos)
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-slate-500">
                                      Auditoria financeira: comissões pagas podem ser estornadas com compensação automática
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs text-slate-600">
                                      <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                                        <tr>
                                          <th className="px-3 py-2">Documento / Venda</th>
                                          <th className="px-3 py-2">Data Venda</th>
                                          <th className="px-3 py-2">Cliente</th>
                                          <th className="px-3 py-2 text-right">Valor Venda</th>
                                          <th className="px-3 py-2 text-right">Comissão no Repasse</th>
                                          <th className="px-3 py-2">Situação Atual</th>
                                          <th className="px-3 py-2 text-right">Ação de Auditoria</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {lancsDesteRepasse.map((l) => {
                                          const v = vendas.find((item) => item.id === l.venda_id);
                                          const foiEstornado = l.status === 'ESTORNADO';
                                          const isDebito = Boolean(l.is_debito_compensatorio);

                                          return (
                                            <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                                              <td className="px-3 py-2 font-bold text-slate-900">
                                                <div>{v?.numero_documento || 'Documento'}</div>
                                                {v?.codigo_venda && (
                                                  <span className="text-[10px] font-mono text-slate-500">
                                                    {v.codigo_venda}
                                                  </span>
                                                )}
                                                {isDebito && (
                                                  <span className="block text-[10px] text-rose-700 font-bold">
                                                    DÉBITO COMPENSATÓRIO
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                                                {v?.data_venda ? formatarDataBR(v.data_venda) : '-'}
                                              </td>
                                              <td className="px-3 py-2 truncate max-w-[140px] text-slate-800 font-medium">
                                                {v?.cliente_nome || '-'}
                                              </td>
                                              <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-slate-800">
                                                {isDebito
                                                  ? '-'
                                                  : `R$ ${(v?.valor_total_venda || 0).toLocaleString('pt-BR', {
                                                      minimumFractionDigits: 2,
                                                    })}`}
                                              </td>
                                              <td className="px-3 py-2 text-right whitespace-nowrap font-bold">
                                                {isDebito ? (
                                                  <span className="text-rose-600">
                                                    - R${' '}
                                                    {Math.abs(l.valor_comissao_calculado).toLocaleString('pt-BR', {
                                                      minimumFractionDigits: 2,
                                                    })}
                                                  </span>
                                                ) : (
                                                  <span className="text-slate-900">
                                                    R${' '}
                                                    {l.valor_comissao_calculado.toLocaleString('pt-BR', {
                                                      minimumFractionDigits: 2,
                                                    })}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-3 py-2 whitespace-nowrap">
                                                {foiEstornado ? (
                                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                                                    <RotateCcw className="h-3 w-3 text-rose-600" />
                                                    Comissão Estornada
                                                  </span>
                                                ) : isDebito ? (
                                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                                    Compensação Aplicada
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200">
                                                    <CheckCircle2 className="h-3 w-3 text-purple-600" />
                                                    Paga no Repasse
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-3 py-2 text-right whitespace-nowrap">
                                                {foiEstornado ? (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      v && setEstornoModalItem({ lancamento: l, venda: v, repasse: rep })
                                                    }
                                                    className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                                                  >
                                                    <RotateCcw className="h-3 w-3" />
                                                    <span>Auditoria de Estorno</span>
                                                  </button>
                                                ) : !isDebito ? (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      v && setEstornoModalItem({ lancamento: l, venda: v, repasse: rep })
                                                    }
                                                    className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 hover:text-rose-900 transition-colors shadow-2xs cursor-pointer"
                                                    title="Estornar comissão paga desta venda com compensação contábil"
                                                  >
                                                    <RotateCcw className="h-3 w-3" />
                                                    <span>Estornar Comissão</span>
                                                  </button>
                                                ) : null}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Recibo Detalhado Modal */}
      <ReceiptModal
        isOpen={Boolean(reciboModalRepasse)}
        onClose={() => setReciboModalRepasse(null)}
        repasse={reciboModalRepasse}
        vendedor={repasseReciboVendedor}
        vendasDoRepasse={repasseReciboVendas}
      />

      {/* Modal de Estorno de Comissão (Pré ou Pós-Repasse) */}
      <CommissionEstornoModal
        isOpen={Boolean(estornoModalItem)}
        onClose={() => setEstornoModalItem(null)}
        lancamento={estornoModalItem?.lancamento || null}
        venda={estornoModalItem?.venda || null}
        repasse={estornoModalItem?.repasse || null}
        onSucesso={(msg) => setFeedback({ tipo: 'sucesso', texto: msg })}
      />
    </div>
  );
}
