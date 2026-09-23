'use client';

import React from 'react';
import { LancamentoComissao, Repasse, Usuario, Venda } from '@/lib/types';
import { formatarDataBR } from '@/lib/utils';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileCheck,
  FileText,
  Printer,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  repasse: Repasse | null;
  vendedor: Usuario | null;
  vendasDoRepasse: Array<{
    venda: Venda;
    lancamento: LancamentoComissao;
  }>;
}

export function ReceiptModal({
  isOpen,
  onClose,
  repasse,
  vendedor,
  vendasDoRepasse,
}: ReceiptModalProps) {
  if (!isOpen || !repasse) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl border border-slate-200 print:max-h-none print:shadow-none print:border-none print:p-0">
        {/* Top Action Bar (hidden on print) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Recibo Detalhado de Liquidação de Repasse #{repasse.id}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Formal Document */}
        <div className="mt-4 p-4 sm:p-6 bg-white border border-slate-200 rounded-lg text-slate-800">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-slate-900" />
                <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                  Recibo de Repasse de Comissão Comercial
                </h1>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Comprovante oficial de conferência, apuração e quitação de honorários de comissão
              </p>
            </div>
            <div className="text-right">
              <span className="block text-xs font-bold uppercase text-slate-500">
                Lote de Repasse
              </span>
              <span className="text-base font-black text-slate-900">#{repasse.id}</span>
              <span className="block text-[11px] text-slate-500">
                Data do Repasse: {formatarDataBR(repasse.data_repasse)}
              </span>
            </div>
          </div>

          {/* Beneficiary & Payer Info */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-lg bg-slate-50 p-4 border border-slate-200 text-xs">
            <div>
              <span className="font-bold text-slate-500 uppercase text-[10px] block">
                Vendedor / Beneficiário:
              </span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{vendedor?.nome}</p>
              <p className="text-slate-600">E-mail: {vendedor?.email}</p>
              <p className="text-slate-600">
                ID do Vendedor: <span className="font-mono">{repasse.vendedor_id}</span>
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase text-[10px] block">
                Dados da Transação Financeira:
              </span>
              <p className="font-bold text-slate-900 text-xs mt-0.5">
                Comprovante: {repasse.comprovante_transacao || 'Não informado'}
              </p>
              <p className="text-slate-600">
                Status: <span className="font-bold text-emerald-700">LIQUIDADO / PAGO</span>
              </p>
              <p className="text-slate-600">
                Lançamentos Quitados: {vendasDoRepasse.length} contrato(s)
              </p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Demonstrativo Analítico de Vendas Quitadas
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Nº Venda / Doc</th>
                    <th className="px-3 py-2">Data Venda</th>
                    <th className="px-3 py-2">Cliente / Procedimentos</th>
                    <th className="px-3 py-2 text-right">Valor Venda</th>
                    <th className="px-3 py-2 text-right">Entrada Válida</th>
                    <th className="px-3 py-2 text-center">% Entrada</th>
                    <th className="px-3 py-2 text-right">Alíquota/Fixo</th>
                    <th className="px-3 py-2 text-right">Comissão Líquida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendasDoRepasse.map(({ venda, lancamento }) => (
                    <tr key={lancamento.id} className="text-slate-700">
                      <td className="px-3 py-2 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-800 border border-slate-300">
                            {venda.codigo_venda || `#${String(venda.numero_sequencial || '').padStart(4, '0')}`}
                          </span>
                          <span>{venda.numero_documento}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{formatarDataBR(venda.data_venda)}</td>
                      <td className="px-3 py-2 max-w-[160px]">
                        <span className="font-semibold text-slate-900 block truncate">{venda.cliente_nome}</span>
                        {venda.procedimentos && (
                          <span className="text-[10px] text-slate-500 block truncate" title={venda.procedimentos}>
                            {venda.procedimentos}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        R$ {venda.valor_total_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        R$ {venda.valor_entrada_valida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        {lancamento.percentual_entrada_calculado.toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {lancamento.tipo_regra_aplicada === 'VALOR_FIXO'
                          ? `R$ ${lancamento.aliquota_ou_fixo_aplicado.toFixed(2)}`
                          : `${lancamento.aliquota_ou_fixo_aplicado.toFixed(2)}%`}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                        R$ {lancamento.valor_comissao_calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grand Totals Box */}
          <div className="mt-4 flex flex-wrap items-center justify-between rounded-lg bg-emerald-50 p-4 border border-emerald-200">
            <div>
              <span className="text-xs font-semibold text-emerald-800 block">
                Total de Volume Vendido no Lote:
              </span>
              <span className="text-sm font-bold text-slate-800">
                R$ {vendasDoRepasse
                  .reduce((acc, curr) => acc + curr.venda.valor_total_venda, 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 block">
                Total Líquido do Repasse Pago:
              </span>
              <span className="text-2xl font-black text-emerald-700">
                R$ {repasse.valor_total_repassado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Observações */}
          {repasse.observacoes && (
            <div className="mt-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-800">Observações Financeiras: </span>
              {repasse.observacoes}
            </div>
          )}

          {/* Legal Settlement Term */}
          <div className="mt-6 text-[11px] text-slate-500 leading-relaxed text-justify border-t border-slate-200 pt-4">
            Pelo presente instrumento, o beneficiário acima qualificado reconhece ter conferido
            e recebido integralmente a importância líquida especificada neste recibo, referente
            às comissões sobre as vendas discriminadas, conferidas nos termos das regras contratuais
            vigentes na data de realização de cada contrato, dando plena, geral e irrevogável quitação.
          </div>

          {/* Signatures */}
          <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t border-slate-900 pt-2">
              <p className="font-bold text-slate-900">{vendedor?.nome}</p>
              <p className="text-[11px] text-slate-500">Vendedor / Beneficiário</p>
            </div>
            <div className="border-t border-slate-900 pt-2">
              <p className="font-bold text-slate-900">Departamento Financeiro</p>
              <p className="text-[11px] text-slate-500">Administrador Responsável</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
