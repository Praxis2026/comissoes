'use client';

import React, { useState } from 'react';
import { useCommission } from '@/lib/commission-context';
import { TipoPagamentoEntrada } from '@/lib/types';
import { formatarDataBR } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Play,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react';

export function ImportSalesModal() {
  const { usuarios, usuarioAtual, criarOuEditarVenda } = useCommission();
  const isAdmin = usuarioAtual.perfil_nome === 'ADMINISTRADOR';
  const vendedores = usuarios.filter((u) => u.perfil_nome === 'VENDEDOR');

  const [feedback, setFeedback] = useState<string | null>(null);
  const [loteImportacao, setLoteImportacao] = useState([
    {
      doc: 'PROT-2026-8001',
      cliente: 'Farmácia Santa Clara Ltda',
      procedimentos: 'Protocolo de Harmonização Orofacial e Bioestimulador',
      vendedorIndex: 0,
      valorTotal: 50000,
      valorEntrada: 16000, // 32% (>= 30% -> 1.0%)
      meio: 'PIX' as TipoPagamentoEntrada,
      data: new Date().toISOString().split('T')[0],
    },
    {
      doc: 'PROT-2026-8002',
      cliente: 'Supermercado Progresso S/A',
      procedimentos: 'Consulta Especializada e Avaliação Clínica Integral',
      vendedorIndex: 0,
      valorTotal: 40000,
      valorEntrada: 10000, // 25% (>= 20% e < 30% -> 0.8%)
      meio: 'DEBITO' as TipoPagamentoEntrada,
      data: new Date().toISOString().split('T')[0],
    },
    {
      doc: 'PROT-2026-8003',
      cliente: 'Auto Peças Modelo',
      procedimentos: 'Implante Dentário 2 Elementos com Enxerto Ósseo',
      vendedorIndex: 1, // Vendedor Roberto com valor fixo
      valorTotal: 15000,
      valorEntrada: 3000,
      meio: 'DINHEIRO' as TipoPagamentoEntrada,
      data: new Date().toISOString().split('T')[0],
    },
    {
      doc: 'PROT-2026-8004',
      cliente: 'Hospital Central Matriz',
      procedimentos: 'Cirurgia Eletiva e Acompanhamento Ambulatorial',
      vendedorIndex: 0,
      valorTotal: 80000,
      valorEntrada: 20000,
      meio: 'BOLETO' as TipoPagamentoEntrada, // Boleto -> não pontua entrada válida -> 0%
      data: new Date().toISOString().split('T')[0],
    },
  ]);

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs max-w-xl mx-auto mt-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mb-3">
          <Database className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Acesso Restrito ao Administrador</h3>
        <p className="mt-1 text-xs text-slate-500">
          A importação e sincronização de vendas em lote de múltiplos vendedores via ERP é restrita ao perfil Administrador.
        </p>
      </div>
    );
  }

  const handleProcessarLote = (submeterAprovacao: boolean) => {
    let sucessos = 0;

    loteImportacao.forEach((item) => {
      const vend = vendedores[item.vendedorIndex] || vendedores[0];
      const res = criarOuEditarVenda(
        {
          vendedor_id: vend.id,
          numero_documento: item.doc,
          cliente_nome: item.cliente,
          procedimentos: item.procedimentos,
          data_venda: item.data,
          valor_total_venda: item.valorTotal,
          valor_entrada_valida: item.valorEntrada,
          tipo_pagamento_entrada: item.meio,
        },
        submeterAprovacao
      );

      if (res.sucesso) sucessos++;
    });

    setFeedback(
      `Lote processado com sucesso! ${sucessos} vendas foram inseridas no banco de dados com cálculo automático de comissão via Stored Procedure.`
    );
    setTimeout(() => setFeedback(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Módulo de Integração em Lote com ERP / PDV
            </h2>
            <p className="mt-1 text-xs text-slate-600 max-w-3xl leading-relaxed">
              Permite a ingestão de notas fiscais emitidas no faturamento de sistemas externos (ex: SAP, TOTVS, Bling, Senior).
              A rotina dispara a Stored Procedure <code className="bg-emerald-100 px-1 py-0.5 rounded text-[11px] font-mono">sp_calcular_comissao_venda</code> para
              cada registro de venda, gerando os lançamentos de comissão imediatamente.
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-100 p-3 text-xs font-semibold text-emerald-900 border border-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Test Batch Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Lote de Simulação do Faturamento ERP
            </h3>
            <span className="text-[11px] text-slate-500">
              Exemplo de payload com diferentes meios de pagamento e faixas
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleProcessarLote(false)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              Importar como Rascunhos
            </button>
            <button
              onClick={() => handleProcessarLote(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Importar e Submeter para Aprovação</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-white text-[11px] font-bold uppercase text-slate-700">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Protocolo / Doc</th>
                <th className="px-4 py-3">Cliente / Procedimentos</th>
                <th className="px-4 py-3">Vendedor Alocado</th>
                <th className="px-4 py-3 text-right">Valor Venda</th>
                <th className="px-4 py-3">Meio Entrada</th>
                <th className="px-4 py-3 text-right">Valor Entrada</th>
                <th className="px-4 py-3 text-center">% Entrada Esperada</th>
                <th className="px-4 py-3">Comportamento Esperado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loteImportacao.map((item, index) => {
                const vend = vendedores[item.vendedorIndex] || vendedores[0];
                const pct = (item.valorEntrada / item.valorTotal) * 100;

                return (
                  <tr key={index} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-medium text-slate-700 whitespace-nowrap">
                      {formatarDataBR(item.data)}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.doc}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <span className="block">{item.cliente}</span>
                      {item.procedimentos && (
                        <span className="block text-[10px] text-emerald-700 font-normal">
                          {item.procedimentos}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{vend?.nome}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                        {item.meio}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      R$ {item.valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-700">
                      {pct.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600">
                      {item.meio === 'BOLETO'
                        ? 'Meio inválido: entrada considerada R$ 0 -> 0.00% de comissão'
                        : item.vendedorIndex === 1
                        ? 'Modelo Valor Fixo -> R$ 50,00 independente da entrada'
                        : pct >= 30
                        ? 'Faixa Top (≥30%) -> 1,0% sobre valor total'
                        : 'Faixa Intermediária (≥20% e <30%) -> 0,8% sobre total'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
