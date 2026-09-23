'use client';

import React, { useState } from 'react';
import { useCommission } from '@/lib/commission-context';
import { LancamentoComissao, Repasse, Venda } from '@/lib/types';
import { formatarDataBR } from '@/lib/utils';
import { ReceiptModal } from '@/components/ReceiptModal';
import {
  AlertCircle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  FileText,
  History,
  Layers,
  Printer,
  Receipt,
  Search,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react';

export function AdminRepasseBatch() {
  const {
    usuarios,
    vendas,
    lancamentos,
    repasses,
    liquidarRepasseLote,
  } = useCommission();

  const vendedores = usuarios.filter((u) => u.perfil_nome === 'VENDEDOR');

  // Active view: 'novo_lote' or 'historico'
  const [subAba, setSubAba] = useState<'novo_lote' | 'historico'>('novo_lote');

  // New payout batch state
  const [vendedorSelecionadoId, setVendedorSelecionadoId] = useState(
    vendedores[0]?.id || ''
  );
  const [dataRepasse, setDataRepasse] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [comprovante, setComprovante] = useState('PIX-994012');
  const [observacoes, setObservacoes] = useState('');
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(
    null
  );

  // Receipt Modal state
  const [reciboModalRepasse, setReciboModalRepasse] = useState<Repasse | null>(null);

  // Lançamentos disponíveis para repasse: De acordo com o requisito 5.2,
  // O sistema SÓ permite inclusão em lote de repasse para lançamentos com status = CONFERIDO.
  const itensConferidosDoVendedor = lancamentos
    .filter((l) => l.vendedor_id === vendedorSelecionadoId && l.status === 'CONFERIDO')
    .map((l) => {
      const v = vendas.find((item) => item.id === l.venda_id);
      return { lancamento: l, venda: v };
    })
    .filter((i): i is { lancamento: LancamentoComissao; venda: Venda } => Boolean(i.venda));

  // Itens atualmente selecionados para este lote
  const itensMarcados = itensConferidosDoVendedor.filter((i) =>
    selecionados.includes(i.lancamento.id)
  );

  const totalVendasLote = itensMarcados.reduce(
    (acc, curr) => acc + curr.venda.valor_total_venda,
    0
  );
  const totalComissaoLote = itensMarcados.reduce(
    (acc, curr) => acc + curr.lancamento.valor_comissao_calculado,
    0
  );

  const handleToggleSelectAll = () => {
    if (selecionados.length === itensConferidosDoVendedor.length) {
      setSelecionados([]);
    } else {
      setSelecionados(itensConferidosDoVendedor.map((i) => i.lancamento.id));
    }
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
      // Abrir recibo automaticamente
      setReciboModalRepasse(res.repasse);
      setTimeout(() => setFeedback(null), 5000);
    } else {
      setFeedback({ tipo: 'erro', texto: res.mensagem });
    }
  };

  const vendedorAtual = vendedores.find((v) => v.id === vendedorSelecionadoId);

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
          <span>Montar e Liquidar Novo Lote</span>
          {itensConferidosDoVendedor.length > 0 && (
            <span className="rounded-full bg-emerald-500 px-1.5 py-0.2 text-[10px] text-white">
              {itensConferidosDoVendedor.length} conferidos
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
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome} ({v.email})
                    </option>
                  ))}
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

              {itensConferidosDoVendedor.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleSelectAll}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 underline"
                  >
                    {selecionados.length === itensConferidosDoVendedor.length
                      ? 'Desmarcar Todos'
                      : 'Selecionar Todos'}
                  </button>
                  <span className="text-xs font-semibold text-slate-500">
                    ({selecionados.length} de {itensConferidosDoVendedor.length} selecionados)
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-white text-[11px] font-bold uppercase text-slate-700">
                  <tr>
                    <th className="px-3 py-3 w-8 text-center">
                      <span className="sr-only">Seleção</span>
                    </th>
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
                  {itensConferidosDoVendedor.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-xs text-slate-500">
                        Nenhum lançamento com status <strong className="text-emerald-700">CONFERIDO</strong>{' '}
                        encontrado para {vendedorAtual?.nome}. Os vendedores devem primeiro conferir os
                        lançamentos aprovados no Relatório de Conferência (5.1).
                      </td>
                    </tr>
                  ) : (
                    itensConferidosDoVendedor.map(({ lancamento, venda }) => {
                      const isChecked = selecionados.includes(lancamento.id);

                      return (
                        <tr
                          key={lancamento.id}
                          className={`hover:bg-purple-50/30 transition-colors ${
                            isChecked ? 'bg-purple-50/60' : ''
                          }`}
                        >
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelect(lancamento.id)}
                              className="rounded-sm border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {venda.numero_documento}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                            {formatarDataBR(venda.data_venda)}
                          </td>
                          <td className="px-4 py-3 truncate max-w-[140px] text-slate-800 font-medium">
                            {venda.cliente_nome}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            R$ {venda.valor_total_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-700">
                            R$ {venda.valor_entrada_valida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap font-semibold text-slate-800">
                            {lancamento.percentual_entrada_calculado.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-slate-800">
                            {lancamento.tipo_regra_aplicada === 'VALOR_FIXO'
                              ? `R$ ${lancamento.aliquota_ou_fixo_aplicado.toFixed(2)}`
                              : `${lancamento.aliquota_ou_fixo_aplicado.toFixed(2)}%`}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap font-black text-emerald-700">
                            R$ {lancamento.valor_comissao_calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Conferido
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Batch Totals & Liquidation Action Bar */}
            {itensConferidosDoVendedor.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 text-white">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                      Vendas no Lote:
                    </span>
                    <span className="text-sm font-bold">
                      {itensMarcados.length} contrato(s)
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

                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-emerald-400 block font-bold">
                      Total a Pagar ao Vendedor:
                    </span>
                    <span className="text-xl font-black text-emerald-400">
                      R$ {totalComissaoLote.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <button
                  disabled={selecionados.length === 0}
                  onClick={handleLiquidarLote}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-md hover:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none transition-all"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Liquidar Repasse e Emitir Recibo ({selecionados.length})</span>
                </button>
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
                      const totalVendasLote = lancsDesteRepasse.reduce((acc, curr) => acc + curr.valor_base_calculo, 0);

                      return (
                        <tr key={rep.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900">#{rep.id}</td>
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
                            <button
                              onClick={() => setReciboModalRepasse(rep)}
                              className="flex items-center gap-1 mx-auto rounded-md bg-slate-900 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-800 shadow-2xs transition-colors"
                            >
                              <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                              <span>Ver Recibo Detalhado</span>
                            </button>
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
      )}

      {/* Recibo Detalhado Modal */}
      <ReceiptModal
        isOpen={Boolean(reciboModalRepasse)}
        onClose={() => setReciboModalRepasse(null)}
        repasse={reciboModalRepasse}
        vendedor={repasseReciboVendedor}
        vendasDoRepasse={repasseReciboVendas}
      />
    </div>
  );
}
