'use client';

import React, { useState } from 'react';
import { useCommission } from '@/lib/commission-context';
import {
  FULL_DATABASE_SCHEMA_SQL,
  STORED_PROCEDURE_CALCULO_COMISSAO_SQL,
  STORED_PROCEDURES_WORKFLOW_SQL,
  MIGRATIONS_CATALOGO,
} from '@/lib/sql-scripts';
import { calcularComissao } from '@/lib/commission-engine';
import { MEIOS_ENTRADA_VALIDOS, TipoPagamentoEntrada } from '@/lib/types';
import {
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Database,
  FileCode,
  FolderTree,
  HelpCircle,
  Play,
  RotateCcw,
  Server,
  ShieldAlert,
  Terminal,
} from 'lucide-react';

export function SqlStoredProcedureViewer() {
  const { usuarios, regras } = useCommission();
  const [abaSql, setAbaSql] = useState<'calculo' | 'workflow' | 'ddl' | 'migrations' | 'perguntas'>('migrations');
  const [copiado, setCopiado] = useState(false);
  const [versaoMigrationSelecionada, setVersaoMigrationSelecionada] = useState<string>('001');

  // States for interactive simulator
  const [simVendedorId, setSimVendedorId] = useState(usuarios[0]?.id || 'vend-001');
  const [simValorTotal, setSimValorTotal] = useState<number>(45000);
  const [simValorEntrada, setSimValorEntrada] = useState<number>(13500); // 30%
  const [simMeioEntrada, setSimMeioEntrada] = useState<TipoPagamentoEntrada>('PIX');
  const [simDataVenda, setSimDataVenda] = useState(new Date().toISOString().split('T')[0]);
  const [simResultado, setSimResultado] = useState<any>(null);

  const handleCopiarSql = (texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleExecutarSimulacao = () => {
    // Buscar regra vigente para a data e vendedor
    const regra = regras.find((r) => {
      if (r.vendedor_id !== simVendedorId) return false;
      if (r.vigencia_inicio > simDataVenda) return false;
      if (r.vigencia_fim && r.vigencia_fim < simDataVenda) return false;
      return true;
    });

    if (!regra) {
      setSimResultado({
        erro: 'RAISE EXCEPTION: Nenhuma regra de comissionamento vigente encontrada no PostgreSQL para o vendedor e data especificados.',
      });
      return;
    }

    const res = calcularComissao(
      {
        valor_total_venda: simValorTotal,
        valor_entrada_valida: simValorEntrada,
        tipo_pagamento_entrada: simMeioEntrada,
        data_venda: simDataVenda,
      },
      regra
    );

    setSimResultado({
      sucesso: true,
      trace: {
        procedimento: 'sp_calcular_comissao_venda(p_venda_id UUID)',
        v_vendedor_id: simVendedorId,
        v_valor_total_venda: `R$ ${simValorTotal.toFixed(2)}`,
        v_tipo_pagamento_entrada: simMeioEntrada,
        v_entrada_bruta_informada: `R$ ${simValorEntrada.toFixed(2)}`,
        v_entrada_valida_considerada: `R$ ${res.entrada_valida.toFixed(2)} (${
          MEIOS_ENTRADA_VALIDOS.includes(simMeioEntrada)
            ? 'Meio válido: mantido integralmente'
            : 'Meio não aceito: zerado'
        })`,
        v_percentual_entrada_calculado: `${res.percentual_entrada.toFixed(2)}%`,
        v_regra_encontrada: `${regra.id} (${regra.tipo_comissao})`,
        v_aliquota_ou_fixo:
          res.tipo_comissao === 'VALOR_FIXO'
            ? `R$ ${res.aliquota_ou_fixo.toFixed(2)}`
            : `${res.aliquota_ou_fixo.toFixed(2)}%`,
        v_valor_comissao: `R$ ${res.valor_comissao.toFixed(2)}`,
        v_novo_status: 'RASCUNHO ou PENDENTE_APROVACAO',
        v_auditoria_detalhe: res.mensagem,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-bold">
              <Terminal className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">
                  Documentação Técnica: Stored Procedures em PL/pgSQL
                </h2>
                <span className="rounded-xs bg-emerald-400/20 px-2 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-400/30">
                  PostgreSQL 15+
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Implementação autoritativa no banco de dados para cálculo de faixas, controle de RBAC,
                versionamento de vigências e liquidação em lote
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const fullScript = `-- SCRIPT COMPLETO DE BANCO DE DADOS POSTGRESQL\n-- SISTEMA DE COMISSIONAMENTO COMERCIAL\n\n${FULL_DATABASE_SCHEMA_SQL}\n\n${STORED_PROCEDURE_CALCULO_COMISSAO_SQL}\n\n${STORED_PROCEDURES_WORKFLOW_SQL}`;
              handleCopiarSql(fullScript);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-xs"
          >
            {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copiado ? 'SQL Copiado!' : 'Copiar DDL + Procedures Completos'}</span>
          </button>
        </div>
      </div>

      {/* Simulator Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Simulador Interativo da Stored Procedure `sp_calcular_comissao_venda`
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Executa a lógica exata da rotina PL/pgSQL em tempo real
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Vendedor</label>
            <select
              value={simVendedorId}
              onChange={(e) => setSimVendedorId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800"
            >
              {usuarios
                .filter((u) => u.perfil_nome === 'VENDEDOR')
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Valor Venda (R$)</label>
            <input
              type="number"
              value={simValorTotal}
              onChange={(e) => setSimValorTotal(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Meio Entrada</label>
            <select
              value={simMeioEntrada}
              onChange={(e) => setSimMeioEntrada(e.target.value as TipoPagamentoEntrada)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="PIX">PIX (Válido)</option>
              <option value="DINHEIRO">Dinheiro (Válido)</option>
              <option value="DEBITO">Débito (Válido)</option>
              <option value="CREDITO_AVISTA">Crédito à Vista (Válido)</option>
              <option value="BOLETO">Boleto (Inválido p/ entrada)</option>
              <option value="CREDITO_PARCELADO">Crédito Parcelado</option>
              <option value="SEM_ENTRADA">Sem Entrada</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Entrada Bruta (R$)</label>
            <input
              type="number"
              value={simValorEntrada}
              onChange={(e) => setSimValorEntrada(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-900"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleExecutarSimulacao}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-2xs"
            >
              <Play className="h-3.5 w-3.5 text-emerald-400" />
              <span>Executar PL/pgSQL</span>
            </button>
          </div>
        </div>

        {/* Trace Output */}
        {simResultado && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-400 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
              <span>[SIMULATED PL/pgSQL SERVER OUTPUT & AUDIT LOG]</span>
              <span className="text-emerald-400">STATUS: EXECUTED SUCCESS</span>
            </div>

            {simResultado.erro ? (
              <p className="mt-3 text-rose-400 font-bold">{simResultado.erro}</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 text-[11px]">
                {Object.entries(simResultado.trace).map(([key, val]) => (
                  <div key={key} className="flex flex-col border-b border-slate-900 pb-1">
                    <span className="text-slate-500 font-bold">{key}:</span>
                    <span className="text-emerald-300 font-semibold">{String(val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs for SQL code browsing */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setAbaSql('migrations')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                abaSql === 'migrations'
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Server className="h-3.5 w-3.5 text-emerald-300" />
              1. Migrations PostgreSQL (Implantação Local)
            </button>

            <button
              onClick={() => setAbaSql('calculo')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                abaSql === 'calculo'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Code2 className="h-3.5 w-3.5 text-emerald-400" />
              2. sp_calcular_comissao_venda
            </button>

            <button
              onClick={() => setAbaSql('workflow')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                abaSql === 'workflow'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileCode className="h-3.5 w-3.5 text-blue-400" />
              3. Workflow Procedures
            </button>

            <button
              onClick={() => setAbaSql('ddl')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                abaSql === 'ddl'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Database className="h-3.5 w-3.5 text-purple-400" />
              4. DDL & Modelo
            </button>

            <button
              onClick={() => setAbaSql('perguntas')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                abaSql === 'perguntas'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
              5. Diretrizes & Estornos
            </button>
          </div>

          <button
            onClick={() => {
              if (abaSql === 'migrations') {
                const mig = MIGRATIONS_CATALOGO.find(m => m.version === versaoMigrationSelecionada);
                handleCopiarSql(mig?.conteudoSql || '');
              } else {
                const textToCopy =
                  abaSql === 'calculo'
                    ? STORED_PROCEDURE_CALCULO_COMISSAO_SQL
                    : abaSql === 'workflow'
                    ? STORED_PROCEDURES_WORKFLOW_SQL
                    : FULL_DATABASE_SCHEMA_SQL;
                handleCopiarSql(textToCopy);
              }
            }}
            className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-950"
          >
            {copiado ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiado ? 'Copiado!' : 'Copiar Seção'}</span>
          </button>
        </div>

        {/* Code Display or QA or Migrations */}
        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-200 overflow-x-auto max-h-[600px] leading-relaxed">
          {abaSql === 'migrations' && (
            <div className="font-sans space-y-5 text-slate-200">
              {/* Quick CLI Commands banner */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/40 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-emerald-400" />
                      Comandos Rápidos para Implantação no PostgreSQL Local
                    </h4>
                    <p className="text-xs text-emerald-200/80 mt-0.5">
                      O banco <code className="text-white bg-emerald-900/60 px-1 py-0.5 rounded">comissoes_db</code> será criado e migrado automaticamente.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopiarSql('npm run migrate')}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      npm run migrate
                    </button>
                    <button
                      onClick={() => handleCopiarSql('docker compose up -d')}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 border border-slate-700"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      docker compose up -d
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
                    <span className="font-bold text-emerald-400 block mb-1">1. Node.js Runner</span>
                    <code className="text-slate-300 block font-mono text-[11px]">npm run migrate</code>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Cria o banco se não existir e aplica as 5 migrations em ordem transacional.
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
                    <span className="font-bold text-emerald-400 block mb-1">2. Docker Compose</span>
                    <code className="text-slate-300 block font-mono text-[11px]">docker compose up -d</code>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Sobe Postgres 16 na porta 5432 já com as migrations executadas no boot.
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
                    <span className="font-bold text-emerald-400 block mb-1">3. Script Nativo PSQL</span>
                    <code className="text-slate-300 block font-mono text-[11px]">psql -f database/deploy_full_database.sql</code>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Script único consolidado (All-In-One) para execução direta em DBA / CLI.
                    </p>
                  </div>
                </div>
              </div>

              {/* Migration file tabs */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FolderTree className="h-3.5 w-3.5 text-emerald-400" />
                  Arquivos de Migração Criados em `/database/migrations/`:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {MIGRATIONS_CATALOGO.map((mig) => (
                    <button
                      key={mig.version}
                      onClick={() => setVersaoMigrationSelecionada(mig.version)}
                      className={`text-left p-2.5 rounded-lg border transition-all ${
                        versaoMigrationSelecionada === mig.version
                          ? 'bg-slate-800 border-emerald-500 shadow-xs'
                          : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-400">v{mig.version}</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <div className="text-[11px] font-bold text-slate-200 mt-1 line-clamp-1">
                        {mig.titulo}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {mig.arquivo}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview of selected migration SQL */}
              {(() => {
                const migAtual = MIGRATIONS_CATALOGO.find(m => m.version === versaoMigrationSelecionada);
                return (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                      <div>
                        <span className="font-mono text-xs text-emerald-400 font-bold mr-2">
                          [{migAtual?.arquivo}]
                        </span>
                        <span className="text-xs text-slate-300 font-medium">
                          {migAtual?.titulo}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">{migAtual?.descricao}</p>
                      </div>
                      <button
                        onClick={() => handleCopiarSql(migAtual?.conteudoSql || '')}
                        className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white border border-slate-700"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar SQL
                      </button>
                    </div>
                    <pre className="font-mono text-xs text-emerald-300/90 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                      {migAtual?.conteudoSql}
                    </pre>
                  </div>
                );
              })()}
            </div>
          )}

          {abaSql === 'calculo' && (
            <pre className="whitespace-pre-wrap">{STORED_PROCEDURE_CALCULO_COMISSAO_SQL}</pre>
          )}

          {abaSql === 'workflow' && (
            <pre className="whitespace-pre-wrap">{STORED_PROCEDURES_WORKFLOW_SQL}</pre>
          )}

          {abaSql === 'ddl' && (
            <pre className="whitespace-pre-wrap">{FULL_DATABASE_SCHEMA_SQL}</pre>
          )}

          {abaSql === 'perguntas' && (
            <div className="font-sans space-y-4 text-xs text-slate-200">
              <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
                <h4 className="font-bold text-emerald-400 text-sm mb-1">
                  1. Regra de Fallback para Meios Não Elegíveis (Boleto / Parcelado / Sem Entrada)
                </h4>
                <p className="text-slate-300">
                  Na Stored Procedure <code className="text-emerald-300">sp_calcular_comissao_venda</code>,
                  caso o meio de pagamento da entrada não pertença a <code>{`('PIX', 'DINHEIRO', 'DEBITO', 'CREDITO_AVISTA')`}</code>,
                  a variável <code>v_entrada_valida</code> é forçada a 0.00. Com isso, o percentual de entrada torna-se 0.00% e
                  a venda cai na faixa residual (comissão de 0.00%). Caso o vendedor possua modelo <strong>VALOR FIXO</strong>,
                  o valor nominal é aplicado normalmente, conforme especificado no requisito 1.1.
                </p>
              </div>

              <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
                <h4 className="font-bold text-emerald-400 text-sm mb-1">
                  2. Entrada Manual de Vendas vs Importação de ERP/PDV
                </h4>
                <p className="text-slate-300">
                  O sistema implementa ambos os fluxos:
                  <br />• <strong>Entrada Manual / Pré-Lançamento:</strong> Tela com validação de entrada, cálculo em tempo real e criação em status RASCUNHO com trava de edição após submissão.
                  <br />• <strong>Importação em Lote ERP/PDV:</strong> Módulo de importação (aba &quot;Importação ERP/PDV&quot;) para ingestão de lotes de notas fiscais com execução em massa da Stored Procedure.
                </p>
              </div>

              <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
                <h4 className="font-bold text-emerald-400 text-sm mb-1">
                  3. Estornos e Cancelamentos Pós-Aprovação e Pós-Liquidação
                </h4>
                <p className="text-slate-300">
                  A procedure <code className="text-emerald-300">sp_estornar_comissao</code> suporta dois cenários:
                  <br />• <strong>Venda Aprovada ou Conferida (antes do repasse):</strong> O lançamento é transicionado para <code>ESTORNADO</code>, zerando a obrigação financeira de repasse.
                  <br />• <strong>Venda já Liquidada / Paga:</strong> O sistema mantém o registro original com status <code>ESTORNADO</code> e registra uma linha de débito/estorno para compensação no próximo ciclo de pagamento.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
