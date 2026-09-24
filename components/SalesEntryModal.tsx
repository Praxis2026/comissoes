'use client';

import React, { useState } from 'react';
import { useCommission } from '@/lib/commission-context';
import {
  MEIOS_ENTRADA_VALIDOS,
  TipoPagamentoEntrada,
  Venda,
} from '@/lib/types';
import { calcularComissao } from '@/lib/commission-engine';
import { formatarDataBR, formatarMoedaBR } from '@/lib/utils';
import { CurrencyInput } from '@/components/CurrencyInput';
import {
  AlertCircle,
  AlertTriangle,
  Building,
  Calculator,
  Calendar,
  CheckCircle2,
  FileText,
  Hash,
  Info,
  Send,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';

interface SalesEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendaParaEdicao?: Venda | null;
}

interface FormInnerProps {
  onClose: () => void;
  vendaParaEdicao?: Venda | null;
}

function SalesEntryForm({ onClose, vendaParaEdicao }: FormInnerProps) {
  const {
    usuarios,
    usuarioAtual,
    lancamentos,
    obterRegraVigente,
    criarOuEditarVenda,
    excluirRascunho,
    obterProximoNumeroSequencial,
    formatarCodigoVenda,
    parametros,
  } = useCommission();

  const isAdmin = usuarioAtual.perfil_nome === 'ADMINISTRADOR';

  const lancamentoEdicao = vendaParaEdicao
    ? lancamentos.find((l) => l.venda_id === vendaParaEdicao.id)
    : null;
  const isRascunhoOuRejeitado =
    Boolean(vendaParaEdicao) &&
    (!lancamentoEdicao ||
      lancamentoEdicao.status === 'RASCUNHO' ||
      lancamentoEdicao.status === 'REJEITADO');

  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  // Cálculo do número sequencial automático da venda
  const numeroSequencial = vendaParaEdicao?.numero_sequencial || obterProximoNumeroSequencial();
  const codigoVenda =
    vendaParaEdicao?.codigo_venda || formatarCodigoVenda(numeroSequencial);

  // Form states initialized without useEffect setState
  const [vendedorId, setVendedorId] = useState(() => {
    if (vendaParaEdicao) return vendaParaEdicao.vendedor_id;
    if (isAdmin) {
      return usuarios.find((u) => u.perfil_nome === 'VENDEDOR')?.id || usuarioAtual.id;
    }
    return usuarioAtual.id;
  });

  const [numeroDocumento, setNumeroDocumento] = useState(
    () => vendaParaEdicao?.numero_documento || 'PROT-1052'
  );
  const [clienteNome, setClienteNome] = useState(
    () => vendaParaEdicao?.cliente_nome || ''
  );
  const [procedimentos, setProcedimentos] = useState(
    () => vendaParaEdicao?.procedimentos || ''
  );
  const [dataVenda, setDataVenda] = useState(
    () => vendaParaEdicao?.data_venda || new Date().toISOString().split('T')[0]
  );
  const [valorTotalVenda, setValorTotalVenda] = useState<number | ''>(
    () => vendaParaEdicao?.valor_total_venda ?? 25000
  );
  const [tipoPagamentoEntrada, setTipoPagamentoEntrada] = useState<TipoPagamentoEntrada>(
    () => vendaParaEdicao?.tipo_pagamento_entrada || 'PIX'
  );
  const [valorEntradaValida, setValorEntradaValida] = useState<number | ''>(
    () => vendaParaEdicao?.valor_entrada_valida ?? 7500
  );
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Calculo em tempo real para pré-visualização
  const regraVigente = obterRegraVigente(vendedorId, dataVenda);
  const valorTotalNum = Number(valorTotalVenda) || 0;
  const valorEntradaNum = Number(valorEntradaValida) || 0;

  const resultadoPrevia = regraVigente
    ? calcularComissao(
        {
          valor_total_venda: valorTotalNum,
          valor_entrada_valida: valorEntradaNum,
          tipo_pagamento_entrada: tipoPagamentoEntrada,
          data_venda: dataVenda,
        },
        regraVigente,
        parametros.meios_pagamento_entrada_validos,
        parametros.percentual_comissao_padrao_residual
      )
    : null;

  const isMeioValido = parametros.meios_pagamento_entrada_validos.includes(tipoPagamentoEntrada);

  const handleSubmit = (submeterParaAprovacao: boolean) => {
    setMensagemErro(null);

    if (!numeroDocumento.trim()) {
      setMensagemErro('Informe o Número Protocolo / Documento Fiscal.');
      return;
    }
    if (!dataVenda) {
      setMensagemErro('Informe a Data da Venda.');
      return;
    }
    if (valorTotalNum <= 0) {
      setMensagemErro('O valor total da venda deve ser maior que zero.');
      return;
    }
    if (valorEntradaNum < 0) {
      setMensagemErro('O valor de entrada não pode ser negativo.');
      return;
    }
    if (valorEntradaNum > valorTotalNum) {
      setMensagemErro('O valor de entrada não pode ser maior que o valor total da venda.');
      return;
    }

    const res = criarOuEditarVenda(
      {
        id: vendaParaEdicao?.id,
        numero_sequencial: numeroSequencial,
        codigo_venda: codigoVenda,
        vendedor_id: isAdmin ? vendedorId : usuarioAtual.id,
        numero_documento: numeroDocumento,
        cliente_nome: clienteNome,
        procedimentos: procedimentos.trim() || undefined,
        data_venda: dataVenda,
        valor_total_venda: valorTotalNum,
        valor_entrada_valida: valorEntradaNum,
        tipo_pagamento_entrada: tipoPagamentoEntrada,
      },
      submeterParaAprovacao
    );

    if (res.sucesso) {
      onClose();
    } else {
      setMensagemErro(res.mensagem);
    }
  };

  return (
    <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {vendaParaEdicao ? 'Editar Pré-Lançamento de Venda' : 'Nova Venda'}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-800 border border-emerald-300 shadow-2xs">
                <Hash className="h-3 w-3 text-emerald-700" />
                {codigoVenda}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Lançamento comercial com cálculo instantâneo da proporção de entrada e comissão
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Banner de Identificação Sequencial Automática */}
      <div className="mt-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 p-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Hash className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  Número Sequencial da Venda:
                </span>
                <span className="font-mono text-xs font-extrabold text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-300 shadow-2xs">
                  {codigoVenda}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                  <Sparkles className="h-2.5 w-2.5 text-emerald-700" />
                  Gerado Automaticamente
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {vendaParaEdicao
                  ? `Identificador sequencial único e definitivo atribuído a este registro (#${numeroSequencial}).`
                  : `Identificador sequencial contínuo #${numeroSequencial} reservado automaticamente pelo sistema.`}
              </p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Sequência
            </span>
            <span className="font-mono text-xs font-bold text-slate-700">
              #{String(numeroSequencial).padStart(4, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Error message */}
      {mensagemErro && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{mensagemErro}</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(false);
        }}
        className="mt-4 space-y-4"
      >
        {/* Row 1: Vendedor e Data */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vendedor Responsável
            </label>
            {isAdmin ? (
              <select
                value={vendedorId}
                onChange={(e) => setVendedorId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
              >
                {usuarios
                  .filter((u) => u.perfil_nome === 'VENDEDOR')
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome}
                    </option>
                  ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800">
                <Building className="h-3.5 w-3.5 text-slate-500" />
                <span>{usuarios.find((u) => u.id === vendedorId)?.nome || usuarioAtual.nome}</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Data da Venda
              </label>
              <span className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                {formatarDataBR(dataVenda)}
              </span>
            </div>
            <div className="relative">
              <input
                type="date"
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
              />
              <Calendar className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Row 2: Número Sequencial (Automático) e Documento Fiscal */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nº Sequencial da Venda (Automático)
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={`${codigoVenda} (Registro #${numeroSequencial})`}
                readOnly
                disabled
                className="w-full rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs font-mono font-bold text-emerald-900 shadow-2xs cursor-not-allowed select-none"
              />
              <span className="absolute right-2.5 rounded bg-emerald-200/90 px-1.5 py-0.5 text-[9px] font-bold text-emerald-900 uppercase tracking-wider">
                Automático
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Número Protocolo / Documento Fiscal
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: PROT-2026/8901 ou NF-10928"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
              />
              <FileText className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Row 3: Nome do Cliente */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nome do Cliente / Razão Social
          </label>
          <input
            type="text"
            placeholder="Ex: Auto Posto Estrela Ltda ou Paciente"
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
          />
        </div>

        {/* Row 3: Procedimentos Realizados */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                Detalhamento dos Procedimentos
              </span>
            </label>
            <span className="text-[10px] text-slate-400">Atalhos rápidos abaixo:</span>
          </div>
          <textarea
            rows={2}
            placeholder="Descreva os procedimentos realizados (ex: Harmonização Orofacial, Consulta Especializada, Implante Dentário 2 elementos...)"
            value={procedimentos}
            onChange={(e) => setProcedimentos(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden resize-none"
          />
          {/* Quick Procedure Chips */}
          {parametros.procedimentos_catalogo && parametros.procedimentos_catalogo.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <span className="text-[10px] font-semibold text-slate-400">Catálogo:</span>
              {parametros.procedimentos_catalogo.slice(0, 5).map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (!procedimentos) {
                      setProcedimentos(p);
                    } else if (!procedimentos.includes(p)) {
                      setProcedimentos(`${procedimentos}, ${p}`);
                    }
                  }}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition-colors"
                >
                  + {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Row 3: Valores e Meios de Pagamento */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Valor Total da Venda (R$)
            </label>
            <CurrencyInput
              placeholder="0,00"
              value={valorTotalVenda}
              onChange={(val) => setValorTotalVenda(val)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Meio de Pagamento da Entrada
            </label>
            <select
              value={tipoPagamentoEntrada}
              onChange={(e) => setTipoPagamentoEntrada(e.target.value as TipoPagamentoEntrada)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
            >
              {parametros.meios_pagamento_catalogo && parametros.meios_pagamento_catalogo.length > 0 ? (
                <>
                  <optgroup label="Meios Aceitos como Entrada Válida">
                    {parametros.meios_pagamento_catalogo
                      .filter((m) => m.ativo && m.is_entrada_valida)
                      .map((m) => (
                        <option key={m.id} value={m.codigo}>
                          {m.label} (Válido)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Outros Meios (Desconsiderados p/ cálculo)">
                    {parametros.meios_pagamento_catalogo
                      .filter((m) => m.ativo && !m.is_entrada_valida)
                      .map((m) => (
                        <option key={m.id} value={m.codigo}>
                          {m.label} (Desconsiderado)
                        </option>
                      ))}
                  </optgroup>
                </>
              ) : (
                <>
                  <optgroup label="Meios Válidos para Comissão Escalonada">
                    <option value="PIX">PIX (Válido)</option>
                    <option value="DINHEIRO">Dinheiro em Espécie (Válido)</option>
                    <option value="DEBITO">Cartão de Débito (Válido)</option>
                    <option value="CREDITO_AVISTA">Cartão de Crédito à Vista (Válido)</option>
                  </optgroup>
                  <optgroup label="Outros Meios (Não pontuam entrada válida)">
                    <option value="BOLETO">Boleto Bancário (Não pontua)</option>
                    <option value="CREDITO_PARCELADO">Crédito Parcelado (Não pontua)</option>
                    <option value="SEM_ENTRADA">Venda Sem Entrada</option>
                  </optgroup>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Valor da Entrada Recebida (R$)
            </label>
            <CurrencyInput
              placeholder="0,00"
              disabled={tipoPagamentoEntrada === 'SEM_ENTRADA'}
              value={tipoPagamentoEntrada === 'SEM_ENTRADA' ? 0 : valorEntradaValida}
              onChange={(val) => setValorEntradaValida(val)}
            />
          </div>
        </div>

        {/* Business Rule Validation Box & Instant Live Simulation */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Info className="h-4 w-4 text-emerald-600" />
              Auditoria do Cálculo em Tempo Real (PL/pgSQL)
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                isMeioValido
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}
            >
              {isMeioValido ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Meio de Entrada Aceito
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 text-amber-600" />
                  Meio Não Elegível como Entrada Válida
                </>
              )}
            </span>
          </div>

          {/* Calculations Breakdown */}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            <div className="rounded-lg bg-white p-2.5 border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Entrada Considerada:</span>
              <span className="text-sm font-bold text-slate-900">
                {resultadoPrevia ? formatarMoedaBR(resultadoPrevia.entrada_valida, true) : 'R$ 0,00'}
              </span>
              {!isMeioValido && (
                <span className="text-[10px] text-amber-700 block">
                  (0,00 devido ao meio {tipoPagamentoEntrada})
                </span>
              )}
            </div>

            <div className="rounded-lg bg-white p-2.5 border border-slate-200">
              <span className="text-slate-500 block text-[11px]">% Proporção Entrada:</span>
              <span className="text-sm font-bold text-slate-900">
                {resultadoPrevia
                  ? resultadoPrevia.percentual_entrada.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : '0,00'}
                %
              </span>
              <span className="text-[10px] text-slate-400 block">
                (Entrada ÷ Total × 100)
              </span>
            </div>

            <div className="rounded-lg bg-white p-2.5 border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Alíquota / Fixo:</span>
              <span className="text-sm font-bold text-emerald-700">
                {resultadoPrevia?.tipo_comissao === 'VALOR_FIXO'
                  ? formatarMoedaBR(resultadoPrevia.aliquota_ou_fixo, true)
                  : `${(resultadoPrevia?.aliquota_ou_fixo || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}%`}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                {regraVigente ? regraVigente.tipo_comissao : 'Sem regra'}
              </span>
            </div>

            <div className="rounded-lg bg-emerald-50/80 p-2.5 border border-emerald-200">
              <span className="text-emerald-800 block text-[11px] font-semibold">
                Comissão Calculada:
              </span>
              <span className="text-base font-extrabold text-emerald-700">
                {resultadoPrevia ? formatarMoedaBR(resultadoPrevia.valor_comissao, true) : 'R$ 0,00'}
              </span>
              <span className="text-[10px] text-emerald-600 block">Status: Rascunho</span>
            </div>
          </div>

          {/* Rule Detail */}
          <div className="mt-3 text-[11px] text-slate-600 bg-white/70 p-2 rounded-md border border-slate-200/60">
            <span className="font-semibold text-slate-700">Regra Vigente Aplicada: </span>
            {resultadoPrevia?.mensagem ||
              'Nenhuma regra encontrada para este vendedor na data selecionada.'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div>
            {isRascunhoOuRejeitado && vendaParaEdicao && (
              <button
                type="button"
                onClick={() => setConfirmarExclusao(true)}
                className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-900 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Excluir Rascunho</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Salvar como Rascunho
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Salvar e Submeter para Aprovação</span>
            </button>
          </div>
        </div>

        {/* Modal de Confirmação de Exclusão de Rascunho dentro do formulário */}
        {confirmarExclusao && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Confirmar Exclusão de Rascunho
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Esta ação removerá este contrato permanentemente.
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <p>
                  Tem certeza de que deseja excluir permanentemente o rascunho da venda{' '}
                  <strong className="text-slate-900">
                    {codigoVenda} ({numeroDocumento})
                  </strong>{' '}
                  do cliente <strong className="text-slate-900">{clienteNome || 'Não informado'}</strong>?
                </p>
                <div className="rounded-lg bg-rose-50 p-3 text-[11px] text-rose-900 border border-rose-200 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>
                    Todos os cálculos prévios de comissão e dados informados serão descartados e não poderão ser recuperados.
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setConfirmarExclusao(false)}
                  className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (vendaParaEdicao) {
                      const res = excluirRascunho(vendaParaEdicao.id);
                      if (res.sucesso) {
                        onClose();
                      } else {
                        setMensagemErro(res.mensagem);
                        setConfirmarExclusao(false);
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Sim, Excluir Rascunho</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export function SalesEntryModal({ isOpen, onClose, vendaParaEdicao }: SalesEntryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <SalesEntryForm
        key={vendaParaEdicao ? vendaParaEdicao.id : 'nova-venda'}
        onClose={onClose}
        vendaParaEdicao={vendaParaEdicao}
      />
    </div>
  );
}
