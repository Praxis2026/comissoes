'use client';

import React, { useState } from 'react';
import { useCommission } from '@/lib/commission-context';
import { LancamentoComissao, Venda } from '@/lib/types';
import { formatarDataBR, formatarMoedaBR } from '@/lib/utils';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Search,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';

export function AdminApprovals() {
  const {
    usuarios,
    usuarioAtual,
    vendas,
    lancamentos,
    aprovarLancamento,
    rejeitarLancamento,
    estornarLancamento,
  } = useCommission();

  const isAdmin = usuarioAtual.perfil_nome === 'ADMINISTRADOR';

  const [vendedorFiltro, setVendedorFiltro] = useState<string>('TODOS');
  const [busca, setBusca] = useState('');
  const [modalRejeicao, setModalRejeicao] = useState<{
    lancamentoId: string;
    doc: string;
    vendedorNome: string;
  } | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [modalEstorno, setModalEstorno] = useState<{
    lancamentoId: string;
    doc: string;
  } | null>(null);
  const [motivoEstorno, setMotivoEstorno] = useState('');
  const [toast, setToast] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs max-w-xl mx-auto mt-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mb-3">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Acesso Restrito ao Administrador</h3>
        <p className="mt-1 text-xs text-slate-500">
          O módulo de Aprovações & Auditoria é de uso exclusivo da Administração.
          Usuários não administradores não possuem permissão para auditar ou visualizar comissões de outros profissionais.
        </p>
      </div>
    );
  }

  // Pendentes de aprovação
  const pendentes = lancamentos
    .filter((l) => l.status === 'PENDENTE_APROVACAO')
    .map((l) => {
      const venda = vendas.find((v) => v.id === l.venda_id);
      return { lancamento: l, venda };
    })
    .filter(({ lancamento, venda }) => {
      if (!venda) return false;
      if (vendedorFiltro !== 'TODOS' && lancamento.vendedor_id !== vendedorFiltro) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase();
        return (
          venda.numero_documento.toLowerCase().includes(q) ||
          (venda.codigo_venda || '').toLowerCase().includes(q) ||
          `#${venda.numero_sequencial || ''}`.includes(q) ||
          formatarDataBR(venda.data_venda).toLowerCase().includes(q) ||
          venda.data_venda.toLowerCase().includes(q) ||
          venda.cliente_nome.toLowerCase().includes(q) ||
          (venda.vendedor_nome || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

  const handleAprovar = (lancamentoId: string) => {
    const res = aprovarLancamento(lancamentoId);
    if (res.sucesso) {
      setToast({ tipo: 'sucesso', texto: res.mensagem });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleConfirmarRejeicao = () => {
    if (!modalRejeicao) return;
    if (!justificativa.trim()) {
      alert('Informe a justificativa da rejeição.');
      return;
    }

    const res = rejeitarLancamento(modalRejeicao.lancamentoId, justificativa);
    if (res.sucesso) {
      setToast({ tipo: 'sucesso', texto: res.mensagem });
      setModalRejeicao(null);
      setJustificativa('');
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleConfirmarEstorno = () => {
    if (!modalEstorno) return;
    if (!motivoEstorno.trim()) {
      alert('Informe o motivo do estorno.');
      return;
    }

    const res = estornarLancamento(modalEstorno.lancamentoId, motivoEstorno);
    if (res.sucesso) {
      setToast({ tipo: 'sucesso', texto: res.mensagem });
      setModalEstorno(null);
      setMotivoEstorno('');
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-xs font-semibold border ${
            toast.tipo === 'sucesso'
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
              : 'bg-rose-100 text-rose-900 border-rose-300'
          }`}
        >
          {toast.tipo === 'sucesso' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-700" />
          )}
          <span>{toast.texto}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Fila de Aprovação de Comissões
            </h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
              {pendentes.length} aguardando auditoria
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Validação técnica dos lançamentos antes da liberação para conferência do vendedor
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={vendedorFiltro}
            onChange={(e) => setVendedorFiltro(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
          >
            <option value="TODOS">Todos os Vendedores</option>
            {usuarios
              .filter((u) => u.perfil_nome === 'VENDEDOR')
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
          </select>

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por Doc, Cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-48 sm:w-60 rounded-lg border border-slate-300 pl-7 pr-3 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
            />
            <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Pending Items List */}
      {pendentes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-2xs">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h3 className="mt-3 text-sm font-bold text-slate-800">
            Nenhuma comissão pendente de aprovação!
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Todos os lançamentos submetidos pelos vendedores foram auditados e processados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pendentes.map(({ lancamento, venda }) => {
            if (!venda) return null;

            return (
              <div
                key={lancamento.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-mono font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                        {venda.codigo_venda || `#${String(venda.numero_sequencial || '').padStart(4, '0')}`}
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {venda.numero_documento}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-700">
                        {venda.cliente_nome}
                      </span>
                      <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Pendente de Aprovação
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <User className="h-3 w-3 text-slate-400" />
                        Vendedor: {venda.vendedor_nome}
                      </span>
                      <span>•</span>
                      <span>Data da Venda: {formatarDataBR(venda.data_venda)}</span>
                    </div>
                    {venda.procedimentos && (
                      <div className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                        <span className="font-semibold text-slate-900">Procedimentos: </span>
                        <span>{venda.procedimentos}</span>
                      </div>
                    )}
                  </div>

                  {/* Commission Highlight Box */}
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-right">
                    <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                      Comissão a Liberar:
                    </span>
                    <span className="text-base font-black text-emerald-700">
                      R$ {lancamento.valor_comissao_calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Audit Grid Details */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200/80">
                    <span className="text-slate-500 block text-[11px]">Valor da Venda</span>
                    <span className="font-bold text-slate-900">
                      R$ {venda.valor_total_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200/80">
                    <span className="text-slate-500 block text-[11px]">Meio Entrada</span>
                    <span className="font-semibold text-slate-800">
                      {venda.tipo_pagamento_entrada}
                    </span>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200/80">
                    <span className="text-slate-500 block text-[11px]">Entrada Válida</span>
                    <span className="font-bold text-slate-900">
                      R$ {venda.valor_entrada_valida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200/80">
                    <span className="text-slate-500 block text-[11px]">% Proporção Entrada</span>
                    <span className="font-bold text-emerald-700">
                      {lancamento.percentual_entrada_calculado.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}%
                    </span>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200/80">
                    <span className="text-slate-500 block text-[11px]">Alíquota / Modelo</span>
                    <span className="font-bold text-slate-900">
                      {lancamento.tipo_regra_aplicada === 'VALOR_FIXO'
                        ? `${formatarMoedaBR(lancamento.aliquota_ou_fixo_aplicado, true)} (Fixo)`
                        : `${lancamento.aliquota_ou_fixo_aplicado.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}% (Escalonado)`}
                    </span>
                  </div>
                </div>

                {/* Audit Actions */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 italic">
                    Ao aprovar, o lançamento é travado contra edições do vendedor e liberado para conferência.
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setModalRejeicao({
                          lancamentoId: lancamento.id,
                          doc: venda.numero_documento,
                          vendedorNome: venda.vendedor_nome || 'Vendedor',
                        })
                      }
                      className="flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Rejeitar (com justificativa)</span>
                    </button>

                    <button
                      onClick={() => handleAprovar(lancamento.id)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Validar e Aprovar Comissão</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Rejeição Obrigatória com Justificativa */}
      {modalRejeicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <AlertCircle className="h-5 w-5" />
                <span>Rejeitar Lançamento: {modalRejeicao.doc}</span>
              </div>
              <button
                onClick={() => setModalRejeicao(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <p className="text-xs text-slate-600 mb-2">
                O lançamento retornará para o vendedor{' '}
                <strong className="text-slate-900">{modalRejeicao.vendedorNome}</strong> com status{' '}
                <strong className="text-rose-700">REJEITADO</strong>. Informe detalhadamente o
                motivo da recusa para que ele realize as correções necessárias:
              </p>

              <textarea
                rows={4}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Exemplo: O valor de entrada informado diverge do comprovante bancário anexado. Favor corrigir o valor da entrada para R$ 1.500,00 e submeter novamente."
                className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setModalRejeicao(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRejeicao}
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-xs"
              >
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
