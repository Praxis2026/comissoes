'use client';

import React, { useState } from 'react';
import { LancamentoComissao, Venda, Repasse } from '@/lib/types';
import { formatarDataBR, formatarMoedaBR } from '@/lib/utils';
import { useCommission } from '@/lib/commission-context';
import {
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  Receipt,
  Calendar,
  Clock,
  User,
  FileText,
  X,
  ShieldAlert,
  ArrowDownRight,
  Info,
} from 'lucide-react';

interface CommissionEstornoModalProps {
  isOpen: boolean;
  onClose: () => void;
  lancamento: LancamentoComissao | null;
  venda: Venda | null;
  repasse?: Repasse | null;
  onSucesso?: (mensagem: string) => void;
}

export function CommissionEstornoModal({
  isOpen,
  onClose,
  lancamento,
  venda,
  repasse,
  onSucesso,
}: CommissionEstornoModalProps) {
  const { usuarioAtual, estornarComissaoPaga, estornarLancamento } = useCommission();

  const [motivo, setMotivo] = useState('');
  const [formaCompensacao, setFormaCompensacao] = useState<'DESCONTO_PROXIMO_REPASSE' | 'DEVOLUCAO_DIRETA'>(
    'DESCONTO_PROXIMO_REPASSE'
  );
  const [comprovanteDevolucao, setComprovanteDevolucao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!isOpen || !lancamento || !venda) return null;

  const isPago = lancamento.status === 'LIQUIDADO';
  const isJaEstornado = lancamento.status === 'ESTORNADO';

  const handleConfirmar = () => {
    if (!motivo.trim()) {
      setErro('Por favor, informe a justificativa detalhada para o estorno.');
      return;
    }

    if (isPago && formaCompensacao === 'DEVOLUCAO_DIRETA' && !comprovanteDevolucao.trim()) {
      setErro('Para devolução direta, informe o comprovante ou código de depósito/PIX da devolução.');
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      if (isPago) {
        const res = estornarComissaoPaga({
          lancamentoId: lancamento.id,
          motivo: motivo.trim(),
          formaCompensacao,
          comprovanteDevolucao: comprovanteDevolucao.trim() || undefined,
        });

        if (res.sucesso) {
          onSucesso?.(res.mensagem);
          onClose();
        } else {
          setErro(res.mensagem);
        }
      } else {
        const res = estornarLancamento(lancamento.id, motivo.trim());
        if (res.sucesso) {
          onSucesso?.(res.mensagem);
          onClose();
        } else {
          setErro(res.mensagem);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar o estorno.';
      setErro(msg);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div
          className={`px-6 py-4 text-white flex items-center justify-between ${
            isJaEstornado
              ? 'bg-slate-800'
              : isPago
              ? 'bg-gradient-to-r from-rose-600 via-rose-700 to-amber-700'
              : 'bg-gradient-to-r from-amber-600 to-rose-600'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs">
              <RotateCcw className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                {isJaEstornado
                  ? 'Auditoria de Comissão Estornada'
                  : isPago
                  ? 'Estorno de Comissão Paga (Pós-Repasse)'
                  : 'Estorno de Comissão (Pré-Repasse)'}
              </h3>
              <p className="text-xs text-white/80">
                {isJaEstornado
                  ? 'Registro histórico e comprovação contábil do estorno'
                  : isPago
                  ? 'Cancelamento de comissão liquidada com compensação financeira'
                  : 'Cancelamento e estorno da comissão antes do repasse financeiro'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar text-slate-700 text-xs">
          {/* Alerta de Contexto */}
          {isPago && !isJaEstornado && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 flex items-start gap-3 text-rose-900">
              <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-rose-950 block text-[13px] mb-0.5">
                  Atenção: A comissão desta venda já foi liquidada e paga ao vendedor!
                </span>
                <p className="text-[11px] leading-relaxed text-rose-800">
                  O valor de{' '}
                  <strong className="font-extrabold">
                    R$ {lancamento.valor_comissao_calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>{' '}
                  já foi repassado através do Lote de Repasse{' '}
                  <span className="font-mono font-bold text-rose-950">
                    #{lancamento.repasse_id || repasse?.id || 'LIQUIDADO'}
                  </span>
                  . Ao confirmar o estorno, o sistema registrará a auditoria e compensará contabilmente o saldo.
                </p>
              </div>
            </div>
          )}

          {/* Dados da Venda e Vendedor */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-md">
                  {venda.codigo_venda || `#${String(venda.numero_sequencial || '').padStart(4, '0')}`}
                </span>
                <span className="font-bold text-slate-900 text-sm">{venda.numero_documento}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Venda em {formatarDataBR(venda.data_venda)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cliente</span>
                <span className="font-semibold text-slate-900 truncate block">{venda.cliente_nome}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Vendedor</span>
                <span className="font-semibold text-slate-900 truncate block">
                  {venda.vendedor_nome || lancamento.vendedor_nome || 'Vendedor'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor da Venda</span>
                <span className="font-bold text-slate-900">
                  R$ {venda.valor_total_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Entrada Válida</span>
                <span className="font-semibold text-slate-800">
                  R$ {venda.valor_entrada_valida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (
                  {venda.tipo_pagamento_entrada})
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Alíquota Aplicada</span>
                <span className="font-semibold text-slate-800">
                  {lancamento.tipo_regra_aplicada === 'VALOR_FIXO'
                    ? `${formatarMoedaBR(lancamento.aliquota_ou_fixo_aplicado, true)} (Fixo)`
                    : `${lancamento.aliquota_ou_fixo_aplicado.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}%`}
                </span>
              </div>

              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                  Comissão {isPago ? 'Paga' : 'Calculada'}
                </span>
                <span className="text-sm font-black text-emerald-700">
                  R$ {lancamento.valor_comissao_calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {venda.procedimentos && (
              <div className="text-[11px] text-slate-600 bg-white border border-slate-200/80 rounded-lg p-2">
                <strong className="text-slate-800">Procedimentos:</strong> {venda.procedimentos}
              </div>
            )}
          </div>

          {/* Se já foi estornado, exibe os dados da auditoria */}
          {isJaEstornado ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-xs border-b border-amber-200/80 pb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Auditoria do Estorno Registrado</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Estornado Por</span>
                  <span className="font-semibold text-slate-900">
                    {lancamento.historico_estorno?.por || 'Administrador'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Data e Hora</span>
                  <span className="font-semibold text-slate-900">
                    {lancamento.historico_estorno?.data
                      ? new Date(lancamento.historico_estorno.data).toLocaleString('pt-BR')
                      : 'Auditado'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Tipo do Estorno</span>
                  <span className="font-semibold text-slate-900">
                    {lancamento.historico_estorno?.tipo_estorno === 'POS_LIQUIDACAO'
                      ? 'Estorno Pós-Pagamento (Comissão Paga)'
                      : 'Estorno Pré-Repasse'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Forma de Compensação</span>
                  <span className="font-semibold text-slate-900">
                    {lancamento.historico_estorno?.forma_compensacao === 'DEVOLUCAO_DIRETA'
                      ? 'Devolução Direta (PIX/Caixa)'
                      : 'Desconto no Próximo Repasse'}
                  </span>
                </div>

                {lancamento.historico_estorno?.repasse_original_id && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Lote de Origem Pago</span>
                    <span className="font-mono font-bold text-slate-900">
                      #{lancamento.historico_estorno.repasse_original_id}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Situação Contábil</span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      lancamento.historico_estorno?.compensado ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {lancamento.historico_estorno?.compensado ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Compensado / Quitado</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        <span>Aguardando dedução no próximo repasse</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 border border-amber-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Motivo Informado:
                </span>
                <p className="text-slate-800 whitespace-pre-wrap font-medium">
                  {lancamento.historico_estorno?.motivo || lancamento.justificativa_rejeicao || 'Não especificado'}
                </p>
              </div>

              {lancamento.historico_estorno?.comprovante_devolucao && (
                <div className="bg-white rounded-lg p-2.5 border border-amber-200/80 text-[11px]">
                  <strong className="text-slate-800">Comprovante de Devolução:</strong>{' '}
                  <span className="font-mono text-slate-900">
                    {lancamento.historico_estorno.comprovante_devolucao}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Formulário de Execução de Estorno */
            <div className="space-y-4">
              {/* Opções de Compensação Financeira (quando já pago) */}
              {isPago && (
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-900 block">
                    Forma de Compensação Financeira do Estorno:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      className={`relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                        formaCompensacao === 'DESCONTO_PROXIMO_REPASSE'
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="forma_compensacao"
                          value="DESCONTO_PROXIMO_REPASSE"
                          checked={formaCompensacao === 'DESCONTO_PROXIMO_REPASSE'}
                          onChange={() => setFormaCompensacao('DESCONTO_PROXIMO_REPASSE')}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-extrabold text-slate-900 text-xs">
                          Descontar no Próximo Repasse
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 pl-6">
                        Gera um débito compensatório de{' '}
                        <strong className="text-rose-700">
                          - {formatarMoedaBR(lancamento.valor_comissao_calculado, true)}
                        </strong>{' '}
                        que será abatido automaticamente no fechamento do próximo lote deste vendedor.
                      </p>
                    </label>

                    <label
                      className={`relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                        formaCompensacao === 'DEVOLUCAO_DIRETA'
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="forma_compensacao"
                          value="DEVOLUCAO_DIRETA"
                          checked={formaCompensacao === 'DEVOLUCAO_DIRETA'}
                          onChange={() => setFormaCompensacao('DEVOLUCAO_DIRETA')}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-extrabold text-slate-900 text-xs">
                          Devolução Direta (PIX / Caixa)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 pl-6">
                        O vendedor já transferiu ou devolveu em espécie o valor da comissão. Quita o débito
                        imediatamente mediante comprovante.
                      </p>
                    </label>
                  </div>

                  {formaCompensacao === 'DEVOLUCAO_DIRETA' && (
                    <div className="mt-2 animate-in fade-in duration-200">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Comprovante de Devolução (Código PIX, TED ou Recibo de Caixa): *
                      </label>
                      <input
                        type="text"
                        value={comprovanteDevolucao}
                        onChange={(e) => setComprovanteDevolucao(e.target.value)}
                        placeholder="Ex: DEV-PIX-883921 ou Recibo Caixa #401"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Justificativa Obrigatória */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Motivo / Justificativa do Estorno: <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Cancelamento formal do contrato pelo cliente antes da execução do procedimento / Devolução total dos valores recebidos no caixa / Glosa contratual."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 shadow-2xs focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  O motivo ficará permanentemente registrado na auditoria e visível para o Administrador e Vendedor.
                </span>
              </div>

              {/* Mensagem de Erro */}
              {erro && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {isJaEstornado ? 'Fechar' : 'Cancelar'}
          </button>

          {!isJaEstornado && (
            <button
              type="button"
              disabled={salvando}
              onClick={handleConfirmar}
              className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-black text-white shadow-md transition-all active:scale-[0.98] cursor-pointer ${
                isPago
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              <span>
                {salvando
                  ? 'Processando Estorno...'
                  : isPago
                  ? 'Confirmar Estorno da Comissão Paga'
                  : 'Confirmar Estorno'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
