'use client';

import React, { useState } from 'react';
import { useCommission } from '@/lib/commission-context';
import { FaixaEntradaComissao, RegraComissaoVendedor, TipoComissao } from '@/lib/types';
import { formatarDataBR } from '@/lib/utils';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  History,
  Info,
  Layers,
  Percent,
  Plus,
  Save,
  Sliders,
  Trash2,
  User,
} from 'lucide-react';

export function AdminCommissionRules() {
  const { usuarios, regras, salvarRegra } = useCommission();

  const vendedores = usuarios.filter((u) => u.perfil_nome === 'VENDEDOR');
  const [vendedorSelecionadoId, setVendedorSelecionadoId] = useState(
    vendedores[0]?.id || ''
  );

  // Form states for creating / editing a rule version
  const [tipoComissao, setTipoComissao] = useState<TipoComissao>('ESCALONADO_ENTRADA');
  const [valorFixo, setValorFixo] = useState<number>(50.0);
  const [vigenciaInicio, setVigenciaInicio] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [vigenciaFim, setVigenciaFim] = useState<string>('');
  const [faixas, setFaixas] = useState<Array<{ min: number; max: number | null; comissao: number }>>([
    { min: 30, max: null, comissao: 1.0 },
    { min: 20, max: 29.99, comissao: 0.8 },
    { min: 10, max: 19.99, comissao: 0.5 },
    { min: 0, max: 9.99, comissao: 0.0 },
  ]);

  const [feedback, setFeedback] = useState<string | null>(null);

  // Regras existentes do vendedor
  const regrasDoVendedor = regras.filter((r) => r.vendedor_id === vendedorSelecionadoId);

  const handleCarregarPresetPadrao = () => {
    setFaixas([
      { min: 30, max: null, comissao: 1.0 },
      { min: 20, max: 29.99, comissao: 0.8 },
      { min: 10, max: 19.99, comissao: 0.5 },
      { min: 0, max: 9.99, comissao: 0.0 },
    ]);
  };

  const handleAdicionarFaixa = () => {
    setFaixas((prev) => [...prev, { min: 0, max: null, comissao: 0.5 }]);
  };

  const handleRemoverFaixa = (index: number) => {
    setFaixas((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAtualizarFaixa = (
    index: number,
    campo: 'min' | 'max' | 'comissao',
    valor: number | null
  ) => {
    setFaixas((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [campo]: valor };
      return copy;
    });
  };

  const handleSalvarRegra = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vigenciaInicio) {
      alert('Informe a data de início da vigência.');
      return;
    }

    if (vigenciaFim && vigenciaFim < vigenciaInicio) {
      alert('A data de fim da vigência não pode ser anterior à data de início.');
      return;
    }

    const formatadasFaixas: FaixaEntradaComissao[] = faixas.map((f, i) => ({
      id: Date.now() + i,
      regra_id: '',
      percentual_entrada_min: Number(f.min),
      percentual_entrada_max: f.max !== null && f.max !== undefined && f.max !== ('' as any) ? Number(f.max) : null,
      percentual_comissao: Number(f.comissao),
    }));

    const res = salvarRegra({
      vendedor_id: vendedorSelecionadoId,
      tipo_comissao: tipoComissao,
      valor_fixo: Number(valorFixo) || 0,
      vigencia_inicio: vigenciaInicio,
      vigencia_fim: vigenciaFim.trim() || null,
      faixas: tipoComissao === 'ESCALONADO_ENTRADA' ? formatadasFaixas : [],
    });

    if (res.sucesso) {
      setFeedback(res.mensagem);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const vendedorAtual = vendedores.find((v) => v.id === vendedorSelecionadoId);

  return (
    <div className="space-y-6">
      {/* Informative Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Sliders className="h-5 w-5" />
          </div>
          <div className="text-xs text-blue-900 leading-relaxed">
            <h3 className="font-bold text-sm text-blue-950">
              Parametrização & Versionamento de Regras Contratuais (Requisito 1.1)
            </h3>
            <p className="mt-1">
              Cada vendedor pode possuir modelos de comissão distintos (Escalonado por Entrada ou Fixo).
              O campo <strong className="text-blue-950">Vigência (Início e Fim)</strong> garante a
              imutabilidade histórica: alterações contratuais realizadas hoje{' '}
              <span className="underline font-semibold">não recalculam nem afetam vendas retroativas</span>.
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

      {/* Seller Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
            <User className="h-4 w-4" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-900 block">
              Selecione o Vendedor para Gerenciar as Regras:
            </label>
            <span className="text-[11px] text-slate-500">
              Contratos e parâmetros vigentes no PostgreSQL
            </span>
          </div>
        </div>

        <select
          value={vendedorSelecionadoId}
          onChange={(e) => setVendedorSelecionadoId(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden min-w-[240px]"
        >
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nome} ({v.email})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Form to create new version / rule */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-600" />
              Cadastrar Nova Regra / Versão Contratual
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">
              Vendedor: {vendedorAtual?.nome}
            </span>
          </div>

          <form onSubmit={handleSalvarRegra} className="mt-4 space-y-4">
            {/* Model Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Modelo de Cálculo de Comissão
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs transition-all ${
                    tipoComissao === 'ESCALONADO_ENTRADA'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoComissao"
                    value="ESCALONADO_ENTRADA"
                    checked={tipoComissao === 'ESCALONADO_ENTRADA'}
                    onChange={() => setTipoComissao('ESCALONADO_ENTRADA')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5 text-emerald-700" />
                      Escalonado por Entrada
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                      Proporção de entrada válida (PIX, Dinheiro, Débito, Crédito à Vista). Aplica a
                      alíquota sobre o valor total.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs transition-all ${
                    tipoComissao === 'VALOR_FIXO'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoComissao"
                    value="VALOR_FIXO"
                    checked={tipoComissao === 'VALOR_FIXO'}
                    onChange={() => setTipoComissao('VALOR_FIXO')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5 text-emerald-700" />
                      Valor Fixo por Venda
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                      Valor nominal fixo por contrato realizado (ex: R$ 50,00), independente da entrada.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Vigência Dates */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Início da Vigência Contratual *
                  </label>
                  {vigenciaInicio && (
                    <span className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      {formatarDataBR(vigenciaInicio)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={vigenciaInicio}
                    onChange={(e) => setVigenciaInicio(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Fim da Vigência (opcional)
                  </label>
                  {vigenciaFim && (
                    <span className="text-[11px] font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                      {formatarDataBR(vigenciaFim)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={vigenciaFim}
                    onChange={(e) => setVigenciaFim(e.target.value)}
                    placeholder="Deixe em branco para vigente aberta"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
                <span className="text-[10px] text-slate-400">Em branco = Vigência atual em aberto</span>
              </div>
            </div>

            {/* Model Details: Valor Fixo */}
            {tipoComissao === 'VALOR_FIXO' ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor Nominal Fixo por Contrato/Venda (R$)
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorFixo}
                    onChange={(e) => setValorFixo(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
                  />
                  <span className="pointer-events-none absolute left-3 top-2 text-xs font-bold text-slate-400">
                    R$
                  </span>
                </div>
              </div>
            ) : (
              // Model Details: Escalonado por Entrada
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Faixas Escalonadas de Entrada
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Gatilho: % Entrada = (Entrada Válida ÷ Total Venda) × 100
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCarregarPresetPadrao}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Padrão de Mercado
                    </button>
                    <button
                      type="button"
                      onClick={handleAdicionarFaixa}
                      className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar Faixa
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {faixas.map((faixa, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-lg bg-white p-2.5 border border-slate-200 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-1 min-w-[120px]">
                        <span className="text-slate-500 text-[11px]">Entrada ≥</span>
                        <input
                          type="number"
                          step="0.01"
                          value={faixa.min}
                          onChange={(e) =>
                            handleAtualizarFaixa(index, 'min', Number(e.target.value))
                          }
                          className="w-16 rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-800"
                        />
                        <span className="text-slate-500">%</span>
                      </div>

                      <div className="flex items-center gap-1 min-w-[140px]">
                        <span className="text-slate-500 text-[11px]">até</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Sem teto"
                          value={faixa.max === null ? '' : faixa.max}
                          onChange={(e) =>
                            handleAtualizarFaixa(
                              index,
                              'max',
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-800"
                        />
                        <span className="text-slate-500">%</span>
                      </div>

                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-slate-500 text-[11px] font-semibold">Comissão:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={faixa.comissao}
                          onChange={(e) =>
                            handleAtualizarFaixa(index, 'comissao', Number(e.target.value))
                          }
                          className="w-16 rounded border border-emerald-300 bg-emerald-50/50 px-2 py-1 text-xs font-black text-emerald-800"
                        />
                        <span className="font-bold text-emerald-800">%</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoverFaixa(index)}
                        disabled={faixas.length <= 1}
                        className="rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 ml-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800 border border-amber-200">
                  <span className="font-bold">Regra de Fallback / Resíduo:</span> Caso a venda
                  possua percentual de entrada inferior à menor faixa configurada (ou meio não
                  elegível), o sistema atribuirá comissão de 0,00%.
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Salvar Nova Regra com Vigência</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Historical Versions of Rules for Selected Salesperson */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="h-4 w-4 text-slate-600" />
              Histórico de Vigências Contratuais
            </h3>
            <span className="text-[11px] text-slate-500">
              {regrasDoVendedor.length} versão(ões)
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {regrasDoVendedor.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Nenhuma regra cadastrada para este vendedor.
              </p>
            ) : (
              regrasDoVendedor.map((regra, idx) => {
                const isAberta = !regra.vigencia_fim;

                return (
                  <div
                    key={regra.id}
                    className={`rounded-xl border p-4 text-xs transition-all ${
                      isAberta
                        ? 'border-emerald-300 bg-emerald-50/30'
                        : 'border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">
                          {regra.tipo_comissao === 'VALOR_FIXO'
                            ? 'Valor Fixo'
                            : 'Escalonado por Entrada'}
                        </span>
                        {isAberta && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-bold text-emerald-800">
                            Vigente
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {regra.tipo_comissao === 'VALOR_FIXO'
                          ? `R$ ${regra.valor_fixo.toFixed(2)} / venda`
                          : `${regra.faixas?.length || 0} faixas`}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>Vigência:</span>
                      <strong className="text-slate-800">{formatarDataBR(regra.vigencia_inicio)}</strong>
                      <span>até</span>
                      <strong className="text-slate-800">
                        {regra.vigencia_fim ? formatarDataBR(regra.vigencia_fim) : 'Indeterminada (Ativa)'}
                      </strong>
                    </div>

                    {/* Faixas display */}
                    {regra.tipo_comissao === 'ESCALONADO_ENTRADA' && regra.faixas && (
                      <div className="mt-3 space-y-1 border-t border-slate-200/60 pt-2">
                        {regra.faixas.map((f) => (
                          <div
                            key={f.id}
                            className="flex justify-between text-[11px] text-slate-600"
                          >
                            <span>
                              ≥ {f.percentual_entrada_min}%
                              {f.percentual_entrada_max !== null
                                ? ` e ≤ ${f.percentual_entrada_max}%`
                                : ' (sem teto)'}
                            </span>
                            <span className="font-bold text-emerald-700">
                              {f.percentual_comissao.toFixed(2)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
